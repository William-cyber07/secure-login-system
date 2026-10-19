// frontend/app/2fa/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { twoFactorApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function TwoFactorPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [preToken, setPreToken] = useState('');

  useEffect(() => {
    const t = sessionStorage.getItem('preToken');
    if (!t) {
      router.replace('/login');
      return;
    }
    setPreToken(t);
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await twoFactorApi.verifyLogin({ preToken, code });
      sessionStorage.removeItem('preToken');
      await refresh();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-2xl font-semibold">Two-factor authentication</h1>
        <p className="mb-6 text-sm text-slate-500">
          Enter the 6-digit code from your authenticator app
        </p>

        <form onSubmit={onSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            required
            autoFocus
            placeholder="123456"
            className="w-full rounded-md border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.4em] outline-none focus:border-slate-500"
          />

          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>

          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="w-full text-sm text-slate-500 underline"
          >
            Back to login
          </button>
        </form>
      </div>
    </main>
  );
}