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
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
        <TopBar />
        <main className="pt-14 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Git</h2>
              <p className="text-sm text-gray-500 mt-0.5">Repository status and code synchronization</p>
            </div>
            <button
              onClick={handlePull}
              disabled={pulling}
              className="px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium disabled:opacity-50 transition-colors"
            >
              {pulling ? 'Pulling...' : '⬇ Pull Latest'}
            </button>
          </div>

          {pullResult && (
            <div className="mb-4 p-3 rounded border border-gray-700 bg-gray-900 text-sm text-gray-300">
              {pullResult}
            </div>
          )}

          {loading && !status && <p className="text-gray-500 text-sm">Loading git status...</p>}

          {status && (
            <div className="space-y-4">
              {/* Branch + status */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg">⎇</span>
                  <span className="font-mono text-white font-semibold">{status.branch}</span>
                  {status.isDirty && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded">
                      dirty
                    </span>
                  )}
                  {status.ahead > 0 && (
                    <span className="text-xs text-green-400">↑ {status.ahead} ahead</span>
                  )}
                  {status.behind > 0 && (
                    <span className="text-xs text-yellow-400">↓ {status.behind} behind</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Staged:</span>
                    <span className="text-white ml-2">{status.staged}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Modified:</span>
                    <span className="text-white ml-2">{status.modified}</span>
                  </div>
                </div>
              </div>

              {/* Recent commits */}
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Commits</h3>
                <div className="space-y-2">
                  {status.recentCommits.map((commit, i) => (
                    <div key={commit.hash} className={`bg-gray-900 border rounded px-4 py-3 ${i === 0 ? 'border-odoo-purple/30' : 'border-gray-800'}`}>
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs text-gray-500 mt-0.5">{commit.hash}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{commit.message}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {commit.author} · {new Date(commit.date).toLocaleString()}
                          </p>
                        </div>
                        {i === 0 && (
                          <span className="text-xs bg-odoo-purple/20 text-odoo-light px-1.5 py-0.5 rounded flex-shrink-0">HEAD</span>
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
