'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ConfirmModal from '@/components/common/ConfirmModal';
import DeployDrawer from '@/components/common/DeployDrawer';
import { usePolling } from '@/lib/usePolling';
import api from '@/lib/api';
import type { DeployHistoryEntry, SetupStatus } from '@/types';

export default function DeployPage() {
  const { data: history, refresh } = usePolling<DeployHistoryEntry[]>('/deploy/history', 10000);
  const [deploying, setDeploying] = useState<null | 'staging' | 'production'>(null);
  const [confirmProd, setConfirmProd] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    api.get('/setup/status').then((res) => setSetupStatus(res.data)).catch(() => null);
  }, []);

  const prodNotDeployed = setupStatus !== null && !setupStatus.productionDeployed;

  const handleDeploy = (target: 'staging' | 'production') => {
    setDeploying(target);
    setLogs([]);
    setDeployResult(null);
    setDrawerOpen(true);

    const es = new EventSource(`/api/deploy/${target}`);
    esRef.current = es;
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof data === 'object' && data?.done) {
          setDeployResult({ success: data.exitCode === 0, message: data.exitCode === 0 ? `Deployed to ${target}` : `Deploy to ${target} failed` });
          setDeploying(null);
          refresh();
          es.close();
        } else if (typeof data === 'object' && data?.line) {
          setLogs((p) => [...p, data.line]);
        } else {
          setLogs((p) => [...p, String(data)]);
        }
      } catch {
        setLogs((p) => [...p, e.data]);
      }
    };
    es.onerror = () => {
      setDeploying(null);
      setLogs((p) => [...p, '', '--- Connection lost ---']);
      if (!deployResult) setDeployResult({ success: false, message: 'Connection lost. Refresh to check status.' });
      es.close();
    };
  };

  const handleCloseDrawer = () => {
    esRef.current?.close();
    esRef.current = null;
    setDrawerOpen(false);
    setDeploying(null);
  };

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <TopBar />
        <main className="pt-[48px] p-6">
          <h2 className="text-[16px] font-medium text-white mb-5">Deploy</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-5">
              <p className="text-[14px] text-white mb-1">Staging</p>
              <p className="text-[12px] text-zinc-500 mb-3">Pull code and rebuild staging instances.</p>
              <button onClick={() => handleDeploy('staging')} disabled={!!deploying}
                className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">
                Deploy
              </button>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-5">
              <p className="text-[14px] text-white mb-1">Production</p>
              {prodNotDeployed ? (
                <p className="text-[12px] text-zinc-500">Not deployed. <Link href="/setup" className="text-accent">Setup first</Link></p>
              ) : (
                <>
                  <p className="text-[12px] text-zinc-500 mb-3">Backup DB, pull code, rebuild production.</p>
                  <button onClick={() => setConfirmProd(true)} disabled={!!deploying}
                    className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">
                    Deploy
                  </button>
                </>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-[13px] text-zinc-400 mb-2">History</h3>
            {!history?.length ? (
              <p className="text-[12px] text-zinc-600">No deployments yet.</p>
            ) : (
              <div className="space-y-1">
                {history.map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-[12px]">
                    <span className={`font-mono ${entry.status === 'success' ? 'text-green-400' : entry.status === 'failed' ? 'text-red-400' : 'text-yellow-400'}`}>{entry.status}</span>
                    <span className="text-zinc-300">{entry.target}</span>
                    <span className="text-zinc-600 font-mono">{new Date(entry.startedAt).toLocaleString()}</span>
                    {entry.finishedAt && <span className="text-zinc-700 font-mono ml-auto">{Math.round((new Date(entry.finishedAt).getTime() - new Date(entry.startedAt).getTime()) / 1000)}s</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {confirmProd && (
        <ConfirmModal title="Deploy to production?" message="This will backup the database, pull code, and rebuild production." confirmText="deploy" confirmLabel="Deploy" onConfirm={() => { setConfirmProd(false); handleDeploy('production'); }} onCancel={() => setConfirmProd(false)} danger={false} />
      )}

      <DeployDrawer open={drawerOpen} title={`deploy-${deploying || 'production'}.sh`} logs={logs} deploying={!!deploying} result={deployResult} onClose={handleCloseDrawer} />
    </div>
  );
}
