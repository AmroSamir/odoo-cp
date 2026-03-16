'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await api.post('/auth/login', { password }); router.push('/instances'); }
    catch (err: any) { setError(err.response?.data?.error || 'Login failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
          </div>
          <h1 className="text-[20px] font-semibold text-txt-primary">Odoo Manager</h1>
          <p className="text-[14px] text-txt-muted mt-1">Sign in to your dashboard</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-page-surface border border-page-border rounded-2xl p-6 space-y-5 shadow-card">
          <div>
            <label className="block text-[13px] text-txt-secondary font-medium mb-1.5">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" required autoFocus
              className="w-full bg-page-bg border border-page-border rounded-lg px-4 py-3 text-[14px] text-txt-primary placeholder-txt-faint" />
          </div>
          {error && <p className="text-[13px] text-red-500">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-[14px] font-medium disabled:opacity-50 transition-colors duration-150">{loading ? 'Signing in...' : 'Sign in'}</button>
        </form>
      </div>
    </div>
  );
}
