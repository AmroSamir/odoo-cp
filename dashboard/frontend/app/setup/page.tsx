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

    // POST via fetch with SSE streaming — setup route uses POST with SSE response
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
                  // Refresh status
                  api.get('/setup/status').then((r) => setStatus(r.data)).catch(() => null);
                }
              } else if (data.type === 'error') {
                setDeployResult({ success: false, message: data.message });
                setDeploying(false);
              }
            } catch {
              // ignore parse errors
            }
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
      <div className="flex min-h-screen bg-gray-950">
        <Sidebar />
        <div className="flex-1 ml-[220px]">
          <TopBar />
          <main className="pt-14 p-6">
            <div className="text-gray-500 text-sm">Loading setup status...</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
        <TopBar />
        <main className="pt-14 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Production Setup</h2>
            <p className="text-sm text-gray-500 mt-0.5">Deploy Odoo 19 Enterprise to your server</p>
          </div>

          {status?.productionDeployed ? (
            /* Already deployed */
            <div className="bg-gray-900 border border-green-800/50 rounded-lg p-6 max-w-xl">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-3 h-3 rounded-full bg-green-500" />
                <h3 className="font-semibold text-white">Production is Running</h3>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Production Odoo is deployed at{' '}
                <a
                  href={`https://${status.domainProd}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-odoo-light hover:underline"
                >
                  https://{status.domainProd}
                </a>
              </p>
              <Link
                href="/instances"
                className="inline-block px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium transition-colors"
              >
                Go to Instances
              </Link>
            </div>
          ) : (
            /* Setup form */
            <div className="max-w-xl">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-white mb-4">Deploy Production Odoo</h3>
                <p className="text-sm text-gray-400 mb-6">
                  This will download Odoo Enterprise addons (~900 MB), configure Docker, set up SSL,
                  and start your production Odoo instance.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Production Domain <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="erp.example.com"
                      disabled={deploying}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-white placeholder-gray-600 focus:border-odoo-purple focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Staging Base Domain
                    </label>
                    <input
                      type="text"
                      value={stagingDomain}
                      onChange={(e) => setStagingDomain(e.target.value)}
                      placeholder={domain ? `staging.${domain}` : 'staging.erp.example.com'}
                      disabled={deploying}
                      className="w-full px-3 py-2 bg-gray-950 border border-gray-700 rounded text-sm text-white placeholder-gray-600 focus:border-odoo-purple focus:outline-none disabled:opacity-50"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Optional. Defaults to staging.{domain || 'your-domain'}
                    </p>
                  </div>

                  <button
                    onClick={handleDeploy}
                    disabled={!domain || deploying}
                    className="w-full px-4 py-2.5 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium disabled:opacity-50 transition-colors"
                  >
                    {deploying ? 'Deploying...' : 'Deploy Production'}
                  </button>
                </div>
              </div>

              {/* Deploy log */}
              {(logs.length > 0 || deploying) && (
                <div className="bg-gray-950 border border-gray-800 rounded-lg overflow-hidden mb-6">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900">
                    <span className="text-xs font-medium text-gray-300">
                      {deploying ? 'Deploying production...' : 'Deploy log'}
                    </span>
                    {deploying && (
                      <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                    )}
                  </div>
                  <div ref={logRef} className="p-4 font-mono text-xs text-green-300 h-64 overflow-y-auto">
                    {logs.map((line, i) => (
                      <div key={i} className="whitespace-pre-wrap">{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result */}
              {deployResult && (
                <div className={`border rounded-lg p-4 ${
                  deployResult.success
                    ? 'bg-green-950/30 border-green-800/50'
                    : 'bg-red-950/30 border-red-800/50'
                }`}>
                  <p className={`text-sm font-medium ${deployResult.success ? 'text-green-400' : 'text-red-400'}`}>
                    {deployResult.message}
                  </p>
                  {deployResult.success && (
                    <div className="mt-3 text-sm text-gray-400">
                      <p className="font-medium text-gray-300 mb-2">Next steps:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Go to <a href={`https://${domain}/web/database/manager`} target="_blank" rel="noopener noreferrer" className="text-odoo-light hover:underline">https://{domain}/web/database/manager</a></li>
                        <li>Create a database (name MUST be lowercase)</li>
                        <li>Install the <strong>odoo_unlimited</strong> addon</li>
                        <li>Install Accounting</li>
                        <li>Register with any code (e.g. abc123456)</li>
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
