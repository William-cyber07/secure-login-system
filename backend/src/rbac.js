/**
 * Role hierarchy. Higher number = more power.
 * A higher role implicitly has all powers of lower roles.
 */
export const ROLE_RANK = {
  inputer: 1,
  manager: 2,
  admin: 3,
  administrator: 4,
};

/** Does userRole meet or exceed any of requiredRoles? */
export function hasRole(userRole, requiredRoles) {
  if (!userRole || !ROLE_RANK[userRole]) return false;
  const userRank = ROLE_RANK[userRole];
  const required = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return required.some((r) => ROLE_RANK[r] && userRank >= ROLE_RANK[r]);
}