import {
  findByUsername,
  findByEmail,
  findById,
  createUser,
  listUsers,
  deleteUserById,
  setUserRole,
  savePgpKey
} from '../models/userModel.js';
import { hashPassword } from '../utils/hash.js';
import { ROLE_RANK } from '../rbac.js';
import { audit } from '../utils/audit.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;

/**
 * POST /api/users/inputer
 * Body: { username, email, password }
 * Requires: manager | admin | administrator
 */
export async function createInputer(req, res) {
  try {
    let { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    username = String(username).trim();
    email = String(email).trim().toLowerCase();

    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Invalid username format' });
    }
    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Invalid email' });
    }
    if (password.length < PASSWORD_MIN) {
      return res.status(400).json({ error: `Password must be at least ${PASSWORD_MIN} chars` });
    }

    if (await findByUsername(username)) {
      return res.status(409).json({ error: 'Username already taken' });
    }
    if (await findByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await hashPassword(password);
    const id = await createUser({
      username,
      email,
      passwordHash,
      role: 'inputer',
    });

    return res.status(201).json({
      message: 'Inputer created',
      user: { id, username, email, role: 'inputer' },
    });
    await audit({
  actorId: req.user.id,
  action: 'inputer_created',
  targetType: 'user',
  targetId: id,
  req,
});

  } catch (err) {
    console.error('createInputer error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * DELETE /api/users/inputer/:id
 * Requires: admin | administrator
 * Safety: can only delete users whose role is 'inputer'.
 */
export async function deleteInputer(req, res) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'Invalid id' });

    const target = await findById(id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    if (target.role !== 'inputer') {
      return res.status(403).json({
        error: 'Can only delete users with role "inputer"',
        targetRole: target.role,
      });
    }

    const ok = await deleteUserById(id, req.user.id);
    if (!ok) return res.status(500).json({ error: 'Delete failed' });

    return res.json({ message: 'Inputer deleted', id });
    await audit({
  actorId: req.user.id,
  action: 'inputer_deleted',
  targetType: 'user',
  targetId: id,
  req,
});
  } catch (err) {
    console.error('deleteInputer error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * GET /api/users
 * Requires: admin | administrator
 */
export async function listAllUsers(req, res) {
  try {
    const users = await listUsers();
    return res.json({ users });
  } catch (err) {
    console.error('listAllUsers error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * PATCH /api/users/:id/role
 * Body: { role }
 * Requires: administrator ONLY.
 */
export async function changeUserRole(req, res) {
  try {
    const id = Number(req.params.id);
    const { role } = req.body || {};

    if (!id || !role) return res.status(400).json({ error: 'id and role are required' });
    if (!ROLE_RANK[role]) {
      return res.status(400).json({
        error: 'Invalid role',
        allowed: Object.keys(ROLE_RANK),
      });
    }

    const target = await findById(id);
    if (!target) return res.status(404).json({ error: 'User not found' });

    // Prevent demoting yourself out of administrator (avoid lockout)
    if (target.id === req.user.id && req.user.role === 'administrator' && role !== 'administrator') {
      return res.status(400).json({ error: 'You cannot demote yourself from administrator' });
    }

    const ok = await setUserRole(id, role);
    if (!ok) return res.status(500).json({ error: 'Update failed' });

    return res.json({ message: 'Role updated', id, role });
    await audit({
  actorId: req.user.id,
  action: 'role_changed',
  targetType: 'user',
  targetId: id,
  req,
});
  } catch (err) {
    console.error('changeUserRole error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}

/**
 * POST /api/users/pgp
 * Body: { publicKey }
 * Lets a logged-in user upload their Kleopatra / PGP public key.
 */
export async function uploadPgpKey(req, res) {
  try {
    const { publicKey } = req.body || {};
    if (!publicKey) return res.status(400).json({ error: 'publicKey is required' });

    await savePgpKey(req.user.id, publicKey);
    
    await audit({
      actorId: req.user.id,
      action: 'pgp_key_uploaded',
      targetType: 'user',
      targetId: req.user.id,
      req,
    });

    return res.json({ message: 'Public key saved successfully' });
  } catch (err) {
    console.error('uploadPgpKey error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
}