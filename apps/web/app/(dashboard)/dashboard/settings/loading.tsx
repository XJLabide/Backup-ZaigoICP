import { Skeleton } from '@/components/ui/skeleton';

function SettingsCardSkeleton() {
  return (
    <div className="bg-[#242836] border border-white/10 rounded-lg p-6">
      <Skeleton className="h-6 w-32 mb-2" />
      <Skeleton className="h-4 w-64 mb-4" />
      <Skeleton className="h-10 w-full mb-4" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export default function SettingsLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div>
        <Skeleton className="h-9 w-32 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Settings Cards */}
      <div className="space-y-6">
        {/* LinkedIn Connection Card */}
        <div className="bg-[#242836] border border-white/10 rounded-lg p-8">
          <div className="flex justify-center mb-6">
            <Skeleton className="h-20 w-20 rounded-full" />
          </div>
          <Skeleton className="h-8 w-64 mx-auto mb-3" />
          <Skeleton className="h-5 w-80 mx-auto mb-6" />
          <div className="bg-[#1a1d29] border border-white/10 rounded-lg p-4 mb-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-40" />
              </div>
            </div>
          </div>
          <Skeleton className="h-12 w-full" />
        </div>

        {/* Calendar Link Card */}
        <SettingsCardSkeleton />

        {/* Rate Limiting Card */}
        <SettingsCardSkeleton />
      </div>
    </div>
  );
}
