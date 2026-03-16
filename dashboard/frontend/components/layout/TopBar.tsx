'use client';

import { usePolling } from '@/lib/usePolling';
import type { SystemStats } from '@/types';

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="text-[#7a9baa]">{label}</span>
      <span className="text-[#0c4a6e] font-mono">{value}</span>
      {detail && <span className="text-[#94b3c2] font-mono text-[12px]">{detail}</span>}
    </div>
  );
}

export default function TopBar() {
  const { data } = usePolling<SystemStats>('/monitoring/system', 5000);

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[48px] bg-arctic-surface border-b border-arctic-border flex items-center justify-end gap-6 px-5">
      {data ? (
        <>
          <Metric label="CPU" value={`${Math.round(data.cpu.percent)}%`} />
          <Metric label="RAM" value={`${Math.round(data.ram.percent)}%`} detail={`${data.ram.usedMB}/${data.ram.totalMB}M`} />
          <Metric label="Disk" value={`${Math.round(data.disk.percent)}%`} detail={`${data.disk.usedGB}/${data.disk.totalGB}G`} />
        </>
      ) : (
        <span className="text-[13px] text-[#94b3c2]">Loading...</span>
      )}
    </header>
  );
}
