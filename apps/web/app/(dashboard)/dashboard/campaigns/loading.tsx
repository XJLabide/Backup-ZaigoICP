import { Skeleton } from '@/components/ui/skeleton';

function CampaignCardSkeleton() {
  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>
      <Skeleton className="h-4 w-48 mb-4" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-12 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CampaignsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-40 mb-2" />
          <Skeleton className="h-5 w-72" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Campaign Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CampaignCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
