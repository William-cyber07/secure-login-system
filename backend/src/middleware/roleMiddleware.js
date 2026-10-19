import { hasRole } from '../rbac.js';

/**
 * Usage: router.post('/thing', requireAuth, requireRole('admin'), handler)
 * Rejects with 403 if req.user.role doesn't meet the requirement.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!hasRole(req.user.role, allowedRoles)) {
      return res.status(403).json({
        error: 'Forbidden',
        required: allowedRoles,
        yours: req.user.role,
      });
    }
    next();
  };
}