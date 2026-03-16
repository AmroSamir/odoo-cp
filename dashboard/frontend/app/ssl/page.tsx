'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { usePolling } from '@/lib/usePolling';
import type { SslCert } from '@/types';
import api from '@/lib/api';

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  ok:       { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Valid' },
  warning:  { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Expiring' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
  unknown:  { color: 'text-gray-400', bg: 'bg-gray-500/10', label: 'Unknown' },
  error:    { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Error' },
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
    <div className="flex min-h-screen bg-void">
      <Sidebar />
      <div className="flex-1 ml-[var(--sidebar-width)]">
        <TopBar />
        <main className="pt-[var(--topbar-height)] p-6">
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-white">SSL Certificates</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Let's Encrypt certificate status for all domains</p>
            </div>
            <button
              onClick={handleRenew}
              disabled={renewing}
              className="flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-accent hover:bg-accent-glow text-white font-medium disabled:opacity-40 transition-all duration-150"
            >
              {renewing ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Renewing...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Renew All
                </>
              )}
            </button>
          </div>

          {renewResult && (
            <div className="mb-5 p-3.5 rounded-lg border border-subtle bg-surface text-[12px] text-gray-300 animate-slide-up">
              {renewResult}
            </div>
          )}

          {loading && !certs && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-3.5 h-3.5 border-2 border-subtle border-t-gray-400 rounded-full animate-spin" />
              Loading certificates...
            </div>
          )}

          {certs?.length === 0 && (
            <p className="text-gray-600 text-sm">No certificates found.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {certs?.map((cert) => {
              const cfg = statusConfig[cert.status] || statusConfig.unknown;
              return (
                <div key={cert.domain} className="bg-surface border border-subtle rounded-xl p-5 card-hover animate-slide-up">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <span className="font-mono text-[12px] text-white break-all">{cert.domain}</span>
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md ${cfg.color} ${cfg.bg} tracking-wider`}>
                      {cfg.label}
                    </span>
                  </div>
                  {cert.expiresAt && (
                    <div className="text-[11px] text-gray-500 space-y-1.5 ml-[42px]">
                      <div className="flex justify-between">
                        <span>Expires</span>
                        <span className="font-mono text-gray-400">{new Date(cert.expiresAt).toLocaleDateString()}</span>
                      </div>
                      {cert.daysLeft !== null && (
                        <div className="flex justify-between">
                          <span>Remaining</span>
                          <span className={`font-mono ${cert.daysLeft < 30 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {cert.daysLeft} days
                          </span>
                        </div>
                      )}
                      {cert.isSelfSigned && (
                        <div className="text-yellow-500/80 bg-yellow-500/10 rounded-md px-2 py-1 mt-2 text-[10px]">
                          Self-signed certificate
                        </div>
                      )}
                    </div>
                  )}
                  {cert.error && (
                    <div className="text-[11px] text-red-400 bg-red-500/10 rounded-md px-2 py-1 ml-[42px] mt-2">
                      {cert.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
}
