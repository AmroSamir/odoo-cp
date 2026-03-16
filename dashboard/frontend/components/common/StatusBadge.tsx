interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    running: 'text-green-600',
    exited:  'text-amber-500',
    absent:  'text-[#94a3b8]',
    error:   'text-red-600',
  };

  return (
    <span className={`text-[12px] font-mono ${colors[status] || colors.absent}`}>
      {status}
    </span>
  );
}
