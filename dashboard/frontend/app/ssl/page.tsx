'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { usePolling } from '@/lib/usePolling';
import type { SslCert } from '@/types';
import api from '@/lib/api';

export default function SslPage() {
  const { data: certs, loading, refresh } = usePolling<SslCert[]>('/ssl/status', 60000);
  const [renewing, setRenewing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleRenew = async () => {
    setRenewing(true);
    setResult(null);
    try {
      const res = await api.post<{ ok: boolean }>('/ssl/renew');
      setResult(res.data.ok ? 'Renewed successfully.' : 'Completed with warnings.');
      refresh();
    } catch (err: any) {
      setResult('Failed: ' + (err.response?.data?.error || err.message));
    } finally { setRenewing(false); }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <TopBar />
        <main className="pt-[48px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-medium text-white">SSL</h2>
            <button onClick={handleRenew} disabled={renewing}
              className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">
              {renewing ? 'Renewing...' : 'Renew all'}
            </button>
          </div>

          {result && <div className="mb-4 p-3 rounded-md border border-zinc-800 bg-zinc-900 text-[13px] text-zinc-300">{result}</div>}
          {loading && !certs && <p className="text-zinc-500 text-[13px]">Loading...</p>}
          {certs?.length === 0 && <p className="text-zinc-600 text-[13px]">No certificates found.</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {certs?.map((cert) => (
              <div key={cert.domain} className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-[12px] text-white break-all">{cert.domain}</span>
                  <span className={`text-[11px] font-mono ${
                    cert.status === 'ok' ? 'text-green-400' : cert.status === 'warning' ? 'text-yellow-400' : 'text-red-400'
                  }`}>{cert.status}</span>
                </div>
                {cert.expiresAt && (
                  <div className="text-[11px] text-zinc-500 space-y-1">
                    <div className="flex justify-between">
                      <span>Expires</span>
                      <span className="font-mono text-zinc-400">{new Date(cert.expiresAt).toLocaleDateString()}</span>
                    </div>
                    {cert.daysLeft !== null && (
                      <div className="flex justify-between">
                        <span>Remaining</span>
                        <span className={`font-mono ${cert.daysLeft < 30 ? 'text-yellow-400' : 'text-zinc-400'}`}>{cert.daysLeft}d</span>
                      </div>
                    )}
                    {cert.isSelfSigned && <p className="text-yellow-500 mt-1">Self-signed</p>}
                  </div>
                )}
                {cert.error && <p className="text-[11px] text-red-400 mt-2">{cert.error}</p>}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
