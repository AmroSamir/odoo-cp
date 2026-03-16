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
    <div className="flex min-h-screen bg-deep-bg">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <TopBar />
        <main className="pt-[48px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-medium text-[#eceff1]">Git</h2>
            <button onClick={handlePull} disabled={pulling} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-[#001e3c] font-medium disabled:opacity-30 transition-colors duration-150">{pulling ? 'Pulling...' : 'Pull latest'}</button>
          </div>
          {result && <div className="mb-4 p-3 rounded-md border border-deep-border bg-deep-surface text-[13px] text-[#eceff1]">{result}</div>}
          {loading && !status && <p className="text-[#6b8fa8] text-[13px]">Loading...</p>}
          {status && (
            <div className="space-y-4">
              <div className="bg-deep-surface border border-deep-border rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[14px] text-[#eceff1]">{status.branch}</span>
                  {status.isDirty && <span className="text-[11px] font-mono text-[#ffa726]">dirty</span>}
                  {status.ahead > 0 && <span className="text-[11px] font-mono text-green-400">+{status.ahead} ahead</span>}
                  {status.behind > 0 && <span className="text-[11px] font-mono text-[#ffa726]">-{status.behind} behind</span>}
                </div>
                <div className="flex gap-6 text-[12px]">
                  <div><span className="text-[#6b8fa8]">Staged</span> <span className="text-[#eceff1] font-mono ml-1">{status.staged}</span></div>
                  <div><span className="text-[#6b8fa8]">Modified</span> <span className="text-[#eceff1] font-mono ml-1">{status.modified}</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-[13px] text-[#8eafc4] mb-2">Commits</h3>
                <div className="space-y-1">
                  {status.recentCommits.map((c, i) => (
                    <div key={c.hash} className="bg-deep-surface border border-deep-border rounded-md px-4 py-2.5">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-[#4a7a96] mt-0.5 flex-shrink-0">{c.hash}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#eceff1] truncate">{c.message}</p>
                          <p className="text-[11px] text-[#4a7a96] font-mono mt-0.5">{c.author} · {new Date(c.date).toLocaleString()}</p>
                        </div>
                        {i === 0 && <span className="text-[10px] font-mono text-accent flex-shrink-0">HEAD</span>}
                      </div>
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
