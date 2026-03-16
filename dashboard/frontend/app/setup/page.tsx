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

  const inputCls = "w-full bg-page-bg border border-page-border rounded-md px-3 py-2 text-[13px] text-[#f0f0f0] placeholder-[#94a3b8] disabled:opacity-50";

  if (loading) return <div className="flex min-h-screen bg-page-bg"><Sidebar /><div className="flex-1 ml-[240px]"><TopBar /><main className="pt-[48px] p-6"><p className="text-[#6a6a75] text-[13px]">Loading...</p></main></div></div>;

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-[240px]"><TopBar />
        <main className="pt-[48px] p-6">
          <h2 className="text-[16px] font-medium text-[#f0f0f0] mb-5">Setup</h2>
          {status?.productionDeployed ? (
            <div className="bg-page-surface border border-page-border rounded-md p-5 max-w-lg">
              <p className="text-[14px] text-[#f0f0f0] mb-1">Production is running</p>
              <p className="text-[13px] text-[#8a8a95] mb-3">Deployed at <a href={`https://${status.domainProd}`} target="_blank" rel="noopener noreferrer" className="text-accent hover:accent font-mono text-[12px]">{status.domainProd}</a></p>
              <Link href="/instances" className="text-[13px] text-accent hover:accent">Go to Instances</Link>
            </div>
          ) : (
            <div className="max-w-lg">
              <div className="bg-page-surface border border-page-border rounded-md p-5">
                <p className="text-[14px] text-[#f0f0f0] mb-4">Deploy production Odoo</p>
                <div className="space-y-3">
                  <div><label className="block text-[13px] text-[#8a8a95] mb-1">Production domain</label><input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="erp.example.com" disabled={deploying} className={inputCls} /></div>
                  <div><label className="block text-[13px] text-[#8a8a95] mb-1">Staging domain (optional)</label><input type="text" value={stagingDomain} onChange={(e) => setStagingDomain(e.target.value)} placeholder={domain ? `staging.${domain}` : 'staging.erp.example.com'} disabled={deploying} className={inputCls} /></div>
                  <button onClick={handleDeploy} disabled={!domain || deploying} className="w-full py-2 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-[#0e0e10] font-medium disabled:opacity-30 transition-colors duration-150">{deploying ? 'Deploying...' : 'Deploy'}</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <DeployDrawer open={drawerOpen} title="setup-production.sh" logs={logs} deploying={deploying} result={deployResult} onClose={() => { setDrawerOpen(false); setDeploying(false); }}>
        {deployResult?.success && (
          <div className="mt-2 text-[12px] text-[#4a4a55]">
            <p className="mb-1">Next:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-[#6a6a75]">
              <li>Create database at <a href={`https://${domain}/web/database/manager`} target="_blank" className="text-[#0ea5e9] font-mono text-[11px]">{domain}</a> (lowercase)</li>
              <li>Install odoo_unlimited</li><li>Install Accounting</li><li>Register with any code</li>
            </ol>
          </div>
        )}
      </DeployDrawer>
    </div>
  );
}
