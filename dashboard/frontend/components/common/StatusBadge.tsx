interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    running: 'text-green-400',
    exited:  'text-yellow-400',
    absent:  'text-zinc-500',
    error:   'text-red-400',
  };

  return (
    <span className={`text-[12px] font-mono ${colors[status] || colors.absent}`}>
      {status}
    </span>
  );
}
