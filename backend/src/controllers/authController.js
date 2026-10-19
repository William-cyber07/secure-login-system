import { hashPassword, verifyPassword } from '../utils/hash.js';
import {
  findByUsername,
  findByEmail,
  findById,
  countUsers,
  createUser,
  updateLastLogin,
  incrementFailedAttempts,
  resetFailedAttempts,
  lockUser,
} from '../models/userModel.js';

import { audit } from '../utils/audit.js';

import {
  signPre2faToken,
  signSessionToken,
  setSessionCookie,
  clearSessionCookie,
  verifyToken,
} from '../utils/jwt.js';


const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 * First user in the system becomes 'administrator'. Everyone else defaults to 'inputer'.
 */
export async function register(req, res) {
  try {
    let { username, email, password } = req.body || {};

    // --- Validate input ---
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    username = String(username).trim();
    email = String(email).trim().toLowerCase();

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({
        error: 'Username must be 3–30 chars, letters/digits/underscore only',
      });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (password.length < PASSWORD_MIN) {
      return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN} chars` });
    }

    // --- Uniqueness checks ---
    if (await findByUsername(username)) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    if (await findByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // --- Decide role (first user = administrator) ---
    const total = await countUsers();
    const role = total === 0 ? 'administrator' : 'inputer';

    // --- Hash and save ---
    const passwordHash = await hashPassword(password);
    const id = await createUser({ username, email, passwordHash, role });
    await audit({
  actorId: id,
  action: 'user_registered',
  targetType: 'user',
  targetId: id,
  req,
});

    return res.status(201).json({
      message: 'User registered',
      user: { id, username, email, role },
    });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Password check first; if 2FA is enabled, a short-lived pre-2FA token is issued instead of a session.
 */
export async function login(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await findByUsername(String(username).trim());
const genericFail = () => res.status(401).json({ error: 'Invalid credentials' });

if (!user) return genericFail();
if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

// --- Lockout check ---
if (user.locked_until && new Date(user.locked_until) > new Date()) {
  await audit({
    actorId: user.id,
    action: 'login_blocked_locked',
    targetType: 'user',
    targetId: user.id,
    req,
  });
  return res.status(423).json({
    error: 'Account temporarily locked due to failed attempts. Try again later.',
  });
}

const ok = await verifyPassword(password, user.password_hash);

if (!ok) {
  await incrementFailedAttempts(user.id);
  await audit({
    actorId: user.id,
    action: 'login_failed',
    targetType: 'user',
    targetId: user.id,
    req,
  });

  const attempts = (user.failed_attempts || 0) + 1;
  if (attempts >= MAX_FAILED_ATTEMPTS) {
    await lockUser(user.id, LOCK_MINUTES);
    await audit({
      actorId: user.id,
      action: 'account_locked',
      targetType: 'user',
      targetId: user.id,
      req,
    });
    return res.status(423).json({
      error: `Too many failed attempts. Account locked for ${LOCK_MINUTES} minutes.`,
    });
  }

  return genericFail();
}

// Success — reset counter
await resetFailedAttempts(user.id);
await updateLastLogin(user.id);
await audit({
  actorId: user.id,
  action: 'login_password_ok',
  targetType: 'user',
  targetId: user.id,
  req,
});

    // If 2FA is on, do NOT give a full session yet — issue a short pre-2FA token
    if (user.is_2fa_enabled) {
      const preToken = signPre2faToken(user.id);
      return res.json({
        message: 'Password OK — 2FA required',
        requires2fa: true,
        preToken,
      });
    }

    // No 2FA — issue full session AND set cookie
const sessionToken = signSessionToken(user);
setSessionCookie(res, sessionToken);   // ← new
return res.json({
  message: 'Login complete',
  requires2fa: false,
  user: { id: user.id, username: user.username, role: user.role },
  sessionToken,                         // kept for API testing
});
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}
/** GET /api/auth/me — returns the logged-in user from the cookie. */
export async function me(req, res) {
  try {
    const token = req.cookies?.[process.env.COOKIE_NAME || 'sl_token'];
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const payload = verifyToken(token);
    if (payload.stage !== 'full') {
      return res.status(401).json({ error: 'Not fully authenticated' });
    }

    const user = await findById(Number(payload.sub));
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_2fa_enabled: !!user.is_2fa_enabled,
      },
    });
  } catch {
    return res.status(401).json({ error: 'Not authenticated' });
  }
}

export async function logout(req, res) {
  if (req.user?.id) {
    await audit({
      actorId: req.user.id,
      action: 'logout',
      targetType: 'user',
      targetId: req.user.id,
      req,
    });
  }
  clearSessionCookie(res);
  return res.json({ message: 'Logged out' });
}