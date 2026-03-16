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
    <div className="flex min-h-screen bg-zinc-950">
      <Sidebar />
      <div className="flex-1 ml-[240px]">
        <TopBar />
        <main className="pt-[48px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-medium text-white">Instances</h2>
            <button
              onClick={() => setShowCreate(true)}
              disabled={prodNotDeployed}
              className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150"
            >
              New instance
            </button>
          </div>

          {prodNotDeployed && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4 mb-5">
              <p className="text-[13px] text-zinc-400">
                Production is not deployed yet.{' '}
                <Link href="/setup" className="text-accent hover:text-accent-hover">Go to Setup</Link>
              </p>
            </div>
          )}

          {loading && !instances && <p className="text-zinc-500 text-[13px]">Loading...</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {instances?.map((inst) => (
              <InstanceCard key={inst.name} instance={inst} onRefresh={refresh} />
            ))}
          </div>

          {instances?.length === 0 && !prodNotDeployed && (
            <p className="text-zinc-600 text-[13px] py-12 text-center">No instances. Create one to get started.</p>
          )}
        </main>
      </div>

      {showCreate && <CreateInstanceModal onClose={() => setShowCreate(false)} onCreated={refresh} />}
    </div>
  );
}
