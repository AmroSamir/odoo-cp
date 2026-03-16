'use client';

import { usePolling } from '@/lib/usePolling';
import type { SystemStats } from '@/types';

function MetricPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium ${color}`}>
      <span className="text-txt-muted font-normal">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function getColor(percent: number) {
  if (percent >= 85) return 'bg-red-50 text-red-600';
  if (percent >= 70) return 'bg-amber-50 text-amber-600';
  return 'bg-emerald-50 text-emerald-600';
}

export default function TopBar({ title }: { title?: string }) {
  const { data } = usePolling<SystemStats>('/monitoring/system', 5000);

  return (
    <header className="fixed top-0 left-[260px] right-0 h-[60px] bg-page-surface border-b border-page-border flex items-center justify-between px-6 z-30">
      <h1 className="text-[20px] font-semibold text-txt-primary">{title || 'Dashboard'}</h1>

      <div className="flex items-center gap-3">
        {/* Search bar */}
        <div className="flex items-center gap-2 bg-page-bg border border-page-border rounded-lg px-3 py-2 w-[220px]">
          <svg className="w-4 h-4 text-txt-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[13px] text-txt-muted flex-1">Search anything...</span>
          <kbd className="text-[11px] text-txt-faint bg-page-surface border border-page-border rounded px-1.5 py-0.5 font-mono">K &#8984;</kbd>
        </div>

        {/* Metrics */}
        {data ? (
          <div className="flex items-center gap-1.5">
            <MetricPill label="CPU" value={`${Math.round(data.cpu.percent)}%`} color={getColor(data.cpu.percent)} />
            <MetricPill label="RAM" value={`${Math.round(data.ram.percent)}%`} color={getColor(data.ram.percent)} />
            <MetricPill label="Disk" value={`${Math.round(data.disk.percent)}%`} color={getColor(data.disk.percent)} />
          </div>
        ) : (
          <span className="text-[13px] text-txt-faint">Loading...</span>
        )}

        {/* Help icon */}
        <button className="w-9 h-9 rounded-full border border-page-border flex items-center justify-center text-txt-muted hover:text-txt-primary hover:border-txt-muted transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
