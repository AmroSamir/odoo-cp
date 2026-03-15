'use client';

interface MetricGaugeProps {
  label: string;
  percent: number;
  unit?: string;
  detail?: string;
}

export default function MetricGauge({ label, percent, unit = '%', detail }: MetricGaugeProps) {
  const color =
    percent >= 85 ? 'text-red-400' : percent >= 70 ? 'text-yellow-400' : 'text-green-400';
  const bgColor =
    percent >= 85 ? 'bg-red-500' : percent >= 70 ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-500 font-medium">{label}</span>
      <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${bgColor} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
      <span className={`font-mono font-bold ${color}`}>
        {Math.round(percent)}{unit}
      </span>
      {detail && <span className="text-gray-600 hidden xl:inline">{detail}</span>}
    </div>
  );
}
