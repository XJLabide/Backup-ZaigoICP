import { Skeleton } from '@/components/ui/skeleton';

function MessageCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-full shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48 mb-3" />
          <div className="bg-neutral-50 rounded-lg p-4">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="flex items-center justify-between mt-4">
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesLoading() {
  return (
    <div className="p-6 space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-36 mb-2" />
          <Skeleton className="h-5 w-80" />
          <div className="flex gap-4 mt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-[150px]" />
          <Skeleton className="h-10 w-[150px]" />
        </div>
      </div>

      {/* Message Cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MessageCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
