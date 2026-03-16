'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import api from '@/lib/api';
import type { SetupStatus } from '@/types';

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [domain, setDomain] = useState('');
  const [stagingDomain, setStagingDomain] = useState('');
  const [deploying, setDeploying] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [deployResult, setDeployResult] = useState<{ success: boolean; message: string } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/setup/status')
      .then((res) => setStatus(res.data))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  const handleDeploy = () => {
    if (!domain) return;
    setDeploying(true);
    setLogs([]);
    setDeployResult(null);

    fetch('/api/setup/production', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ domain, stagingDomain: stagingDomain || undefined }),
    }).then(async (res) => {
      const reader = res.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'log' || data.type === 'start') {
                setLogs((prev) => [...prev, data.message]);
              } else if (data.type === 'done') {
                setDeployResult({ success: data.success, message: data.message });
                setDeploying(false);
                if (data.success) {
                  api.get('/setup/status').then((r) => setStatus(r.data)).catch(() => null);
                }
              } else if (data.type === 'error') {
                setDeployResult({ success: false, message: data.message });
                setDeploying(false);
              }
            } catch { /* ignore */ }
          }
        }
      }
    }).catch((err) => {
      setDeployResult({ success: false, message: err.message || 'Connection failed' });
      setDeploying(false);
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-void">
        <Sidebar />
        <div className="flex-1 ml-[var(--sidebar-width)]">
          <TopBar />
          <main className="pt-[var(--topbar-height)] p-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-3.5 h-3.5 border-2 border-subtle border-t-gray-400 rounded-full animate-spin" />
              Loading...
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar />
      <div className="flex-1 ml-[var(--sidebar-width)]">
        <TopBar />
        <main className="pt-[var(--topbar-height)] p-6">
          <div className="mb-6 animate-fade-in">
            <h2 className="text-lg font-semibold text-white">Production Setup</h2>
            <p className="text-[12px] text-gray-500 mt-0.5">Deploy Odoo 19 Enterprise to your server</p>
          </div>

          {status?.productionDeployed ? (
            /* Already deployed */
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-6 max-w-xl animate-slide-up">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-semibold text-white">Production is Running</h3>
              </div>
              <p className="text-[13px] text-gray-400 mb-4 ml-11">
                Deployed at{' '}
                <a href={`https://${status.domainProd}`} target="_blank" rel="noopener noreferrer"
                  className="text-accent-glow hover:underline font-mono text-[12px]">
                  https://{status.domainProd}
                </a>
              </p>
              <div className="ml-11">
                <Link href="/instances"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] rounded-lg bg-accent hover:bg-accent-glow text-white font-medium transition-all duration-150">
                  Go to Instances
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ) : (
            /* Setup form */
            <div className="max-w-xl animate-slide-up">
              <div className="bg-surface border border-subtle rounded-xl p-6 mb-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-accent-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Deploy Production Odoo</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">Downloads addons, configures Docker, sets up SSL</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-300 mb-1.5">
                      Production Domain <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="erp.example.com"
                      disabled={deploying}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-medium text-gray-300 mb-1.5">
                      Staging Base Domain
                      <span className="text-gray-600 font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={stagingDomain}
                      onChange={(e) => setStagingDomain(e.target.value)}
                      placeholder={domain ? `staging.${domain}` : 'staging.erp.example.com'}
                      disabled={deploying}
                      className="input-field"
                    />
                    <p className="text-[10px] text-gray-600 mt-1.5 font-mono">
                      Defaults to staging.{domain || 'your-domain'}
                    </p>
                  </div>

                  <button
                    onClick={handleDeploy}
                    disabled={!domain || deploying}
                    className="w-full py-2.5 text-[13px] rounded-lg bg-accent hover:bg-accent-glow text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {deploying ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Deploying...
                      </span>
                    ) : 'Deploy Production'}
                  </button>
                </div>
              </div>

              {/* Deploy log */}
              {(logs.length > 0 || deploying) && (
                <div className="bg-void border border-subtle rounded-xl overflow-hidden mb-6">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-subtle bg-surface">
                    <div className="flex items-center gap-2.5">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500/60" />
                        <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
                        <div className="w-2 h-2 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-[11px] font-mono text-gray-400">setup-production.sh</span>
                    </div>
                    {deploying && <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-glow" />}
                  </div>
                  <div ref={logRef} className="p-4 font-mono text-[11px] leading-[1.7] text-green-300/90 h-64 overflow-y-auto relative">
                    <div className="absolute inset-0 scanlines" />
                    {logs.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap relative z-10">
                        <span className="text-gray-700 select-none mr-3">{String(i + 1).padStart(3, ' ')}</span>
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result */}
              {deployResult && (
                <div className={`border rounded-xl p-5 animate-slide-up ${
                  deployResult.success
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      deployResult.success ? 'bg-green-500/15' : 'bg-red-500/15'
                    }`}>
                      {deployResult.success ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${deployResult.success ? 'text-green-400' : 'text-red-400'}`}>
                        {deployResult.message}
                      </p>
                      {deployResult.success && (
                        <div className="mt-3 text-[12px] text-gray-400">
                          <p className="font-medium text-gray-300 mb-2">Next steps:</p>
                          <ol className="list-decimal list-inside space-y-1.5 text-gray-500">
                            <li>Go to <a href={`https://${domain}/web/database/manager`} target="_blank" rel="noopener noreferrer" className="text-accent-glow hover:underline font-mono text-[11px]">https://{domain}/web/database/manager</a></li>
                            <li>Create a database <span className="text-yellow-500/80">(name MUST be lowercase)</span></li>
                            <li>Install the <span className="text-white font-medium">odoo_unlimited</span> addon</li>
                            <li>Install Accounting</li>
                            <li>Register with any code (e.g. abc123456)</li>
                          </ol>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
