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
    <div className="flex min-h-screen bg-arctic-bg">
      <Sidebar />
      <div className="flex-1 ml-[240px]"><TopBar />
        <main className="pt-[48px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-medium text-[#0c4a6e]">Git</h2>
            <button onClick={handlePull} disabled={pulling} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">{pulling ? 'Pulling...' : 'Pull latest'}</button>
          </div>
          {result && <div className="mb-4 p-3 rounded-md border border-arctic-border bg-arctic-surface text-[13px] text-[#0c4a6e]">{result}</div>}
          {loading && !status && <p className="text-[#7a9baa] text-[13px]">Loading...</p>}
          {status && (
            <div className="space-y-4">
              <div className="bg-arctic-surface border border-arctic-border rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[14px] text-[#0c4a6e]">{status.branch}</span>
                  {status.isDirty && <span className="text-[11px] font-mono text-amber-600">dirty</span>}
                  {status.ahead > 0 && <span className="text-[11px] font-mono text-green-600">+{status.ahead} ahead</span>}
                  {status.behind > 0 && <span className="text-[11px] font-mono text-amber-600">-{status.behind} behind</span>}
                </div>
                <div className="flex gap-6 text-[12px]">
                  <div><span className="text-[#7a9baa]">Staged</span> <span className="text-[#0c4a6e] font-mono ml-1">{status.staged}</span></div>
                  <div><span className="text-[#7a9baa]">Modified</span> <span className="text-[#0c4a6e] font-mono ml-1">{status.modified}</span></div>
                </div>
              </div>
              <div>
                <h3 className="text-[13px] text-[#4a7a8a] mb-2">Commits</h3>
                <div className="space-y-1">
                  {status.recentCommits.map((c, i) => (
                    <div key={c.hash} className="bg-arctic-surface border border-arctic-border rounded-md px-4 py-2.5">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-[#94b3c2] mt-0.5 flex-shrink-0">{c.hash}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-[#0c4a6e] truncate">{c.message}</p>
                          <p className="text-[11px] text-[#94b3c2] font-mono mt-0.5">{c.author} · {new Date(c.date).toLocaleString()}</p>
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
