import { Skeleton } from "@/components/ui/skeleton"

export function StatsCardSkeleton() {
  return (
    <div className="bg-neutral-100 rounded-lg p-6" role="status">
      <Skeleton className="h-4 w-24 mb-2" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-20" />
      <span className="sr-only">Loading...</span>
    </div>
  )
}
