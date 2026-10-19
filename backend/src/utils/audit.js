import { query } from '../config/db.js';

/**
 * Fire-and-forget audit log writer.
 * Never throws — an audit failure should not break the request.
 */
export async function audit({
  actorId = null,
  action,
  targetType = null,
  targetId = null,
  req = null,
}) {
  try {
    const ip =
      req?.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req?.socket?.remoteAddress ||
      null;
    const userAgent = req?.headers['user-agent'] || null;

    await query(
      `INSERT INTO audit_log
       (actor_id, action, target_type, target_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [actorId, action, targetType, targetId, ip, userAgent]
    );
  } catch (err) {
    console.error('audit error:', err.message);
  }
}