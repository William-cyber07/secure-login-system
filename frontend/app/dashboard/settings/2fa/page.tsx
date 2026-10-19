// frontend/app/dashboard/settings/2fa/page.tsx
'use client';

import { useState, FormEvent } from 'react';
import { twoFactorApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function TwoFactorSettingsPage() {
  const { user, refresh } = useAuth();
  const [password, setPassword] = useState('');
  const [qr, setQr] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [stage, setStage] = useState<'idle' | 'qr' | 'done'>('idle');
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  async function onStart(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await twoFactorApi.setup({
        username: user!.username,
        password,
      });
      setQr(res.qr);
      setManualKey(res.manualEntryKey);
      setStage('qr');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Setup failed');
    } finally {
      setBusy(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await twoFactorApi.verifySetup({ username: user!.username, code });
      setSuccess('2FA enabled successfully.');
      setStage('done');
      await refresh();
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Two-factor authentication</h1>
        <p className="text-sm text-slate-500">
          Protect your account with a 6-digit code from an authenticator app.
        </p>
      </div>

      {user.is_2fa_enabled ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          ✅ 2FA is <b>enabled</b> on your account.
        </div>
      ) : stage === 'idle' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm text-slate-600">
            Confirm your password to begin setting up 2FA.
          </p>
          <form onSubmit={onStart} className="space-y-3 max-w-sm">
            <input
              type="password"
              placeholder="Your current password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? 'Generating…' : 'Generate QR code'}
            </button>
          </form>
          {error && (
            <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      ) : stage === 'qr' ? (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <h2 className="font-semibold">1. Scan this QR code</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="2FA QR code" className="w-64" />
          <p className="text-xs text-slate-500">
            Can&apos;t scan? Enter this key manually:
          </p>
          <code className="block break-all rounded bg-slate-100 px-2 py-1 text-xs">
            {manualKey}
          </code>

          <h2 className="pt-2 font-semibold">2. Enter the 6-digit code</h2>
          <form onSubmit={onVerify} className="space-y-3 max-w-sm">
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="123456"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-center text-xl tracking-widest"
            />
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {busy ? 'Verifying…' : 'Enable 2FA'}
            </button>
          </form>
          {error && (
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
          {success}
        </div>
      )}
    </div>
  );
}