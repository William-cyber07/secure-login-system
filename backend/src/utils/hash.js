import argon2 from 'argon2';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Global pepper from .env — NEVER stored in the database
const PEPPER = process.env.PASSWORD_PEPPER;
if (!PEPPER || PEPPER.length < 32) {
  throw new Error('PASSWORD_PEPPER missing or too short in .env');
}

/**
 * Hash a plaintext password with salt + pepper.
 * Argon2 embeds the salt inside the returned string, so we only store one column.
 */
export async function hashPassword(plainPassword) {
  // Extra defense: mix pepper with a per-user random salt ourselves
  const pepper = crypto.createHmac('sha256', PEPPER)
    .update(plainPassword)
    .digest('hex');

  // Argon2id is the OWASP-recommended variant
  return argon2.hash(pepper, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB — OWASP minimum
    timeCost: 2,
    parallelism: 1,
  });
}

/**
 * Verify a password against the stored hash.
 * Reapplies the pepper, then lets Argon2 do the salt-aware comparison.
 */
export async function verifyPassword(plainPassword, storedHash) {
  try {
    const pepper = crypto.createHmac('sha256', PEPPER)
      .update(plainPassword)
      .digest('hex');
    return await argon2.verify(storedHash, pepper);
  } catch {
    return false;
  }
}