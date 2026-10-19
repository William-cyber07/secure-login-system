import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const ALG = process.env.JWT_ALGORITHM || 'HS256';

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET missing or too short in .env');
}

/** Short-lived token issued after password OK but before 2FA. */
export function signPre2faToken(userId) {
  return jwt.sign({ sub: String(userId), stage: 'pre2fa' }, JWT_SECRET, {
    algorithm: ALG,
    expiresIn: '5m',
  });
}

/** Full session token, issued after full auth. */
export function signSessionToken(user) {
  return jwt.sign(
    { sub: String(user.id), role: user.role, username: user.username, stage: 'full' },
    JWT_SECRET,
    {
      algorithm: ALG,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET, { algorithms: [ALG] });
}


export function setSessionCookie(res, token) {
  res.cookie(process.env.COOKIE_NAME || 'sl_token', token, {
    httpOnly: true,
    secure: true,          // Required for SameSite: 'none' (HTTPS only)
    sameSite: 'none',      // Allows cross-domain cookies (Vercel -> Render)
    maxAge: 15 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(process.env.COOKIE_NAME || 'sl_token', { 
    path: '/',
    secure: true,
    sameSite: 'none'
  });
}

