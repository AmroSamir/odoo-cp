'use client';

import { usePolling } from '@/lib/usePolling';
import type { SystemStats } from '@/types';

function ArcGauge({ label, percent, detail }: { label: string; percent: number; detail?: string }) {
  const r = 18;
  const circumference = Math.PI * r; // half circle
  const offset = circumference - (Math.min(100, percent) / 100) * circumference;

  const color =
    percent >= 85 ? '#EF4444' : percent >= 70 ? '#EAB308' : '#22C55E';
  const glowColor =
    percent >= 85 ? 'rgba(239,68,68,0.3)' : percent >= 70 ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)';

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative w-10 h-6">
        <svg width="40" height="24" viewBox="0 0 44 24" className="overflow-visible">
          <path
            d="M 4 22 A 18 18 0 0 1 40 22"
            className="gauge-track"
          />
          <path
            d="M 4 22 A 18 18 0 0 1 40 22"
            className="gauge-fill"
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 3px ${glowColor})` }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-end justify-center text-[9px] font-mono font-semibold pb-0.5"
          style={{ color }}
        >
          {Math.round(percent)}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider leading-none">{label}</span>
        {detail && <span className="text-[10px] text-gray-600 font-mono leading-tight mt-0.5">{detail}</span>}
      </div>
    </div>
  );
}

export default function TopBar() {
  const { data } = usePolling<SystemStats>('/monitoring/system', 5000);

  return (
    <header className="fixed top-0 left-[var(--sidebar-width)] right-0 h-[var(--topbar-height)] bg-surface/80 backdrop-blur-md border-b border-subtle flex items-center justify-between px-6 z-10">
      <div />
      <div className="flex items-center gap-6">
        {data ? (
          <>
            <ArcGauge label="CPU" percent={data.cpu.percent} />
            <div className="w-px h-6 bg-subtle" />
            <ArcGauge label="RAM" percent={data.ram.percent} detail={`${data.ram.usedMB}/${data.ram.totalMB}M`} />
            <div className="w-px h-6 bg-subtle" />
            <ArcGauge label="Disk" percent={data.disk.percent} detail={`${data.disk.usedGB}/${data.disk.totalGB}G`} />
          </>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-subtle animate-pulse" />
            <span className="text-[11px] text-gray-600 font-mono">connecting...</span>
          </div>
        )}
      </div>
    </header>
  );
}
