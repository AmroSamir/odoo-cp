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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-md w-full max-w-md">
        <div className="p-5">
          <h3 className="text-[15px] font-medium text-white mb-4">New staging instance</h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] text-zinc-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                placeholder="test-invoice"
                required
                maxLength={20}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-[13px] text-white placeholder-zinc-600"
              />
              {name && <p className="text-[11px] mt-1 text-zinc-500 font-mono">stg-{sanitizedName}</p>}
            </div>

            <div>
              <label className="block text-[13px] text-zinc-400 mb-1">Port (auto-assigned if empty)</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="8171-8199"
                min={8171} max={8199}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-[13px] text-white placeholder-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[13px] text-zinc-400 mb-1">Auto-delete after (days)</label>
              <input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                placeholder="No expiry"
                min={1}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-[13px] text-white placeholder-zinc-600"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={withSsl} onChange={(e) => setWithSsl(e.target.checked)} className="accent-accent" />
              <span className="text-[13px] text-zinc-400">Generate SSL certificate</span>
            </label>

            {error && <p className="text-[12px] text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-[13px] rounded-md border border-zinc-700 text-zinc-400 hover:text-white transition-colors duration-150">Cancel</button>
              <button type="submit" disabled={loading || !sanitizedName} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-white font-medium disabled:opacity-30 transition-colors duration-150">
                {loading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
