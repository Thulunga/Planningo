import { Skeleton } from '@planningo/ui'

export default function PlannerLoading() {
  const HOUR_HEIGHT = 64
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-6 w-28 sm:h-7" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      {/* Stats strip */}
      <div className="flex gap-2">
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      {/* Timeline card */}
      <div className="rounded-xl border bg-card">
        <div className="relative overflow-hidden" style={{ height: 640 }}>
          {Array.from({ length: 10 }).map((_, hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-start border-t border-border/40"
              style={{ top: hour * HOUR_HEIGHT, height: HOUR_HEIGHT }}
            >
              <Skeleton className="ml-3 mt-1 h-3 w-10" />
            </div>
          ))}
          {/* Sample blocks */}
          <Skeleton
            className="absolute left-16 right-3 rounded-md"
            style={{ top: HOUR_HEIGHT * 1.5, height: HOUR_HEIGHT * 1.2 }}
          />
          <Skeleton
            className="absolute left-16 right-3 rounded-md"
            style={{ top: HOUR_HEIGHT * 4.5, height: HOUR_HEIGHT * 0.8 }}
          />
          <Skeleton
            className="absolute left-16 right-3 rounded-md"
            style={{ top: HOUR_HEIGHT * 7, height: HOUR_HEIGHT * 1.5 }}
          />
        </div>
      </div>
    </div>
  )
}
