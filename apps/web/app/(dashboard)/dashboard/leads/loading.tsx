import { Skeleton } from '@/components/ui/skeleton';
import { StatsCardSkeleton } from '@/components/stats-card-skeleton';

function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-neutral-200">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-5 w-32 mb-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-20 rounded-full" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export default function LeadsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div>
        <Skeleton className="h-9 w-24 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>

      {/* Filters Row */}
      <div className="flex items-center justify-end gap-3">
        <Skeleton className="h-10 w-[220px]" />
        <Skeleton className="h-10 w-[150px]" />
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white">
        {/* Table Header */}
        <div className="flex items-center gap-4 p-4 border-b border-neutral-200 bg-neutral-50">
          <Skeleton className="h-4 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        {/* Table Rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
