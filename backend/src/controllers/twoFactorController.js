import { findById, findByUsername, saveTotpSecret, enable2fa } from '../models/userModel.js';
import { generateTotpSecret, generateQrDataUrl, verifyTotpCode } from '../utils/totp.js';
import { verifyPassword } from '../utils/hash.js';
import { signPre2faToken, signSessionToken, verifyToken, setSessionCookie } from '../utils/jwt.js';
import { audit } from '../utils/audit.js';
import { resetFailedAttempts } from '../models/userModel.js';

/**
 * POST /api/2fa/setup
 * Body: { username, password }
 * Verifies password, generates a NEW secret, returns QR + otpauth URL.
 * 2FA is NOT yet enabled — user must call /verify-setup with a code first.
 */
export async function setup2fa(req, res) {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = await findByUsername(String(username).trim());
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const { base32, otpauthUrl } = generateTotpSecret(user.username);
    await saveTotpSecret(user.id, base32); // saved but is_2fa_enabled still 0

    const qrDataUrl = await generateQrDataUrl(otpauthUrl);
    return res.json({
      message: 'Scan this QR code in Google Authenticator, then verify a code',
      qr: qrDataUrl,
      // For manual entry in the app:
      manualEntryKey: base32,
    });
  } catch (err) {
    console.error('setup2fa error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/2fa/verify-setup
 * Body: { username, code }
 * Enables 2FA if the code matches the stored secret.
 */
export async function verifySetup(req, res) {
  try {
    const { username, code } = req.body || {};
    if (!username || !code) {
      return res.status(400).json({ error: 'username and code are required' });
    }

    const user = await findByUsername(String(username).trim());
    if (!user || !user.totp_secret) {
      return res.status(400).json({ error: 'No pending 2FA setup for this user' });
    }
    if (user.is_2fa_enabled) {
      return res.status(400).json({ error: '2FA already enabled' });
    }

    const ok = verifyTotpCode(user.totp_secret, code);
    if (!ok) return res.status(401).json({ error: 'Invalid 2FA code' });

    await enable2fa(user.id);
    return res.json({ message: '2FA enabled successfully' });
    await audit({
  actorId: user.id,
  action: '2fa_enabled',
  targetType: 'user',
  targetId: user.id,
  req,
});
  } catch (err) {
    console.error('verifySetup error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/2fa/verify-login
 * Body: { preToken, code }
 * Step 2 of login. Takes the token from /api/auth/login, checks the 6-digit code,
 * returns a full session JWT.
 */
export async function verifyLogin(req, res) {
  try {
    const { preToken, code } = req.body || {};
    if (!preToken || !code) {
      return res.status(400).json({ error: 'preToken and code are required' });
    }

    let payload;
    try {
      payload = verifyToken(preToken);
    } catch {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    if (payload.stage !== 'pre2fa') {
      return res.status(401).json({ error: 'Wrong token stage' });
    }

    const user = await findById(Number(payload.sub));
    if (!user || !user.is_active || !user.is_2fa_enabled || !user.totp_secret) {
      return res.status(401).json({ error: '2FA not available for this account' });
    }

    const ok = verifyTotpCode(user.totp_secret, code);
    if (!ok) return res.status(401).json({ error: 'Invalid 2FA code' });
    if (!ok) {
  await audit({
    actorId: user.id,
    action: 'login_2fa_failed',
    targetType: 'user',
    targetId: user.id,
    req,
  });
  return res.status(401).json({ error: 'Invalid 2FA code' });
}

    const sessionToken = signSessionToken(user);
    await resetFailedAttempts(user.id);
await audit({
  actorId: user.id,
  action: 'login_2fa_ok',
  targetType: 'user',
  targetId: user.id,
  req,
});
setSessionCookie(res, sessionToken);   // ← new
return res.json({
  message: 'Login complete',
  user: { id: user.id, username: user.username, role: user.role },
  sessionToken,                         // kept for API testing
});
  } catch (err) {
    console.error('verifyLogin error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}