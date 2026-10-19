// frontend/app/dashboard/users/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { usersApi, User, Role } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import {
  ROLE_BADGE,
  ROLE_LABELS,
  ROLE_RANK,
  canAccess,
} from '@/lib/roleHelpers';

const ALL_ROLES: Role[] = ['inputer', 'manager', 'admin', 'administrator'];

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // create form state
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState('');

  async function loadUsers() {
    try {
      const { users } = await usersApi.list();
      setUsers(users);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (!me) return null;
  if (!canAccess(me.role, 'admin')) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-red-700">
        You do not have permission to view this page.
      </div>
    );
  }

  const isAdminPlus = canAccess(me.role, 'admin');
  const isTopRole = me.role === 'administrator';
  const canCreateInputer = canAccess(me.role, 'manager');
  const canDeleteInputer = canAccess(me.role, 'admin');

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreateMsg('');
    setError('');
    setCreating(true);
    try {
      const res = await usersApi.createInputer({
        username: newUsername,
        email: newEmail,
        password: newPassword,
      });
      setCreateMsg(`Created ${res.user.username} as ${res.user.role}`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  }

  async function onDelete(u: User) {
    if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
    setError('');
    try {
      await usersApi.deleteInputer(u.id);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
    }
  }

  async function onChangeRole(u: User, role: Role) {
    setError('');
    try {
      await usersApi.changeRole(u.id, role);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Users</h1>
        <p className="text-sm text-slate-500">
          Manage accounts, roles and access.
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Create inputer form */}
      {canCreateInputer && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Create new inputer</h2>
          <form onSubmit={onCreate} className="grid gap-3 sm:grid-cols-3">
            <input
              placeholder="username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="password (min 8)"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={creating}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create inputer'}
              </button>
              {createMsg && (
                <span className="ml-3 text-sm text-green-700">{createMsg}</span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Users list */}
      <div className="rounded-lg border border-slate-200 bg-white">
        {loading ? (
          <div className="p-4 text-sm text-slate-500">Loading…</div>
        ) : users.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">No users.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500">
              <tr>
                <th className="px-4 py-2">Username</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">2FA</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {u.username}
                    {u.id === me.id && (
                      <span className="ml-2 text-xs text-slate-400">(you)</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2">
                    {isTopRole && u.id !== me.id ? (
                      <select
                        value={u.role}
                        onChange={(e) => onChangeRole(u, e.target.value as Role)}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${ROLE_BADGE[u.role]}`}
                      >
                        {ROLE_LABELS[u.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {u.is_2fa_enabled ? '✅ on' : '—'}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {canDeleteInputer &&
                      u.role === 'inputer' &&
                      u.id !== me.id && (
                        <button
                          onClick={() => onDelete(u)}
                          className="text-xs text-red-600 underline hover:text-red-800"
                        >
                          Delete
                        </button>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Deletion is only permitted for users with role <b>inputer</b>.
        Changing roles requires <b>administrator</b>.
      </p>
    </div>
  );
}