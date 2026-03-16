interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<string, string> = {
    running: 'bg-emerald-50 text-emerald-600',
    exited:  'bg-amber-50 text-amber-600',
    absent:  'bg-gray-100 text-gray-400',
    error:   'bg-red-50 text-red-500',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full ${styles[status] || styles.absent}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${
        status === 'running' ? 'bg-emerald-500' :
        status === 'exited' ? 'bg-amber-500' :
        status === 'error' ? 'bg-red-500' : 'bg-gray-300'
      }`} />
      {status}
    </span>
  );
}
