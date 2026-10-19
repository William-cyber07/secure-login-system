// frontend/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export type Role = 'inputer' | 'manager' | 'admin' | 'administrator';

export type User = {
  id: number;
  username: string;
  email?: string;
  role: Role;
  is_2fa_enabled?: boolean;
};

/**
 * Central fetch wrapper.
 * Always sends cookies (credentials: 'include').
 * Throws on non-2xx with a helpful message.
 */
export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    const message = (data && (data.error || data.message)) || `HTTP ${res.status}`;
    const err = new Error(message) as Error & {
      status?: number;
      data?: any;
    };
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data as T;
}

// ---- Typed endpoint helpers ----

export const authApi = {
  register: (body: { username: string; email: string; password: string }) =>
    api<{ message: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { username: string; password: string }) =>
    api<
      | { message: string; requires2fa: false; user: User }
      | { message: string; requires2fa: true; preToken: string }
    >('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => api<{ user: User }>('/api/auth/me'),

  logout: () => api<{ message: string }>('/api/auth/logout', { method: 'POST' }),
};

export const twoFactorApi = {
  setup: (body: { username: string; password: string }) =>
    api<{ message: string; qr: string; manualEntryKey: string }>(
      '/api/2fa/setup',
      { method: 'POST', body: JSON.stringify(body) }
    ),

  verifySetup: (body: { username: string; code: string }) =>
    api<{ message: string }>('/api/2fa/verify-setup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  verifyLogin: (body: { preToken: string; code: string }) =>
    api<{ message: string; user: User; sessionToken: string }>(
      '/api/2fa/verify-login',
      { method: 'POST', body: JSON.stringify(body) }
    ),
};

export const usersApi = {
  list: () => api<{ users: User[] }>('/api/users'),

  createInputer: (body: { username: string; email: string; password: string }) =>
    api<{ message: string; user: User }>('/api/users/inputer', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteInputer: (id: number) =>
    api<{ message: string; id: number }>(`/api/users/inputer/${id}`, {
      method: 'DELETE',
    }),

  changeRole: (id: number, role: Role) =>
    api<{ message: string }>(`/api/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
};

// ---- Role helpers (mirrors backend rbac.js) ----

export const ROLE_RANK: Record<Role, number> = {
  inputer: 1,
  manager: 2,
  admin: 3,
  administrator: 4,
};

export function hasRole(userRole: Role | undefined, required: Role[]): boolean {
  if (!userRole || !ROLE_RANK[userRole]) return false;
  const rank = ROLE_RANK[userRole];
  return required.some((r) => rank >= ROLE_RANK[r]);
}

// Add this at the bottom of frontend/lib/api.ts

export const reportApi = {
  getReport: () =>
    api<any>('/api/reports'),
};

export const systemApi = {
  backup: () => api<{ message: string; filename: string }>('/api/system/backup', { method: 'POST' }),
  restore: (filename: string) => api<{ message: string }>('/api/system/restore', { 
    method: 'POST', 
    body: JSON.stringify({ filename }) 
  }),
};