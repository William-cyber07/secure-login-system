import { query } from '../config/db.js';

export async function findByUsername(username) {
  const rows = await query(
    'SELECT * FROM users WHERE username = ? LIMIT 1',
    [username]
  );
  return rows[0] || null;
}

export async function findByEmail(email) {
  const rows = await query(
    'SELECT * FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

export async function findById(id) {
  const rows = await query(
    'SELECT * FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

export async function countUsers() {
  const rows = await query('SELECT COUNT(*) AS total FROM users');
  return rows[0].total;
}

export async function createUser({ username, email, passwordHash, role }) {
  const result = await query(
    `INSERT INTO users (username, email, password_hash, role)
     VALUES (?, ?, ?, ?)`,
    [username, email, passwordHash, role]
  );
  return result.insertId;
}

export async function updateLastLogin(userId) {
  await query(
    'UPDATE users SET last_login_at = NOW() WHERE id = ?',
    [userId]
  );
}

export async function saveTotpSecret(userId, secret) {
  await query(
    'UPDATE users SET totp_secret = ?, is_2fa_enabled = 0 WHERE id = ?',
    [secret, userId]
  );
}

export async function enable2fa(userId) {
  await query(
    'UPDATE users SET is_2fa_enabled = 1 WHERE id = ?',
    [userId]
  );
}

export async function disable2fa(userId) {
  await query(
    'UPDATE users SET is_2fa_enabled = 0, totp_secret = NULL WHERE id = ?',
    [userId]
  );
}

export async function listUsers() {
  const rows = await query(
    `SELECT id, username, email, role, is_2fa_enabled, is_active,
            last_login_at, created_at
     FROM users
     ORDER BY created_at DESC`
  );
  return rows;
}

export async function deleteUserById(id, deletedById) {
  // 1. Get the user data first
  const user = await findById(id);
  if (!user) return false;

  // 2. Insert into deleted_users table
  await query(
    `INSERT INTO deleted_users (original_user_id, username, email, role, deleted_by_id) 
     VALUES (?, ?, ?, ?, ?)`,
    [user.id, user.username, user.email, user.role, deletedById]
  );

  // 3. Delete from active users table
  const result = await query('DELETE FROM users WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function savePgpKey(userId, publicKey) {
  await query('UPDATE users SET pgp_public_key = ? WHERE id = ?', [publicKey, userId]);
}

export async function setUserRole(id, role) {
  const result = await query(
    'UPDATE users SET role = ? WHERE id = ?',
    [role, id]
  );
  return result.affectedRows > 0;
}

export async function incrementFailedAttempts(userId) {
  await query(
    'UPDATE users SET failed_attempts = failed_attempts + 1 WHERE id = ?',
    [userId]
  );
}

export async function resetFailedAttempts(userId) {
  await query(
    'UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?',
    [userId]
  );
}

export async function lockUser(userId, minutes = 15) {
  await query(
    'UPDATE users SET locked_until = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
    [minutes, userId]
  );
}