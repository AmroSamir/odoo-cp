'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ConfirmModal from '@/components/common/ConfirmModal';
import { usePolling } from '@/lib/usePolling';
import { useSSE } from '@/lib/useSSE';
import api from '@/lib/api';
import type { DeployHistoryEntry, SetupStatus } from '@/types';

export default function DeployPage() {
  const { data: history, refresh } = usePolling<DeployHistoryEntry[]>('/deploy/history', 10000);
  const [deploying, setDeploying] = useState<null | 'staging' | 'production'>(null);
  const [confirmProd, setConfirmProd] = useState(false);
  const [logUrl, setLogUrl] = useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    api.get('/setup/status').then((res) => setSetupStatus(res.data)).catch(() => null);
  }, []);

  const prodNotDeployed = setupStatus !== null && !setupStatus.productionDeployed;

  const handleDeploy = async (target: 'staging' | 'production') => {
    setDeploying(target);
    setLogUrl(`/api/deploy/${target}`);
  };

  const statusConfig: Record<string, { color: string; bg: string }> = {
    success: { color: 'text-green-400', bg: 'bg-green-500/10' },
    failed: { color: 'text-red-400', bg: 'bg-red-500/10' },
    started: { color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  };

  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar />
      <div className="flex-1 ml-[var(--sidebar-width)]">
        <TopBar />
        <main className="pt-[var(--topbar-height)] p-6">
          <div className="mb-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-white">Deploy</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">Deploy code changes to staging or production</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 stagger">
            {/* Staging */}
            <div className="bg-surface border border-subtle rounded-xl p-6 card-hover animate-slide-up">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white">Staging</h3>
              </div>
              <p className="text-[12px] text-gray-500 mb-5 ml-11">Pull latest code and rebuild all running staging instances.</p>
              <div className="ml-11">
                <button
                  onClick={() => handleDeploy('staging')}
                  disabled={!!deploying}
                  className="px-4 py-2 text-[13px] rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-40 transition-all duration-150"
                >
                  {deploying === 'staging' ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Deploying...
                    </span>
                  ) : 'Deploy to Staging'}
                </button>
              </div>
            </div>

            {/* Production */}
            <div className="bg-surface border border-accent/20 rounded-xl p-6 card-hover animate-slide-up">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white">Production</h3>
              </div>
              {prodNotDeployed ? (
                <div className="ml-11">
                  <p className="text-[12px] text-gray-500 mb-4">Production Odoo has not been deployed yet.</p>
                  <Link href="/setup"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-glow hover:text-white transition-colors">
                    Go to Setup
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <>
                  <p className="text-[12px] text-gray-500 mb-5 ml-11">Pull latest code, backup database, and rebuild production.</p>
                  <div className="ml-11">
                    <button
                      onClick={() => setConfirmProd(true)}
                      disabled={!!deploying}
                      className="px-4 py-2 text-[13px] rounded-lg bg-accent hover:bg-accent-glow text-white font-medium disabled:opacity-40 transition-all duration-150"
                    >
                      {deploying === 'production' ? (
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Deploying...
                        </span>
                      ) : 'Deploy to Production'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Deploy log */}
          {deploying && logUrl && (
            <DeployLog url={logUrl} target={deploying} onDone={() => { setDeploying(null); refresh(); }} />
          )}

          {/* History */}
          <div className="animate-fade-in">
            <h3 className="text-[12px] font-semibold text-gray-400 uppercase tracking-wider mb-3">Deploy History</h3>
            {!history?.length ? (
              <p className="text-[12px] text-gray-600">No deployments yet.</p>
            ) : (
              <div className="space-y-1.5">
                {history.map((entry) => {
                  const cfg = statusConfig[entry.status] || { color: 'text-gray-400', bg: 'bg-gray-500/10' };
                  return (
                    <div key={entry.id} className="flex items-center gap-4 bg-surface border border-subtle rounded-lg px-4 py-3 text-[12px]">
                      <span className={`font-mono font-medium px-2 py-0.5 rounded-md ${cfg.color} ${cfg.bg}`}>
                        {entry.status}
                      </span>
                      <span className="text-gray-300 capitalize">{entry.target}</span>
                      <span className="text-gray-600 font-mono text-[11px]">
                        {new Date(entry.startedAt).toLocaleString()}
                      </span>
                      {entry.finishedAt && (
                        <span className="text-gray-700 font-mono text-[11px] ml-auto">
                          {Math.round((new Date(entry.finishedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000)}s
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {confirmProd && (
        <ConfirmModal
          title="Deploy to Production?"
          message="This will backup the database, pull latest code, and rebuild the production Odoo container. Production will briefly restart."
          confirmText="deploy"
          confirmLabel="Deploy to Production"
          onConfirm={() => { setConfirmProd(false); handleDeploy('production'); }}
          onCancel={() => setConfirmProd(false)}
          danger={false}
        />
      )}
    </div>
  );
}

function DeployLog({ url, target, onDone }: { url: string; target: string; onDone: () => void }) {
  const { lines } = useSSE(url);
  const lastLine = lines[lines.length - 1] || '';
  const isDone = typeof lastLine === 'string' && lastLine.includes('"done":true');

  return (
    <div className="mb-8 bg-void border border-subtle rounded-xl overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-subtle bg-surface">
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/60" />
            <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
            <div className="w-2 h-2 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] font-mono text-gray-400">deploy-{target}.sh</span>
          {!isDone && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-glow" />}
        </div>
        {isDone && (
          <button onClick={onDone} className="text-[11px] text-accent-glow hover:text-white font-medium transition-colors">
            Close
          </button>
        )}
      </div>
      <div className="p-4 font-mono text-[11px] text-green-300/90 h-48 overflow-y-auto relative">
        <div className="absolute inset-0 scanlines" />
        {lines.map((line, i) => (
          <div key={i} className="whitespace-pre-wrap relative z-10">{line}</div>
        ))}
      </div>
    </div>
  );
}
