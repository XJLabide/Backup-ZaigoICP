import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-[120px]" /> {/* title */}
      </CardHeader>
      <CardContent role="status">
        <Skeleton className="h-8 w-[60px] mb-2" /> {/* number */}
        <Skeleton className="h-3 w-[100px]" /> {/* subtitle */}
        <span className="sr-only">Loading...</span>
      </CardContent>
    </Card>
  )
}
