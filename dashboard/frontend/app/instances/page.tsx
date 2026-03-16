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
  useEffect(() => { api.get('/setup/status').then((r) => setSetupStatus(r.data)).catch(() => null); }, []);
  const prodNotDeployed = setupStatus !== null && !setupStatus.productionDeployed;

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-[260px]"><TopBar title="Instances" />
        <main className="pt-[60px] p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[14px] text-txt-muted">Manage your Odoo instances</p>
            </div>
            <button onClick={() => setShowCreate(true)} disabled={prodNotDeployed} className="px-4 py-2.5 text-[13px] rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New instance
            </button>
          </div>
          {prodNotDeployed && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <p className="text-[14px] text-amber-700">Production is not deployed yet. <Link href="/setup" className="text-accent font-medium hover:underline">Go to Setup</Link></p>
            </div>
          )}
          {loading && !instances && <p className="text-txt-muted text-[14px]">Loading...</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{instances?.map((i) => <InstanceCard key={i.name} instance={i} onRefresh={refresh} />)}</div>
          {instances?.length === 0 && !prodNotDeployed && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-page-bg border border-page-border flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-txt-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                </svg>
              </div>
              <p className="text-txt-muted text-[14px]">No instances yet</p>
              <p className="text-txt-faint text-[13px] mt-1">Create one to get started</p>
            </div>
          )}
        </main>
      </div>
      {showCreate && <CreateInstanceModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
    </div>
  );
}
