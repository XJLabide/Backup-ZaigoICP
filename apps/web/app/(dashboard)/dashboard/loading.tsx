import { Skeleton } from '@/components/ui/skeleton';
import { StatsCardSkeleton } from '@/components/stats-card-skeleton';

function WidgetSkeleton() {
  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <Skeleton className="h-6 w-32 mb-4" />
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

function QuickActionSkeleton() {
  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="p-6 space-y-8">
      {/* Page Title */}
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="grid gap-4 md:grid-cols-2">
          <QuickActionSkeleton />
          <QuickActionSkeleton />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <Skeleton className="h-6 w-36 mb-4" />
        <div className="grid gap-4 md:grid-cols-2">
          <WidgetSkeleton />
          <WidgetSkeleton />
        </div>
      </div>
    </div>
  );
}
