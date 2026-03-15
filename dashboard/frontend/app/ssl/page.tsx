'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { usePolling } from '@/lib/usePolling';
import type { SslCert } from '@/types';
import api from '@/lib/api';

const statusColors: Record<string, string> = {
  ok: 'text-green-400 bg-green-500/10 border-green-500/30',
  warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  unknown: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
  error: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export default function SslPage() {
  const { data: certs, loading, refresh } = usePolling<SslCert[]>('/ssl/status', 60000);
  const [renewing, setRenewing] = useState(false);
  const [renewResult, setRenewResult] = useState<string | null>(null);

  const handleRenew = async () => {
    setRenewing(true);
    setRenewResult(null);
    try {
      const res = await api.post<{ ok: boolean; stdout: string }>('/ssl/renew');
      setRenewResult(res.data.ok ? 'Certificates renewed successfully.' : 'Renewal completed with warnings.');
      refresh();
    } catch (err: any) {
      setRenewResult('Renewal failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
        <TopBar />
        <main className="pt-14 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">SSL Certificates</h2>
              <p className="text-sm text-gray-500 mt-0.5">Let's Encrypt certificate status for all domains</p>
            </div>
            <button
              onClick={handleRenew}
              disabled={renewing}
              className="px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium disabled:opacity-50 transition-colors"
            >
              {renewing ? 'Renewing...' : '↻ Renew All'}
            </button>
          </div>

          {renewResult && (
            <div className="mb-4 p-3 rounded border border-gray-700 bg-gray-900 text-sm text-gray-300">
              {renewResult}
            </div>
          )}

          {loading && !certs && <p className="text-gray-500 text-sm">Loading certificates...</p>}
          {certs?.length === 0 && <p className="text-gray-600 text-sm">No certificates found.</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certs?.map((cert) => (
              <div key={cert.domain} className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-sm text-white break-all">{cert.domain}</span>
                  <span className={`text-xs px-2 py-0.5 rounded border font-medium ml-2 flex-shrink-0 ${statusColors[cert.status]}`}>
                    {cert.status}
                  </span>
                </div>
                {cert.expiresAt && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>Expires: {new Date(cert.expiresAt).toLocaleDateString()}</div>
                    {cert.daysLeft !== null && (
                      <div className={cert.daysLeft < 30 ? 'text-yellow-400' : ''}>
                        {cert.daysLeft} days remaining
                      </div>
                    )}
                    {cert.isSelfSigned && (
                      <div className="text-yellow-500">⚠ Self-signed certificate</div>
                    )}
                  </div>
                )}
                {cert.error && <div className="text-xs text-red-400">{cert.error}</div>}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
