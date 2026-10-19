// frontend/app/dashboard/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { canAccess, ROLE_BADGE, ROLE_LABELS } from '@/lib/roleHelpers';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading } = useAuth();
  const pathname = usePathname();

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500">Loading…</p>
      </main>
    );
  }

    const navItems: { href: string; label: string; min?: 'admin' | 'manager' | 'administrator' }[] = [
    { href: '/dashboard', label: 'Overview' },
    { href: '/dashboard/settings/2fa', label: '2FA Settings' },
    { href: '/dashboard/users', label: 'Users', min: 'admin' },
    { href: '/dashboard/reports', label: 'System Reports', min: 'administrator' }, // <-- New!
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <Link href="/dashboard" className="font-semibold">
            Secure Login App
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <div className="font-medium">{user.username}</div>
              <span
                className={`inline-block rounded px-2 py-0.5 text-xs ${ROLE_BADGE[user.role]}`}
              >
                {ROLE_LABELS[user.role]}
              </span>
            </div>
            <button
              onClick={logout}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-8 px-6 py-8">
        <nav className="w-48 shrink-0 space-y-1">
          {navItems
            .filter((item) => !item.min || canAccess(user.role, item.min as any))
            .map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm ${
                    active
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
        </nav>

        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}