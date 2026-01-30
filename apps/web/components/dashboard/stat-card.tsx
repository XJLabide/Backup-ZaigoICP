interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
}

export function StatCard({ title, value, subtitle }: StatCardProps) {
  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <p className="text-sm font-medium text-[#9ca3af]">{title}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      <p className="text-xs text-[#6b7280] mt-1">{subtitle}</p>
    </div>
  );
}
