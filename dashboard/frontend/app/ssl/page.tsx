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
    <div className="flex min-h-screen bg-deep-bg">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <TopBar />
        <main className="pt-[48px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-medium text-[#eceff1]">SSL</h2>
            <button onClick={handleRenew} disabled={renewing} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-[#001e3c] font-medium disabled:opacity-30 transition-colors duration-150">{renewing ? 'Renewing...' : 'Renew all'}</button>
          </div>
          {result && <div className="mb-4 p-3 rounded-md border border-deep-border bg-deep-surface text-[13px] text-[#eceff1]">{result}</div>}
          {loading && !certs && <p className="text-[#6b8fa8] text-[13px]">Loading...</p>}
          {certs?.length === 0 && <p className="text-[#4a7a96] text-[13px]">No certificates.</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {certs?.map((c) => (
              <div key={c.domain} className="bg-deep-surface border border-deep-border rounded-md p-4">
                <div className="flex items-start justify-between mb-3">
                  <span className="font-mono text-[12px] text-[#eceff1] break-all">{c.domain}</span>
                  <span className={`text-[11px] font-mono ${c.status === 'ok' ? 'text-green-400' : c.status === 'warning' ? 'text-[#ffa726]' : 'text-red-400'}`}>{c.status}</span>
                </div>
                {c.expiresAt && (
                  <div className="text-[11px] text-[#6b8fa8] space-y-1">
                    <div className="flex justify-between"><span>Expires</span><span className="font-mono text-[#8eafc4]">{new Date(c.expiresAt).toLocaleDateString()}</span></div>
                    {c.daysLeft !== null && <div className="flex justify-between"><span>Remaining</span><span className={`font-mono ${c.daysLeft < 30 ? 'text-[#ffa726]' : 'text-[#8eafc4]'}`}>{c.daysLeft}d</span></div>}
                    {c.isSelfSigned && <p className="text-[#ffa726] mt-1">Self-signed</p>}
                  </div>
                )}
                {c.error && <p className="text-[11px] text-red-400 mt-2">{c.error}</p>}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
