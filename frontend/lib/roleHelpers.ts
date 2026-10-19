// frontend/lib/roleHelpers.ts
import { Role } from './api';

export const ROLE_RANK: Record<Role, number> = {
  inputer: 1,
  manager: 2,
  admin: 3,
  administrator: 4,
};

export const ROLE_LABELS: Record<Role, string> = {
  inputer: 'Inputer',
  manager: 'Manager',
  admin: 'Admin',
  administrator: 'Administrator',
};

export const ROLE_BADGE: Record<Role, string> = {
  inputer: 'bg-slate-100 text-slate-700',
  manager: 'bg-blue-100 text-blue-700',
  admin: 'bg-purple-100 text-purple-700',
  administrator: 'bg-red-100 text-red-700',
};

export function canAccess(userRole: Role | undefined, required: Role): boolean {
  if (!userRole) return false;
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}