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

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.post('/backups');
      refresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Backup failed');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/backups/${deleteTarget}`);
      setDeleteTarget(null);
      refresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const totalSize = backups?.reduce((sum, b) => sum + b.sizeMB, 0) || 0;

  return (
    <div className="flex min-h-screen bg-void">
      <Sidebar />
      <div className="flex-1 ml-[var(--sidebar-width)]">
        <TopBar />
        <main className="pt-[var(--topbar-height)] p-6">
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div>
              <h2 className="text-lg font-semibold text-white">Backups</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Database backups — auto-deleted after 30 days
                {backups && backups.length > 0 && (
                  <span className="text-gray-600 ml-2 font-mono">({backups.length} files, {totalSize.toFixed(1)} MB)</span>
                )}
              </p>
            </div>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-2 px-4 py-2 text-[13px] rounded-lg bg-accent hover:bg-accent-glow text-white font-medium disabled:opacity-40 transition-all duration-150"
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </span>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Manual Backup
                </>
              )}
            </button>
          </div>

          {loading && !backups && (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <span className="w-3.5 h-3.5 border-2 border-subtle border-t-gray-400 rounded-full animate-spin" />
              Loading backups...
            </div>
          )}

          {backups?.length === 0 && (
            <div className="text-center py-16 dot-grid rounded-xl border border-subtle animate-fade-in">
              <div className="w-12 h-12 rounded-xl bg-elevated border border-subtle flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No backups found</p>
            </div>
          )}

          <div className="space-y-1.5 stagger">
            {backups?.map((backup) => (
              <div key={backup.filename} className="flex items-center gap-4 bg-surface border border-subtle rounded-lg px-5 py-3.5 text-[12px] card-hover animate-slide-up">
                <div className="w-7 h-7 rounded-lg bg-elevated flex items-center justify-center flex-shrink-0">
                  <svg className="w-3.5 h-3.5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
                  </svg>
                </div>
                <span className="font-mono text-gray-300 flex-1 truncate">{backup.filename}</span>
                <span className="text-gray-500 font-mono tabular-nums">{backup.sizeMB} MB</span>
                <span className="text-gray-600 font-mono text-[11px] tabular-nums">{new Date(backup.createdAt).toLocaleString()}</span>
                <button
                  onClick={() => setDeleteTarget(backup.filename)}
                  className="text-[11px] text-gray-600 hover:text-red-400 transition-colors px-2 py-1 rounded-md hover:bg-red-500/10"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>

      {deleteTarget && (
        <ConfirmModal
          title="Delete backup?"
          message={`This will permanently delete ${deleteTarget}.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
