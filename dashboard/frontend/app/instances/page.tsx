'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import InstanceCard from '@/components/instances/InstanceCard';
import CreateInstanceModal from '@/components/instances/CreateInstanceModal';
import { usePolling } from '@/lib/usePolling';
import api from '@/lib/api';
import type { Instance, SetupStatus } from '@/types';

export default function InstancesPage() {
  const { data: instances, loading, refresh } = usePolling<Instance[]>('/instances', 8000);
  const [showCreate, setShowCreate] = useState(false);
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);

  useEffect(() => {
    api.get('/setup/status').then((res) => setSetupStatus(res.data)).catch(() => null);
  }, []);

  const prodNotDeployed = setupStatus !== null && !setupStatus.productionDeployed;

  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar />
      <div className="flex-1 ml-[var(--sidebar-width)]">
        <TopBar />
        <main className="pt-[var(--topbar-height)] p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-white">Instances</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">Manage production and staging Odoo instances</p>
            </div>
            <div className="relative group">
              <button
                onClick={() => setShowCreate(true)}
                disabled={prodNotDeployed}
                className="flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-accent hover:bg-accent-glow text-white font-medium transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Instance
              </button>
              {prodNotDeployed && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-elevated text-[11px] text-gray-300 rounded-lg px-3 py-2 border border-subtle hidden group-hover:block z-20 shadow-xl">
                  Deploy production first from the Setup page
                </div>
              )}
            </div>
          </div>

          {/* Production not deployed banner */}
          {prodNotDeployed && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-5 mb-6 animate-slide-up">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-400">Production not deployed</h3>
                  <p className="text-[12px] text-gray-400 mt-1 mb-3">
                    Deploy production Odoo before creating staging instances.
                  </p>
                  <Link
                    href="/setup"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent-glow hover:text-white transition-colors"
                  >
                    Go to Setup
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && !instances && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-3.5 h-3.5 border-2 border-subtle border-t-gray-400 rounded-full animate-spin" />
              Loading instances...
            </div>
          )}

          {/* Instance grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
            {instances?.map((inst) => (
              <div key={inst.name} className="animate-slide-up">
                <InstanceCard instance={inst} onRefresh={refresh} />
              </div>
            ))}
          </div>

          {/* Empty state */}
          {instances?.length === 0 && !prodNotDeployed && (
            <div className="text-center py-20 dot-grid rounded-xl border border-subtle animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-elevated border border-subtle flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No instances found</p>
              <p className="text-gray-600 text-[12px] mt-1">Create a staging instance to get started</p>
            </div>
          )}
        </main>
      </div>

      {showCreate && (
        <CreateInstanceModal
          onClose={() => setShowCreate(false)}
          onCreated={refresh}
        />
      )}
    </div>
  );
}
