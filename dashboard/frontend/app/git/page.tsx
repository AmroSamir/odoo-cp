'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { usePolling } from '@/lib/usePolling';
import type { GitStatus } from '@/types';
import api from '@/lib/api';

export default function GitPage() {
  const { data: status, loading, refresh } = usePolling<GitStatus>('/git/status', 30000);
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const handlePull = async () => { setPulling(true); setResult(null); try { const r = await api.post<{ summary: { changes: number } }>('/git/pull'); setResult(`Pulled. ${r.data.summary?.changes || 0} file(s) changed.`); refresh(); } catch (err: any) { setResult('Failed: ' + (err.response?.data?.error || err.message)); } finally { setPulling(false); } };

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-[260px]"><TopBar title="Git" />
        <main className="pt-[60px] p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[14px] text-txt-muted">Repository status and version control</p>
            <button onClick={handlePull} disabled={pulling} className="px-4 py-2.5 text-[13px] rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">{pulling ? 'Pulling...' : 'Pull latest'}</button>
          </div>
          {result && (
            <div className="mb-5 p-4 rounded-xl border border-page-border bg-page-surface text-[14px] text-txt-primary shadow-card">{result}</div>
          )}
          {loading && !status && <p className="text-txt-muted text-[14px]">Loading...</p>}
          {status && (
            <div className="space-y-5">
              <div className="bg-page-surface border border-page-border rounded-xl p-5 shadow-card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <span className="font-mono text-[15px] text-txt-primary font-semibold">{status.branch}</span>
                    <div className="flex gap-2 mt-1">
                      {status.isDirty && <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">dirty</span>}
                      {status.ahead > 0 && <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">+{status.ahead} ahead</span>}
                      {status.behind > 0 && <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">-{status.behind} behind</span>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="text-txt-muted">Staged</span>
                    <span className="text-txt-primary font-mono font-medium bg-page-bg px-2 py-0.5 rounded">{status.staged}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-txt-muted">Modified</span>
                    <span className="text-txt-primary font-mono font-medium bg-page-bg px-2 py-0.5 rounded">{status.modified}</span>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-txt-primary mb-3">Recent Commits</h3>
                <div className="bg-page-surface border border-page-border rounded-xl overflow-hidden shadow-card">
                  {status.recentCommits.map((c, i) => (
                    <div key={c.hash} className={`flex items-start gap-4 px-5 py-3.5 ${i > 0 ? 'border-t border-page-border' : ''}`}>
                      <span className="font-mono text-[11px] text-txt-faint mt-1 flex-shrink-0 bg-page-bg px-2 py-0.5 rounded">{c.hash}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] text-txt-primary truncate">{c.message}</p>
                        <p className="text-[12px] text-txt-muted font-mono mt-0.5">{c.author} &middot; {new Date(c.date).toLocaleString()}</p>
                      </div>
                      {i === 0 && <span className="text-[11px] font-medium text-accent bg-accent-light px-2 py-0.5 rounded-full flex-shrink-0">HEAD</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
