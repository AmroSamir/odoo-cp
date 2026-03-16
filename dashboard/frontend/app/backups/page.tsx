'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import ConfirmModal from '@/components/common/ConfirmModal';
import { usePolling } from '@/lib/usePolling';
import type { Backup } from '@/types';
import api from '@/lib/api';

export default function BackupsPage() {
  const { data: backups, loading, refresh } = usePolling<Backup[]>('/backups', 15000);
  const [creating, setCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const handleCreate = async () => { setCreating(true); try { await api.post('/backups'); refresh(); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); } finally { setCreating(false); } };
  const handleDelete = async () => { if (!deleteTarget) return; try { await api.delete(`/backups/${deleteTarget}`); setDeleteTarget(null); refresh(); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); } };

  return (
    <div className="flex min-h-screen bg-page-bg">
      <Sidebar />
      <div className="flex-1 ml-[240px]"><TopBar />
        <main className="pt-[48px] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[16px] font-medium text-[#1e293b]">Backups</h2>
            <button onClick={handleCreate} disabled={creating} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">{creating ? 'Creating...' : 'Create backup'}</button>
          </div>
          {loading && !backups && <p className="text-[#64748b] text-[13px]">Loading...</p>}
          {backups?.length === 0 && <p className="text-[#94a3b8] text-[13px]">No backups found.</p>}
          <div className="space-y-1">
            {backups?.map((b) => (
              <div key={b.filename} className="flex items-center gap-4 bg-page-surface border border-page-border rounded-md px-4 py-2.5 text-[12px]">
                <span className="font-mono text-[#1e293b] flex-1 truncate">{b.filename}</span>
                <span className="text-[#64748b] font-mono">{b.sizeMB} MB</span>
                <span className="text-[#94a3b8] font-mono">{new Date(b.createdAt).toLocaleString()}</span>
                <button onClick={() => setDeleteTarget(b.filename)} className="text-[#94a3b8] hover:text-red-600 transition-colors duration-150">Delete</button>
              </div>
            ))}
          </div>
        </main>
      </div>
      {deleteTarget && <ConfirmModal title="Delete backup?" message={`Permanently delete ${deleteTarget}.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
