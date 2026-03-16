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
      <div className="flex-1 ml-[260px]"><TopBar title="Deploy" />
        <main className="pt-[60px] p-6">
          <p className="text-[14px] text-txt-muted mb-6">Deploy code to staging or production environments</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-page-surface border border-page-border rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] text-txt-primary font-semibold">Staging</p>
                  <p className="text-[13px] text-txt-muted">Pull code and rebuild staging</p>
                </div>
              </div>
              <button onClick={() => handleDeploy('staging')} disabled={!!deploying} className="w-full mt-3 px-4 py-2.5 text-[13px] rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">Deploy to Staging</button>
            </div>
            <div className="bg-page-surface border border-page-border rounded-xl p-6 shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] text-txt-primary font-semibold">Production</p>
                  {prodNotDeployed ? <p className="text-[13px] text-txt-muted">Not deployed. <Link href="/setup" className="text-accent font-medium">Setup first</Link></p> : <p className="text-[13px] text-txt-muted">Backup, pull, rebuild production</p>}
                </div>
              </div>
              {!prodNotDeployed && <button onClick={() => setConfirmProd(true)} disabled={!!deploying} className="w-full mt-3 px-4 py-2.5 text-[13px] rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-30 transition-colors duration-150">Deploy to Production</button>}
            </div>
          </div>
          <div>
            <h3 className="text-[14px] font-semibold text-txt-primary mb-3">History</h3>
            {!history?.length ? <p className="text-[13px] text-txt-muted">No deployments yet.</p> : (
              <div className="bg-page-surface border border-page-border rounded-xl overflow-hidden shadow-card">
                {history.map((e, i) => (
                  <div key={e.id} className={`flex items-center gap-4 px-5 py-3.5 text-[13px] ${i > 0 ? 'border-t border-page-border' : ''}`}>
                    <span className={`font-medium px-2.5 py-0.5 rounded-full text-[12px] ${e.status === 'success' ? 'bg-emerald-50 text-emerald-600' : e.status === 'failed' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-600'}`}>{e.status}</span>
                    <span className="text-txt-primary font-medium">{e.target}</span>
                    <span className="text-txt-muted font-mono text-[12px]">{new Date(e.startedAt).toLocaleString()}</span>
                    {e.finishedAt && <span className="text-txt-faint font-mono text-[12px] ml-auto">{Math.round((new Date(e.finishedAt).getTime() - new Date(e.startedAt).getTime()) / 1000)}s</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
      {confirmProd && <ConfirmModal title="Deploy to production?" message="This will backup the DB, pull code, and rebuild." confirmText="deploy" confirmLabel="Deploy" onConfirm={() => { setConfirmProd(false); handleDeploy('production'); }} onCancel={() => setConfirmProd(false)} danger={false} />}
      <DeployDrawer open={drawerOpen} title={`deploy-${deploying || 'production'}.sh`} logs={logs} deploying={!!deploying} result={deployResult} onClose={handleCloseDrawer} />
    </div>
  );
}
