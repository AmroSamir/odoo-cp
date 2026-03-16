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

  useEffect(() => { api.get('/setup/status').then((r) => setSetupStatus(r.data)).catch(() => null); }, []);
  const prodNotDeployed = setupStatus !== null && !setupStatus.productionDeployed;

  const handleDeploy = (target: 'staging' | 'production') => {
    setDeploying(target); setLogs([]); setDeployResult(null); setDrawerOpen(true);
    const es = new EventSource(`/api/deploy/${target}`); esRef.current = es;
    es.onmessage = (e) => { try { const d = JSON.parse(e.data); if (typeof d === 'object' && d?.done) { setDeployResult({ success: d.exitCode === 0, message: d.exitCode === 0 ? `Deployed to ${target}` : `Deploy failed` }); setDeploying(null); refresh(); es.close(); } else if (typeof d === 'object' && d?.line) setLogs((p) => [...p, d.line]); else setLogs((p) => [...p, String(d)]); } catch { setLogs((p) => [...p, e.data]); } };
    es.onerror = () => { setDeploying(null); setLogs((p) => [...p, '', '--- Connection lost ---']); if (!deployResult) setDeployResult({ success: false, message: 'Connection lost.' }); es.close(); };
  };
  const handleCloseDrawer = () => { esRef.current?.close(); esRef.current = null; setDrawerOpen(false); setDeploying(null); };

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-[240px]"><TopBar />
        <main className="pt-[48px] p-6">
          <h2 className="text-[16px] font-medium text-[#f0f0f0] mb-5">Deploy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            <div className="bg-page-surface border border-page-border rounded-md p-5">
              <p className="text-[14px] text-[#f0f0f0] mb-1">Staging</p>
              <p className="text-[12px] text-[#6a6a75] mb-3">Pull code and rebuild staging.</p>
              <button onClick={() => handleDeploy('staging')} disabled={!!deploying} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-[#0e0e10] font-medium disabled:opacity-30 transition-colors duration-150">Deploy</button>
            </div>
            <div className="bg-page-surface border border-page-border rounded-md p-5">
              <p className="text-[14px] text-[#f0f0f0] mb-1">Production</p>
              {prodNotDeployed ? <p className="text-[12px] text-[#6a6a75]">Not deployed. <Link href="/setup" className="text-accent">Setup first</Link></p> : (
                <><p className="text-[12px] text-[#6a6a75] mb-3">Backup, pull, rebuild production.</p>
                <button onClick={() => setConfirmProd(true)} disabled={!!deploying} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-[#0e0e10] font-medium disabled:opacity-30 transition-colors duration-150">Deploy</button></>
              )}
            </div>
          </div>
          <div>
            <h3 className="text-[13px] text-[#8a8a95] mb-2">History</h3>
            {!history?.length ? <p className="text-[12px] text-[#4a4a55]">No deployments yet.</p> : (
              <div className="space-y-1">
                {history.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 bg-page-surface border border-page-border rounded-md px-4 py-2.5 text-[12px]">
                    <span className={`font-mono ${e.status === 'success' ? 'text-green-400' : e.status === 'failed' ? 'text-red-400' : 'text-amber-400'}`}>{e.status}</span>
                    <span className="text-[#f0f0f0]">{e.target}</span>
                    <span className="text-[#4a4a55] font-mono">{new Date(e.startedAt).toLocaleString()}</span>
                    {e.finishedAt && <span className="text-[#4a4a55] font-mono ml-auto">{Math.round((new Date(e.finishedAt).getTime() - new Date(e.startedAt).getTime()) / 1000)}s</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      {confirmProd && <ConfirmModal title="Deploy to production?" message="Backup DB, pull code, rebuild." confirmText="deploy" confirmLabel="Deploy" onConfirm={() => { setConfirmProd(false); handleDeploy('production'); }} onCancel={() => setConfirmProd(false)} danger={false} />}
      <DeployDrawer open={drawerOpen} title={`deploy-${deploying || 'production'}.sh`} logs={logs} deploying={!!deploying} result={deployResult} onClose={handleCloseDrawer} />
    </div>
  );
}
