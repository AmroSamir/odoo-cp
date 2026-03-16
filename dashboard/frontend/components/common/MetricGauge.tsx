'use client';

interface MetricGaugeProps {
  label: string;
  percent: number;
  unit?: string;
  detail?: string;
}

export default function MetricGauge({ label, percent, unit = '%', detail }: MetricGaugeProps) {
  const color = percent >= 85 ? 'text-red-500' : percent >= 70 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className="flex items-center gap-2 text-[13px]">
      <span className="text-txt-muted">{label}</span>
      <span className={`font-mono font-medium ${color}`}>{Math.round(percent)}{unit}</span>
      {detail && <span className="text-txt-faint font-mono text-[12px]">{detail}</span>}
    </div>
  );
}
