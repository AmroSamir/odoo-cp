'use client';

import { usePolling } from '@/lib/usePolling';
import type { SystemStats } from '@/types';

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-200 font-mono">{value}</span>
      {detail && <span className="text-zinc-600 font-mono text-[12px]">{detail}</span>}
    </div>
  );
}

export default function TopBar() {
  const { data } = usePolling<SystemStats>('/monitoring/system', 5000);

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[48px] bg-zinc-900 border-b border-zinc-800 flex items-center justify-end gap-6 px-5">
      {data ? (
        <>
          <Metric label="CPU" value={`${Math.round(data.cpu.percent)}%`} />
          <Metric label="RAM" value={`${Math.round(data.ram.percent)}%`} detail={`${data.ram.usedMB}/${data.ram.totalMB}M`} />
          <Metric label="Disk" value={`${Math.round(data.disk.percent)}%`} detail={`${data.disk.usedGB}/${data.disk.totalGB}G`} />
        </>
      ) : (
        <span className="text-[13px] text-zinc-600">Loading...</span>
      )}
    </header>
  );
}
