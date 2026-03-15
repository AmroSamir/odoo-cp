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
      <div className={`bg-gray-900 border rounded-lg p-5 flex flex-col gap-4 ${isProd ? 'border-odoo-purple/50' : 'border-gray-800'}`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white text-sm">{instance.name}</span>
              {isProd && (
                <span className="text-xs bg-odoo-purple/30 text-odoo-light border border-odoo-purple/30 px-1.5 py-0.5 rounded font-medium">
                  PROD
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">Port: {instance.port}</div>
            {createdAgo !== null && (
              <div className="text-xs text-gray-600 mt-0.5">
                {createdAgo === 0 ? 'Created today' : `${createdAgo}d old`}
                {instance.ttlDays && ` · TTL: ${instance.ttlDays}d`}
              </div>
            )}
          </div>
          <StatusBadge status={instance.status} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {!isProd && (
            <>
              {isRunning ? (
                <button
                  onClick={() => action('stop')}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 disabled:opacity-50 transition-colors"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={() => action('start')}
                  disabled={loading}
                  className="text-xs px-3 py-1.5 rounded bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 disabled:opacity-50 transition-colors"
                >
                  Start
                </button>
              )}
            </>
          )}

          {isRunning && (
            <button
              onClick={() => action('restart')}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Restart
            </button>
          )}

          <button
            onClick={() => setShowLogs(true)}
            className="text-xs px-3 py-1.5 rounded bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 transition-colors"
          >
            Logs
          </button>

          {!isProd && (
            <button
              onClick={() => setShowRemoveConfirm(true)}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 disabled:opacity-50 transition-colors ml-auto"
            >
              Remove
            </button>
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
