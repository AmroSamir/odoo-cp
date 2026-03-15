'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface CreateInstanceModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateInstanceModal({ onClose, onCreated }: CreateInstanceModalProps) {
  const [name, setName] = useState('');
  const [port, setPort] = useState('');
  const [ttl, setTtl] = useState('');
  const [withSsl, setWithSsl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sanitizedName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);
  const nameValid = sanitizedName.length > 0 && sanitizedName === name.toLowerCase().replace(/\s/g, '-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/instances', {
        name: sanitizedName,
        port: port ? parseInt(port) : undefined,
        ttl: ttl ? parseInt(ttl) : undefined,
        withSsl,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create instance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Create Staging Instance</h3>
          <p className="text-xs text-gray-500 mb-6">
            Creates an isolated Odoo instance by cloning the production database and filestore.
            This may take a few minutes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Instance Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                placeholder="e.g. test-invoice"
                required
                maxLength={20}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-400"
              />
              {name && (
                <p className="text-xs mt-1 text-gray-500">
                  Container: <span className="text-white font-mono">stg-{sanitizedName}</span>
                </p>
              )}
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Port (optional — auto-assigned 8171–8199)</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="Auto-assign"
                min={8171}
                max={8199}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* TTL */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Auto-delete after (days, optional)</label>
              <input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                placeholder="No expiry"
                min={1}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-gray-400"
              />
            </div>

            {/* SSL */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={withSsl}
                onChange={(e) => setWithSsl(e.target.checked)}
                className="w-4 h-4 accent-odoo-purple"
              />
              <span className="text-sm text-gray-300">Generate nginx vhost + SSL certificate</span>
            </label>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !sanitizedName}
                className="px-4 py-2 text-sm rounded bg-odoo-purple hover:bg-odoo-light text-white font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? 'Creating...' : 'Create Instance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
