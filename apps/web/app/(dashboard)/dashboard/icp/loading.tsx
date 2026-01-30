import { Skeleton } from '@/components/ui/skeleton';

function ICPFieldSkeleton() {
  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <div className="space-y-4">
        <div>
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-64 mb-4" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <div className="flex flex-wrap gap-2 pt-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ICPLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div>
        <Skeleton className="h-9 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* ICP Fields Grid */}
      <div className="grid gap-6">
        <ICPFieldSkeleton />
        <ICPFieldSkeleton />
        <ICPFieldSkeleton />
        <ICPFieldSkeleton />
        <ICPFieldSkeleton />
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-4">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
