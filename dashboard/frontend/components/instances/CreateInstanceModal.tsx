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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-surface border border-subtle rounded-xl w-full max-w-md shadow-2xl shadow-black/50 animate-slide-up">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
              <svg className="w-4 h-4 text-accent-glow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">New Staging Instance</h3>
            </div>
          </div>
          <p className="text-[12px] text-gray-500 mb-6 ml-11">
            Clones production database and filestore. May take a few minutes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Instance Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s/g, '-'))}
                placeholder="e.g. test-invoice"
                required
                maxLength={20}
                className="input-field"
              />
              {name && (
                <p className="text-[11px] mt-1.5 text-gray-500 font-mono">
                  Container: <span className="text-accent-glow">stg-{sanitizedName}</span>
                </p>
              )}
            </Field>

            <Field label="Port" hint="Auto-assigned 8171-8199">
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(e.target.value)}
                placeholder="Auto-assign"
                min={8171}
                max={8199}
                className="input-field"
              />
            </Field>

            <Field label="Auto-delete after" hint="Days until auto-removal">
              <input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                placeholder="No expiry"
                min={1}
                className="input-field"
              />
            </Field>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                withSsl ? 'bg-accent border-accent' : 'border-subtle bg-void hover:border-gray-500'
              }`}>
                {withSsl && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <input
                type="checkbox"
                checked={withSsl}
                onChange={(e) => setWithSsl(e.target.checked)}
                className="sr-only"
              />
              <span className="text-[13px] text-gray-400 group-hover:text-gray-300 transition-colors">
                Generate nginx vhost + SSL certificate
              </span>
            </label>

            {error && (
              <div className="text-[12px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-subtle text-gray-400 hover:text-white hover:border-gray-500 transition-all duration-150"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !sanitizedName}
                className="px-5 py-2 text-sm rounded-lg bg-accent hover:bg-accent-glow text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating...
                  </span>
                ) : 'Create Instance'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-gray-300 mb-1.5">
        {label} {required && <span className="text-accent">*</span>}
        {hint && <span className="text-gray-600 font-normal ml-1">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
