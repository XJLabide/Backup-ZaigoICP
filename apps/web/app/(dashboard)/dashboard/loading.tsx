import { Header } from '@/components/header';
import { StatsCardSkeleton } from "@/components/stats-card-skeleton"

export default function DashboardLoading() {
  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
