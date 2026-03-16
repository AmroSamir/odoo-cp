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
  const handleRenew = async () => { setRenewing(true); setResult(null); try { const r = await api.post<{ ok: boolean }>('/ssl/renew'); setResult(r.data.ok ? 'Renewed.' : 'Warnings.'); refresh(); } catch (err: any) { setResult('Failed: ' + (err.response?.data?.error || err.message)); } finally { setRenewing(false); } };

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-[260px]"><TopBar title="SSL" />
        <main className="pt-[60px] p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[14px] text-txt-muted">SSL certificate status and renewal</p>
            <button onClick={handleRenew} disabled={renewing} className="px-4 py-2.5 text-[13px] rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">{renewing ? 'Renewing...' : 'Renew all'}</button>
          </div>
          {result && (
            <div className="mb-5 p-4 rounded-xl border border-page-border bg-page-surface text-[14px] text-txt-primary shadow-card">{result}</div>
          )}
          {loading && !certs && <p className="text-txt-muted text-[14px]">Loading...</p>}
          {certs?.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-page-bg border border-page-border flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-txt-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <p className="text-txt-muted text-[14px]">No certificates</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {certs?.map((c) => (
              <div key={c.domain} className="bg-page-surface border border-page-border rounded-xl p-5 shadow-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.status === 'ok' ? 'bg-emerald-50' : c.status === 'warning' ? 'bg-amber-50' : 'bg-red-50'}`}>
                      <svg className={`w-4 h-4 ${c.status === 'ok' ? 'text-emerald-500' : c.status === 'warning' ? 'text-amber-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <span className="font-mono text-[13px] text-txt-primary break-all">{c.domain}</span>
                  </div>
                  <span className={`text-[12px] font-medium px-2.5 py-0.5 rounded-full ${c.status === 'ok' ? 'bg-emerald-50 text-emerald-600' : c.status === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>{c.status}</span>
                </div>
                {c.expiresAt && (
                  <div className="text-[13px] text-txt-secondary space-y-2">
                    <div className="flex justify-between"><span>Expires</span><span className="font-mono text-txt-primary">{new Date(c.expiresAt).toLocaleDateString()}</span></div>
                    {c.daysLeft !== null && <div className="flex justify-between"><span>Remaining</span><span className={`font-mono font-medium ${c.daysLeft < 30 ? 'text-amber-500' : 'text-txt-primary'}`}>{c.daysLeft}d</span></div>}
                    {c.isSelfSigned && <p className="text-amber-500 text-[12px] mt-1 bg-amber-50 px-2 py-1 rounded">Self-signed</p>}
                  </div>
                )}
                {c.error && <p className="text-[12px] text-red-500 mt-2 bg-red-50 px-2 py-1 rounded">{c.error}</p>}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
