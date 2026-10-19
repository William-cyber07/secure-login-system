// frontend/app/dashboard/page.tsx
'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { canAccess, ROLE_LABELS } from '@/lib/roleHelpers';

export default function DashboardOverview() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user.username}</h1>
        <p className="text-sm text-slate-500">
          You are signed in as <b>{ROLE_LABELS[user.role]}</b>.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-semibold">Your account</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="w-40 text-slate-500">Username</dt>
            <dd>{user.username}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 text-slate-500">Email</dt>
            <dd>{user.email || '—'}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 text-slate-500">Role</dt>
            <dd>{ROLE_LABELS[user.role]}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="w-40 text-slate-500">Two-factor auth</dt>
            <dd>
              {user.is_2fa_enabled ? (
                <span className="text-green-700">Enabled ✅</span>
              ) : (
                <span className="text-amber-700">Not enabled</span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Quick links</h2>
        <ul className="space-y-2 text-sm">
          <li>
            <Link
              href="/dashboard/settings/2fa"
              className="text-blue-700 underline"
            >
              {user.is_2fa_enabled ? 'Manage 2FA' : 'Enable 2FA'}
            </Link>
          </li>

          {!user.is_2fa_enabled && (
            <li className="text-amber-700">
              ⚠️ You have not enabled 2FA. We strongly recommend setting it up.
            </li>
          )}

          {canAccess(user.role, 'manager') && (
            <li>
              <Link href="/dashboard/users" className="text-blue-700 underline">
                {canAccess(user.role, 'admin')
                  ? 'Manage users (create, delete, roles)'
                  : 'Add new inputers'}
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}