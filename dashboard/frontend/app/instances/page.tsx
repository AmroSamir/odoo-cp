'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import InstanceCard from '@/components/instances/InstanceCard';
import CreateInstanceModal from '@/components/instances/CreateInstanceModal';
import { usePolling } from '@/lib/usePolling';
import type { Instance } from '@/types';

export default function InstancesPage() {
  const { data: instances, loading, refresh } = usePolling<Instance[]>('/instances', 8000);
  const [showCreate, setShowCreate] = useState(false);

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
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium transition-colors"
            >
              + New Staging Instance
            </button>
          </div>

          {loading && !instances && (
            <div className="text-gray-500 text-sm">Loading instances...</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {instances?.map((inst) => (
              <InstanceCard key={inst.name} instance={inst} onRefresh={refresh} />
            ))}
          </div>

          {instances?.length === 0 && (
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
