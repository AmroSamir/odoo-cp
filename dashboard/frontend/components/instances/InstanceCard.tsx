'use client';

import { useState } from 'react';
import type { Instance } from '@/types';
import StatusBadge from '../common/StatusBadge';
import ConfirmModal from '../common/ConfirmModal';
import LogViewer from '../common/LogViewer';
import api from '@/lib/api';

interface InstanceCardProps { instance: Instance; onRefresh: () => void; }

export default function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [loading, setLoading] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const isRunning = instance.status === 'running';
  const isProd = instance.type === 'production';

  const action = async (ep: string) => { setLoading(true); try { await api.post(`/instances/${instance.name}/${ep}`); onRefresh(); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); } finally { setLoading(false); } };
  const handleRemove = async () => { setShowRemove(false); setLoading(true); try { await api.delete(`/instances/${instance.name}`); onRefresh(); } catch (err: any) { alert(err.response?.data?.error || 'Failed'); } finally { setLoading(false); } };
  const age = instance.createdAt ? Math.round((Date.now() - new Date(instance.createdAt).getTime()) / 86400000) : null;

  return (
    <>
      <div className="bg-page-surface border border-page-border rounded-xl p-5 shadow-card hover:shadow-card-hover transition-shadow duration-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[15px] text-txt-primary font-semibold">{instance.name}</span>
              {isProd && <span className="text-[11px] text-accent font-medium bg-accent-light px-2 py-0.5 rounded-full">prod</span>}
            </div>
            <div className="text-[13px] text-txt-muted mt-1 font-mono">
              :{instance.port}{age !== null && <span className="ml-2 text-txt-secondary">{age === 0 ? 'today' : `${age}d ago`}</span>}{instance.ttlDays && <span className="ml-2 text-amber-500">ttl {instance.ttlDays}d</span>}
            </div>
          </div>
          <StatusBadge status={instance.status} />
        </div>
        <div className="flex gap-2">
          {!isProd && (isRunning ? <Btn onClick={() => action('stop')} disabled={loading}>Stop</Btn> : <Btn onClick={() => action('start')} disabled={loading}>Start</Btn>)}
          {isRunning && <Btn onClick={() => action('restart')} disabled={loading}>Restart</Btn>}
          <Btn onClick={() => setShowLogs(true)}>Logs</Btn>
          {!isProd && <Btn onClick={() => setShowRemove(true)} disabled={loading} danger>Remove</Btn>}
        </div>
      </div>
      {showRemove && <ConfirmModal title={`Remove stg-${instance.name}?`} message="This will permanently delete the instance." confirmText="remove" confirmLabel="Remove" onConfirm={handleRemove} onCancel={() => setShowRemove(false)} />}
      {showLogs && <LogViewer url={`/api/instances/${instance.name}/logs`} title={`${instance.name} logs`} onClose={() => setShowLogs(false)} />}
    </>
  );
}

function Btn({ children, onClick, disabled, danger }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className={`text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors duration-150 disabled:opacity-30 ${danger ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-txt-secondary border-page-border hover:text-txt-primary hover:bg-page-bg'}`}>
      {children}
    </button>
  );
}
