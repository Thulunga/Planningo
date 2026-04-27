import { Skeleton } from '@planningo/ui'

export default function CalendarLoading() {
  return (
    <div className="space-y-3">
      {/* Outer toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-7 w-28" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 flex-1 rounded-md sm:w-56 sm:flex-none" />
          <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
        </div>
      </div>

      {/* Calendar card */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Nav header */}
        <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
          <div className="flex items-center gap-0.5">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-5 mx-auto w-32" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>

        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-border/60">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="py-2 text-center">
              <Skeleton className="mx-auto h-3 w-4" />
            </div>
          ))}
        </div>

        {/* Calendar grid — 5 weeks */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[72px] border-b border-r border-border/40 p-1 sm:min-h-[96px]"
            >
              <div className="flex justify-end">
                <Skeleton className="mb-0.5 h-6 w-6 rounded-full" />
              </div>
              {/* A few event pills on some days */}
              {i % 5 === 1 && <Skeleton className="mb-0.5 h-4 w-full rounded" />}
              {i % 7 === 3 && <Skeleton className="mb-0.5 h-4 w-full rounded" />}
              {i % 9 === 0 && <Skeleton className="h-4 w-3/4 rounded" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
