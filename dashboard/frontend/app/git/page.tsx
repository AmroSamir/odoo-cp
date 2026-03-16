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

  const handlePull = async () => {
    setPulling(true);
    setResult(null);
    try {
      const res = await api.post<{ summary: { changes: number } }>('/git/pull');
      setResult(`Pulled. ${res.data.summary?.changes || 0} file(s) changed.`);
      refresh();
    } catch (err: any) {
      setResult('Failed: ' + (err.response?.data?.error || err.message));
    } finally { setPulling(false); }
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <TopBar />
        <main className="pt-[48px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-medium text-white">Git</h2>
            <button onClick={handlePull} disabled={pulling}
              className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">
              {pulling ? 'Pulling...' : 'Pull latest'}
            </button>
          </div>

          {result && <div className="mb-4 p-3 rounded-md border border-zinc-800 bg-zinc-900 text-[13px] text-zinc-300">{result}</div>}
          {loading && !status && <p className="text-zinc-500 text-[13px]">Loading...</p>}

          {status && (
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono text-[14px] text-white">{status.branch}</span>
                  {status.isDirty && <span className="text-[11px] font-mono text-yellow-400">dirty</span>}
                  {status.ahead > 0 && <span className="text-[11px] font-mono text-green-400">+{status.ahead} ahead</span>}
                  {status.behind > 0 && <span className="text-[11px] font-mono text-yellow-400">-{status.behind} behind</span>}
                </div>
                <div className="flex gap-6 text-[12px]">
                  <div><span className="text-zinc-500">Staged</span> <span className="text-white font-mono ml-1">{status.staged}</span></div>
                  <div><span className="text-zinc-500">Modified</span> <span className="text-white font-mono ml-1">{status.modified}</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-[13px] text-zinc-400 mb-2">Commits</h3>
                <div className="space-y-1">
                  {status.recentCommits.map((c, i) => (
                    <div key={c.hash} className="bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5">
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-zinc-600 mt-0.5 flex-shrink-0">{c.hash}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-white truncate">{c.message}</p>
                          <p className="text-[11px] text-zinc-600 font-mono mt-0.5">{c.author} · {new Date(c.date).toLocaleString()}</p>
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
