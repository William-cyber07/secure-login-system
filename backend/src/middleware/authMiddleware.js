import { verifyToken } from '../utils/jwt.js';
import { findById } from '../models/userModel.js';

/**
 * Require a valid session cookie. Attaches req.user.
 * Responds 401 if missing/invalid.
 */
export async function requireAuth(req, res, next) {
  try {
    const cookieName = process.env.COOKIE_NAME || 'sl_token';
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: 'Authentication required' });

    const payload = verifyToken(token);
    if (payload.stage !== 'full') {
      return res.status(401).json({ error: 'Not fully authenticated' });
    }

    const user = await findById(Number(payload.sub));
    if (!user || !user.is_active) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      is_2fa_enabled: !!user.is_2fa_enabled,
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication required' });
  }
}