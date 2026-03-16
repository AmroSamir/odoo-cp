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

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar />
      <div className="flex-1 ml-[220px]">
        <TopBar />
        <main className="pt-14 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">Instances</h2>
              <p className="text-sm text-gray-500 mt-0.5">Manage production and staging Odoo instances</p>
            </div>
            <div className="relative group">
              <button
                onClick={() => setShowCreate(true)}
                disabled={setupStatus !== null && !setupStatus.productionDeployed}
                className="px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + New Staging Instance
              </button>
              {setupStatus !== null && !setupStatus.productionDeployed && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 text-xs text-gray-300 rounded px-3 py-2 hidden group-hover:block z-20">
                  Deploy production first from the Setup page
                </div>
              )}
            </div>
          </div>

          {loading && !instances && (
            <div className="text-gray-500 text-sm">Loading instances...</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {instances?.map((inst) => (
              <InstanceCard key={inst.name} instance={inst} onRefresh={refresh} />
            ))}
          </div>

          {setupStatus !== null && !setupStatus.productionDeployed && (
            <div className="bg-yellow-950/30 border border-yellow-800/50 rounded-lg p-5 mb-6">
              <h3 className="text-sm font-semibold text-yellow-400 mb-1">Production Odoo is not deployed yet</h3>
              <p className="text-sm text-gray-400 mb-3">
                You need to deploy production Odoo before creating staging instances.
              </p>
              <Link
                href="/setup"
                className="inline-block px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium transition-colors"
              >
                Go to Setup
              </Link>
            </div>
          )}

          {instances?.length === 0 && (setupStatus === null || setupStatus.productionDeployed) && (
            <div className="text-center py-20 text-gray-600">
              <p className="text-4xl mb-3">▦</p>
              <p>No instances found. Create a staging instance to get started.</p>
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
