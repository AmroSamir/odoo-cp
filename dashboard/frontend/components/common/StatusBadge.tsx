interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    running: 'text-green-600',
    exited:  'text-amber-600',
    absent:  'text-[#94b3c2]',
    error:   'text-red-500',
  };

  return (
    <span className={`text-[12px] font-mono ${colors[status] || colors.absent}`}>
      {status}
    </span>
  );
}
