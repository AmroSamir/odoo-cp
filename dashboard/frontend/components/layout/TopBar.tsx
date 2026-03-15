'use client';

import { usePolling } from '@/lib/usePolling';
import type { SystemStats } from '@/types';
import MetricGauge from '../common/MetricGauge';

export default function TopBar() {
  const { data } = usePolling<SystemStats>('/monitoring/system', 5000);

  return (
    <header className="fixed top-0 left-[220px] right-0 h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-end gap-6 px-6 z-10">
      {data ? (
        <>
          <MetricGauge label="CPU" percent={data.cpu.percent} unit="%" />
          <MetricGauge label="RAM" percent={data.ram.percent} unit="%" detail={`${data.ram.usedMB}/${data.ram.totalMB} MB`} />
          <MetricGauge label="Disk" percent={data.disk.percent} unit="%" detail={`${data.disk.usedGB}/${data.disk.totalGB} GB`} />
        </>
      ) : (
        <span className="text-xs text-gray-600">Loading metrics...</span>
      )}
    </header>
  );
}
