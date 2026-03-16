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
      <div className={`bg-surface border rounded-xl p-5 flex flex-col gap-4 card-hover ${
        isProd ? 'border-accent/30' : 'border-subtle'
      }`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm truncate">{instance.name}</span>
              {isProd && (
                <span className="text-[10px] font-mono font-semibold bg-accent/15 text-accent-glow border border-accent/20 px-1.5 py-0.5 rounded-md tracking-wider">
                  PROD
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[11px] font-mono text-gray-500">:{instance.port}</span>
              {createdAgo !== null && (
                <span className="text-[11px] text-gray-600">
                  {createdAgo === 0 ? 'today' : `${createdAgo}d ago`}
                </span>
              )}
              {instance.ttlDays && (
                <span className="text-[10px] font-mono text-yellow-500/70">TTL {instance.ttlDays}d</span>
              )}
            </div>
          </div>
          <StatusBadge status={instance.status} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-1.5">
          {!isProd && (
            <>
              {isRunning ? (
                <ActionBtn onClick={() => action('stop')} disabled={loading} variant="yellow">Stop</ActionBtn>
              ) : (
                <ActionBtn onClick={() => action('start')} disabled={loading} variant="green">Start</ActionBtn>
              )}
            </>
          )}

          {isRunning && (
            <ActionBtn onClick={() => action('restart')} disabled={loading} variant="neutral">Restart</ActionBtn>
          )}

          <ActionBtn onClick={() => setShowLogs(true)} variant="neutral">Logs</ActionBtn>

          {!isProd && (
            <div className="ml-auto">
              <ActionBtn onClick={() => setShowRemoveConfirm(true)} disabled={loading} variant="red">Remove</ActionBtn>
            </div>
          )}
        </div>
      </div>

      {showRemoveConfirm && (
        <ConfirmModal
          title={`Remove stg-${instance.name}?`}
          message="This will permanently delete the instance, its database, and all filestore data. This cannot be undone."
          confirmText="remove"
          confirmLabel="Remove Instance"
          onConfirm={handleRemove}
          onCancel={() => setShowRemoveConfirm(false)}
        />
      )}

      {showLogs && (
        <LogViewer
          url={`/api/instances/${instance.name}/logs`}
          title={`Logs — ${instance.name}`}
          onClose={() => setShowLogs(false)}
        />
      )}
    </>
  );
}

function ActionBtn({ children, onClick, disabled, variant }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: 'green' | 'yellow' | 'red' | 'neutral';
}) {
  const styles: Record<string, string> = {
    green: 'text-green-400 bg-green-500/8 hover:bg-green-500/15 border-green-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/8 hover:bg-yellow-500/15 border-yellow-500/20',
    red: 'text-red-400 bg-red-500/8 hover:bg-red-500/15 border-red-500/20',
    neutral: 'text-gray-400 bg-elevated hover:bg-subtle border-subtle',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`text-[11px] font-medium px-2.5 py-1.5 rounded-lg border disabled:opacity-40 transition-all duration-150 ${styles[variant]}`}
    >
      {children}
    </button>
  );
}
