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
    <div className="min-h-screen flex items-center justify-center bg-deep-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto mx-auto mb-6" />
        </div>
        <form onSubmit={handleSubmit} className="bg-deep-surface border border-deep-border rounded-md p-6 space-y-4">
          <div>
            <label className="block text-[13px] text-[#8eafc4] mb-1">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter admin password" required autoFocus
              className="w-full bg-deep-bg border border-deep-border rounded-md px-3 py-2.5 text-[14px] text-[#eceff1] placeholder-[#4a7a96]" />
          </div>
          {error && <p className="text-[12px] text-red-400">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-md bg-accent hover:bg-accent-hover text-[#001e3c] text-[14px] font-medium disabled:opacity-50 transition-colors duration-150">
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
