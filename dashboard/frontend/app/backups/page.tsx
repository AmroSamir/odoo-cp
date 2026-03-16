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
      <div className="flex-1 ml-[260px]"><TopBar title="Backups" />
        <main className="pt-[60px] p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[14px] text-txt-muted">Manage database backups</p>
            <button onClick={handleCreate} disabled={creating} className="px-4 py-2.5 text-[13px] rounded-lg bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              {creating ? 'Creating...' : 'Create backup'}
            </button>
          </div>
          {loading && !backups && <p className="text-txt-muted text-[14px]">Loading...</p>}
          {backups?.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-page-bg border border-page-border flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-txt-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              </div>
              <p className="text-txt-muted text-[14px]">No backups found</p>
            </div>
          )}
          {backups && backups.length > 0 && (
            <div className="bg-page-surface border border-page-border rounded-xl overflow-hidden shadow-card">
              {backups.map((b, i) => (
                <div key={b.filename} className={`flex items-center gap-4 px-5 py-3.5 text-[13px] ${i > 0 ? 'border-t border-page-border' : ''}`}>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7" />
                    </svg>
                  </div>
                  <span className="font-mono text-txt-primary flex-1 truncate">{b.filename}</span>
                  <span className="text-txt-muted font-mono text-[12px]">{b.sizeMB} MB</span>
                  <span className="text-txt-faint font-mono text-[12px]">{new Date(b.createdAt).toLocaleString()}</span>
                  <button onClick={() => setDeleteTarget(b.filename)} className="text-txt-faint hover:text-red-500 transition-colors duration-150 p-1 rounded-lg hover:bg-red-50">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
      {deleteTarget && <ConfirmModal title="Delete backup?" message={`Permanently delete ${deleteTarget}.`} confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />}
    </div>
  );
}
