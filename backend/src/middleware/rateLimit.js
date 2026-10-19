import rateLimit from 'express-rate-limit';

/**
 * Strict limiter for authentication endpoints.
 * 10 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, try again later' },
});

/**
 * Slightly looser limiter for 2FA code submission.
 * Allows 20 attempts per 15 minutes.
 */
export const twoFactorLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many 2FA attempts, try again later' },
});