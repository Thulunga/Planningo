import { Skeleton } from '@planningo/ui'

export default function TripDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back button */}
      <Skeleton className="h-8 w-20 rounded-md" />

      {/* Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <Skeleton className="h-5 w-5 rounded shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        ))}
      </div>

      {/* Itinerary list */}
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full max-w-sm" />
          </div>
        ))}
      </div>
    </div>
  )
}
