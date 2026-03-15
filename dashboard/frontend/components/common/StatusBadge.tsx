interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, string> = {
    running: 'bg-green-500/20 text-green-400 border-green-500/30',
    exited:  'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    absent:  'bg-gray-500/20 text-gray-400 border-gray-500/30',
    error:   'bg-red-500/20 text-red-400 border-red-500/30',
  };
  const classes = map[status] ?? map.absent;
  const dot: Record<string, string> = {
    running: 'bg-green-400',
    exited: 'bg-yellow-400',
    absent: 'bg-gray-500',
    error: 'bg-red-400',
  };
  const dotColor = dot[status] ?? dot.absent;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border font-medium ${classes}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {status}
    </span>
  );
}
