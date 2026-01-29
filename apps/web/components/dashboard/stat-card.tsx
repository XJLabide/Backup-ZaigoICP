interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
}

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-neutral-100 rounded-lg p-6">
      <p className="text-sm font-medium text-neutral-600">{title}</p>
      <p className="text-3xl font-bold text-black mt-2">{value}</p>
      <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
    </div>
  );
}
