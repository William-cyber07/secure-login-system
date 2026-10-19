'use client';

import { useState, useEffect } from 'react';
import { reportApi, systemApi } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { canAccess, ROLE_BADGE, ROLE_LABELS } from '@/lib/roleHelpers';

export default function ReportsPage() {
  const { user } = useAuth();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');

  async function loadReport() {
    try {
      setLoading(true);
      const data = await reportApi.getReport();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && canAccess(user.role, 'administrator')) {
      loadReport();
    }
  }, [user]);

  if (!user || !canAccess(user.role, 'administrator')) {
    return <div className="rounded-md bg-red-50 p-4 text-red-700">Access Denied.</div>;
  }

  async function handleBackup() {
    setActionMsg('Creating backup...');
    try {
      const res = await systemApi.backup();
      setActionMsg(`✅ Success: ${res.message} (${res.filename})`);
    } catch (err: any) {
      setActionMsg(`❌ Failed: ${err.message}`);
    }
  }

  async function handleRestore() {
    const file = prompt("Enter the backup filename to restore (e.g., backup_2026-10-19.sql):");
    if (!file) return;
    setActionMsg('Restoring...');
    try {
      const res = await systemApi.restore(file);
      setActionMsg(`✅ Success: ${res.message}`);
      loadReport(); // Refresh data
    } catch (err: any) {
      setActionMsg(`❌ Failed: ${err.message}`);
    }
  }

  if (loading) return <div>Loading system report...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">System Reports</h1>
        <p className="text-sm text-slate-500">
          Administrator overview of users, security hashes, and system state.
        </p>
      </div>

      {/* Backup & Restore Actions */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 flex gap-4 items-center">
        <button onClick={handleBackup} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          Backup Database
        </button>
        <button onClick={handleRestore} className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700">
          Restore Database
        </button>
        {actionMsg && <span className="text-sm font-medium">{actionMsg}</span>}
      </div>

      {/* Salt & Pepper Security Info */}
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm space-y-2">
        <h2 className="font-semibold text-lg border-b pb-2 mb-2">Security Logic</h2>
        <p><strong>Pepper Status:</strong> <span className="text-green-700 font-mono">{report.pepper}</span></p>
        <p><strong>Salt Implementation:</strong> <span className="text-slate-700">{report.saltLogic}</span></p>
      </div>

      {/* Active Users Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-lg mb-3">Active Users ({report.users.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Password Hash (Argon2id)</th>
                <th className="px-3 py-2">PGP Key</th>
              </tr>
            </thead>
            <tbody>
              {report.users.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{u.username}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${ROLE_BADGE[u.role as keyof typeof ROLE_BADGE]}`}>
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-slate-500 max-w-xs truncate" title={u.password_hash}>
                    {u.password_hash}
                  </td>
                  <td className="px-3 py-2">{u.has_pgp ? '✅ Uploaded' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deleted Users Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold text-lg mb-3">Deleted Users Audit Trail</h2>
        {report.deletedUsers.length === 0 ? (
          <p className="text-sm text-slate-500">No deleted users yet. Try deleting an inputer in the Users tab.</p>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-3 py-2">Original ID</th>
                <th className="px-3 py-2">Username</th>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Deleted At</th>
              </tr>
            </thead>
            <tbody>
              {report.deletedUsers.map((u: any) => (
                <tr key={u.id} className="border-b last:border-0 text-slate-500">
                  <td className="px-3 py-2">{u.original_user_id}</td>
                  <td className="px-3 py-2 font-medium line-through">{u.username}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{new Date(u.deleted_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}