import { query } from '../config/db.js';
import { listUsers } from '../models/userModel.js';

/**
 * GET /api/reports
 * Requires: administrator
 * Returns all users, their hashes, and confirms the pepper is active.
 */
export async function getSystemReport(req, res) {
  try {
    // 1. Get all users (with hashes included for demonstration)
    const users = await query(
      `SELECT id, username, email, role, password_hash, is_2fa_enabled, pgp_public_key IS NOT NULL AS has_pgp 
       FROM users`
    );

    // 2. Get deleted users
    const deletedUsers = await query(
      `SELECT id, original_user_id, username, role, deleted_at FROM deleted_users`
    );

    // 3. Show the pepper logic (but NEVER show the actual pepper)
    const pepperStatus = process.env.PASSWORD_PEPPER 
      ? `Active (${process.env.PASSWORD_PEPPER.length} characters)` 
      : 'MISSING';

    return res.json({
      message: 'System Report',
      pepper: pepperStatus,
      saltLogic: 'Argon2 embeds a unique 16-byte salt inside every hash string.',
      users,
      deletedUsers,
    });
  } catch (err) {
    console.error('getSystemReport error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}