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

  const statusColor: Record<string, string> = {
    success: 'text-green-400',
    failed: 'text-red-400',
    started: 'text-yellow-400',
  };

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
        <TopBar />
        <main className="pt-14 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Deploy</h2>
            <p className="text-sm text-gray-500 mt-0.5">Deploy code changes to staging or production</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Deploy to staging */}
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-1">Staging</h3>
              <p className="text-sm text-gray-500 mb-4">Pull latest code and rebuild all running staging instances.</p>
              <button
                onClick={() => handleDeploy('staging')}
                disabled={!!deploying}
                className="px-4 py-2 text-sm rounded bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 transition-colors"
              >
                {deploying === 'staging' ? 'Deploying...' : '⬆ Deploy to Staging'}
              </button>
            </div>

            {/* Deploy to production */}
            <div className="bg-gray-900 border border-odoo-purple/30 rounded-lg p-6">
              <h3 className="font-semibold text-white mb-1">Production</h3>
              {prodNotDeployed ? (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Production Odoo has not been deployed yet. Set it up first.
                  </p>
                  <Link
                    href="/setup"
                    className="inline-block px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium transition-colors"
                  >
                    Go to Setup
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 mb-4">
                    Pull latest code, backup database, and rebuild production. Requires confirmation.
                  </p>
                  <button
                    onClick={() => setConfirmProd(true)}
                    disabled={!!deploying}
                    className="px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium disabled:opacity-50 transition-colors"
                  >
                    {deploying === 'production' ? 'Deploying...' : '⬆ Deploy to Production'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Deploy log (SSE) */}
          {deploying && logUrl && (
            <DeployLog
              url={logUrl}
              target={deploying}
              onDone={() => { setDeploying(null); refresh(); }}
            />
          )}

          {/* History */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Deploy History</h3>
            {!history?.length ? (
              <p className="text-sm text-gray-600">No deployments yet.</p>
            ) : (
              <div className="space-y-2">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded px-4 py-3 text-sm">
                    <span className={`font-medium ${statusColor[entry.status] || 'text-gray-400'}`}>{entry.status}</span>
                    <span className="text-gray-300 capitalize">{entry.target}</span>
                    <span className="text-gray-500 text-xs">{new Date(entry.startedAt).toLocaleString()}</span>
                    {entry.finishedAt && (
                      <span className="text-gray-600 text-xs ml-auto">
                        {Math.round((new Date(entry.finishedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000)}s
                      </span>
                    )}
                  </div>
                ))}
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
    <div className="mb-8 bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
        <span className="text-xs font-medium text-gray-300">Deploying to {target}...</span>
        {isDone && (
          <button onClick={onDone} className="text-xs text-odoo-light hover:text-white">Close</button>
        )}
      </div>
      <div className="p-4 font-mono text-xs text-green-300 h-48 overflow-y-auto">
        {lines.map((line, i) => <div key={i} className="whitespace-pre-wrap">{line}</div>)}
      </div>
    </div>
  );
}
