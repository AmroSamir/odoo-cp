interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const colors: Record<string, string> = {
    running: 'text-green-400',
    exited:  'text-amber-400',
    absent:  'text-[#4a4a55]',
    error:   'text-red-400',
  };

  return (
    <span className={`text-[12px] font-mono ${colors[status] || colors.absent}`}>
      {status}
    </span>
  );
}
