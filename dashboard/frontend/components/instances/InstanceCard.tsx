'use client';

import { useState } from 'react';
import type { Instance } from '@/types';
import StatusBadge from '../common/StatusBadge';
import ConfirmModal from '../common/ConfirmModal';
import LogViewer from '../common/LogViewer';
import api from '@/lib/api';

interface InstanceCardProps {
  instance: Instance;
  onRefresh: () => void;
}

export default function InstanceCard({ instance, onRefresh }: InstanceCardProps) {
  const [loading, setLoading] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const isRunning = instance.status === 'running';
  const isProd = instance.type === 'production';

  const action = async (endpoint: string) => {
    setLoading(true);
    try {
      await api.post(`/instances/${instance.name}/${endpoint}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setShowRemoveConfirm(false);
    setLoading(true);
    try {
      await api.delete(`/instances/${instance.name}`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Remove failed');
    } finally {
      setLoading(false);
    }
  };

  const createdAgo = instance.createdAt
    ? Math.round((Date.now() - new Date(instance.createdAt).getTime()) / 86400000)
    : null;

  return (
    <>
      <div className="bg-zinc-900 border border-zinc-800 rounded-md p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[14px] text-white font-medium">{instance.name}</span>
              {isProd && <span className="text-[11px] text-accent font-mono">prod</span>}
            </div>
            <div className="text-[12px] text-zinc-500 mt-1 font-mono">
              :{instance.port}
              {createdAgo !== null && <span className="ml-2">{createdAgo === 0 ? 'today' : `${createdAgo}d ago`}</span>}
              {instance.ttlDays && <span className="ml-2 text-yellow-500">ttl {instance.ttlDays}d</span>}
            </div>
          </div>
          <StatusBadge status={instance.status} />
        </div>

        <div className="flex gap-1.5">
          {!isProd && (
            isRunning ? (
              <Btn onClick={() => action('stop')} disabled={loading}>Stop</Btn>
            ) : (
              <Btn onClick={() => action('start')} disabled={loading}>Start</Btn>
            )
          )}
          {isRunning && <Btn onClick={() => action('restart')} disabled={loading}>Restart</Btn>}
          <Btn onClick={() => setShowLogs(true)}>Logs</Btn>
          {!isProd && (
            <Btn onClick={() => setShowRemoveConfirm(true)} disabled={loading} danger>Remove</Btn>
          )}
        </div>
      </div>

      {showRemoveConfirm && (
        <ConfirmModal
          title={`Remove stg-${instance.name}?`}
          message="This will permanently delete the instance, its database, and all filestore data."
          confirmText="remove"
          confirmLabel="Remove"
          onConfirm={handleRemove}
          onCancel={() => setShowRemoveConfirm(false)}
        />
      )}

      {showLogs && (
        <LogViewer
          url={`/api/instances/${instance.name}/logs`}
          title={`${instance.name} logs`}
          onClose={() => setShowLogs(false)}
        />
      )}
    </>
  );
}

function Btn({ children, onClick, disabled, danger }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[12px] px-2 py-1 rounded border transition-colors duration-150 disabled:opacity-30 ${
        danger
          ? 'text-red-400 border-zinc-700 hover:bg-red-950/30'
          : 'text-zinc-400 border-zinc-700 hover:text-white hover:bg-zinc-800'
      }`}
    >
      {children}
    </button>
  );
}
