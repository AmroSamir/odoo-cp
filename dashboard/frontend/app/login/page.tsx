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
          <img src="/numo-dark-logo.png" alt="Numo" className="h-14 w-auto mx-auto mb-5" />
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
