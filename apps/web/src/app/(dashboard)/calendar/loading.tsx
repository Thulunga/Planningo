import { Skeleton } from '@planningo/ui'

export default function CalendarLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Calendar toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-9 w-9 rounded-md" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>

      {/* Day-of-week header */}
      <div className="grid grid-cols-7 gap-px">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <Skeleton key={d} className="h-8" />
        ))}
      </div>

      {/* Calendar grid — 5 weeks */}
      <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="bg-card min-h-[80px] p-1 space-y-1">
            <Skeleton className="h-5 w-5 rounded-full" />
            {i % 7 === 1 && <Skeleton className="h-4 w-full rounded" />}
            {i % 11 === 0 && <Skeleton className="h-4 w-full rounded" />}
          </div>
        ))}
      </div>
    </div>
  )
}
