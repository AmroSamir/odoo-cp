'use client';

import { useState } from 'react';
import api from '@/lib/api';

interface Props { onClose: () => void; onCreated: () => void; }

export default function CreateInstanceModal({ onClose, onCreated }: Props) {
  const [name, setName] = useState('');
  const [port, setPort] = useState('');
  const [ttl, setTtl] = useState('');
  const [withSsl, setWithSsl] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sanitized = name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').slice(0, 20);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.post('/instances', { name: sanitized, port: port ? parseInt(port) : undefined, ttl: ttl ? parseInt(ttl) : undefined, withSsl }); onCreated(); onClose(); }
    catch (err: any) { setError(err.response?.data?.error || 'Failed'); } finally { setLoading(false); }
  };

  const inputCls = "w-full bg-page-bg border border-page-border rounded-md px-3 py-2 text-[13px] text-[#f0f0f0] placeholder-[#94a3b8]";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-page-surface border border-page-border rounded-md w-full max-w-md ">
        <div className="p-5">
          <h3 className="text-[15px] font-medium text-[#f0f0f0] mb-4">New staging instance</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><label className="block text-[13px] text-[#8a8a95] mb-1">Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, '-'))} placeholder="test-invoice" required maxLength={20} className={inputCls} />{name && <p className="text-[11px] mt-1 text-[#6a6a75] font-mono">stg-{sanitized}</p>}</div>
            <div><label className="block text-[13px] text-[#8a8a95] mb-1">Port (auto-assigned if empty)</label><input type="number" value={port} onChange={(e) => setPort(e.target.value)} placeholder="8171-8199" min={8171} max={8199} className={inputCls} /></div>
            <div><label className="block text-[13px] text-[#8a8a95] mb-1">Auto-delete after (days)</label><input type="number" value={ttl} onChange={(e) => setTtl(e.target.value)} placeholder="No expiry" min={1} className={inputCls} /></div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={withSsl} onChange={(e) => setWithSsl(e.target.checked)} className="accent-accent" /><span className="text-[13px] text-[#8a8a95]">Generate SSL certificate</span></label>
            {error && <p className="text-[12px] text-red-400">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-[13px] rounded-md border border-page-border text-[#8a8a95] hover:text-[#f0f0f0] transition-colors duration-150">Cancel</button>
              <button type="submit" disabled={loading || !sanitized} className="px-3 py-1.5 text-[13px] rounded-md bg-accent hover:bg-accent-hover text-[#0e0e10] font-medium disabled:opacity-30 transition-colors duration-150">{loading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
