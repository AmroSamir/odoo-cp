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
  const [pullResult, setPullResult] = useState<string | null>(null);

  const handlePull = async () => {
    setPulling(true);
    setPullResult(null);
    try {
      const res = await api.post<{ summary: { changes: number } }>('/git/pull');
      setPullResult(`Pulled successfully. ${res.data.summary?.changes || 0} file(s) changed.`);
      refresh();
    } catch (err: any) {
      setPullResult('Pull failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setPulling(false);
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
              <h2 className="text-lg font-semibold text-white">Git</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Repository status and code synchronization</p>
            </div>
            <button
              onClick={handlePull}
              disabled={pulling}
              className="flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-accent hover:bg-accent-glow text-white font-medium disabled:opacity-40 transition-all duration-150"
            >
              {pulling ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Pulling...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  Pull Latest
                </>
              )}
            </button>
          </div>

          {pullResult && (
            <div className="mb-5 p-3.5 rounded-lg border border-subtle bg-surface text-[12px] text-gray-300 animate-slide-up">
              {pullResult}
            </div>
          )}

          {loading && !status && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-3.5 h-3.5 border-2 border-subtle border-t-gray-400 rounded-full animate-spin" />
              Loading git status...
            </div>
          )}

          {status && (
            <div className="space-y-5 animate-slide-up">
              {/* Branch + status */}
              <div className="bg-surface border border-subtle rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-elevated flex items-center justify-center">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <span className="font-mono text-white font-semibold text-sm">{status.branch}</span>
                  <div className="flex gap-2">
                    {status.isDirty && (
                      <span className="text-[10px] font-mono font-semibold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-md tracking-wider">
                        DIRTY
                      </span>
                    )}
                    {status.ahead > 0 && (
                      <span className="text-[10px] font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded-md">
                        +{status.ahead} ahead
                      </span>
                    )}
                    {status.behind > 0 && (
                      <span className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-md">
                        -{status.behind} behind
                      </span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[12px] ml-11">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Staged</span>
                    <span className="font-mono text-white bg-elevated px-2 py-0.5 rounded-md">{status.staged}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Modified</span>
                    <span className="font-mono text-white bg-elevated px-2 py-0.5 rounded-md">{status.modified}</span>
                  </div>
                </div>
              </div>

              {/* Recent commits */}
              <div>
                <h3 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Recent Commits</h3>
                <div className="space-y-1.5 stagger">
                  {status.recentCommits.map((commit, i) => (
                    <div
                      key={commit.hash}
                      className={`bg-surface border rounded-lg px-5 py-3.5 card-hover animate-slide-up ${
                        i === 0 ? 'border-accent/20' : 'border-subtle'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[10px] text-gray-600 mt-1 flex-shrink-0 tabular-nums">{commit.hash}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-white truncate">{commit.message}</p>
                          <p className="text-[11px] text-gray-600 mt-1 font-mono">
                            {commit.author} · {new Date(commit.date).toLocaleString()}
                          </p>
                        </div>
                        {i === 0 && (
                          <span className="text-[9px] font-mono font-bold bg-accent/15 text-accent-glow px-1.5 py-0.5 rounded-md tracking-widest flex-shrink-0">
                            HEAD
                          </span>
                        )}
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
