'use client';

interface MetricGaugeProps {
  label: string;
  percent: number;
  unit?: string;
  detail?: string;
}

export default function MetricGauge({ label, percent, unit = '%', detail }: MetricGaugeProps) {
  const color = percent >= 85 ? 'text-red-400' : percent >= 70 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-mono ${color}`}>{Math.round(percent)}{unit}</span>
      {detail && <span className="text-zinc-600 font-mono text-[12px]">{detail}</span>}
    </div>
  );
}
