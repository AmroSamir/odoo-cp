interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { dot: string; text: string; bg: string; glow?: string }> = {
    running: { dot: 'bg-green-400', text: 'text-green-400', bg: 'bg-green-500/10', glow: 'glow-green' },
    exited:  { dot: 'bg-yellow-400', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    absent:  { dot: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-500/10' },
    error:   { dot: 'bg-red-400', text: 'text-red-400', bg: 'bg-red-500/10', glow: 'glow-red' },
  };

  const c = config[status] ?? config.absent;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-mono font-medium px-2 py-1 rounded-md ${c.text} ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'running' ? 'animate-pulse-glow' : ''} ${c.glow || ''}`} />
      {status}
    </span>
  );
}
