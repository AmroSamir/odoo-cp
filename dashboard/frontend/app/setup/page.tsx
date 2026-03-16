'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import DeployDrawer from '@/components/common/DeployDrawer';
import api from '@/lib/api';
import type { SetupStatus } from '@/types';

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [stagingDomain, setStagingDomain] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => { api.get('/setup/status').then((r) => setStatus(r.data)).catch(() => null).finally(() => setLoading(false)); }, []);

  const handleDeploy = () => {
    if (!domain) return;
    setDeploying(true); setLogs([]); setDeployResult(null); setDrawerOpen(true);
    fetch('/api/setup/production', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ domain, stagingDomain: stagingDomain || undefined }) })
      .then(async (res) => {
        const reader = res.body?.getReader(); if (!reader) return;
        const decoder = new TextDecoder(); let buffer = '';
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          buffer += decoder.decode(value, { stream: true }); const lines = buffer.split('\n'); buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const d = JSON.parse(line.slice(6));
              if (d.type === 'log' || d.type === 'start') setLogs((p) => [...p, d.message]);
              else if (d.type === 'done') { setDeployResult({ success: d.success, message: d.message }); setDeploying(false); if (d.success) api.get('/setup/status').then((r) => setStatus(r.data)).catch(() => null); }
              else if (d.type === 'error') { setDeployResult({ success: false, message: d.message }); setDeploying(false); }
            } catch {}
          }
        }
      }).catch(() => { setLogs((p) => [...p, '', '--- Connection lost ---']); setDeployResult({ success: false, message: 'Connection lost. Refresh to check status.' }); setDeploying(false); });
  };

  const inputCls = "w-full bg-page-bg border border-page-border rounded-lg px-4 py-3 text-[14px] text-txt-primary placeholder-txt-faint disabled:opacity-50";

  if (loading) return <div className="flex min-h-screen bg-page-bg"><Sidebar /><div className="flex-1 ml-[260px]"><TopBar title="Setup" /><main className="pt-[60px] p-6"><p className="text-txt-muted text-[14px]">Loading...</p></main></div></div>;

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-[260px]"><TopBar title="Setup" />
        <main className="pt-[60px] p-6">
          {status?.productionDeployed ? (
            <div className="bg-page-surface border border-page-border rounded-xl p-6 max-w-lg shadow-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[15px] text-txt-primary font-semibold">Production is running</p>
                  <p className="text-[13px] text-txt-muted">Deployed at <a href={`https://${status.domainProd}`} target="_blank" rel="noopener noreferrer" className="text-accent font-mono text-[12px] hover:underline">{status.domainProd}</a></p>
                </div>
              </div>
              <Link href="/instances" className="text-[14px] text-accent font-medium hover:underline">Go to Instances</Link>
            </div>
          ) : (
            <div className="max-w-lg">
              <p className="text-[14px] text-txt-muted mb-6">Configure and deploy your production Odoo instance</p>
              <div className="bg-page-surface border border-page-border rounded-xl p-6 shadow-card">
                <h3 className="text-[15px] text-txt-primary font-semibold mb-5">Deploy production Odoo</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] text-txt-secondary font-medium mb-1.5">Production domain</label>
                    <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="erp.example.com" disabled={deploying} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-[13px] text-txt-secondary font-medium mb-1.5">Staging domain (optional)</label>
                    <input type="text" value={stagingDomain} onChange={(e) => setStagingDomain(e.target.value)} placeholder={domain ? `staging.${domain}` : 'staging.erp.example.com'} disabled={deploying} className={inputCls} />
                  </div>
                  <button onClick={handleDeploy} disabled={!domain || deploying} className="w-full py-3 text-[14px] rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">{deploying ? 'Deploying...' : 'Deploy'}</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <DeployDrawer open={drawerOpen} title="setup-production.sh" logs={logs} deploying={deploying} result={deployResult} onClose={() => { setDrawerOpen(false); setDeploying(false); }}>
        {deployResult?.success && (
          <div className="mt-3 text-[12px] text-gray-400">
            <p className="mb-1 font-medium">Next steps:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-gray-500">
              <li>Create database at <a href={`https://${domain}/web/database/manager`} target="_blank" className="text-blue-400 font-mono text-[11px]">{domain}</a> (lowercase)</li>
              <li>Install odoo_unlimited</li><li>Install Accounting</li><li>Register with any code</li>
            </ol>
          </div>
        )}
      </DeployDrawer>
    </div>
  );
}
