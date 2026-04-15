import { Skeleton } from '@planningo/ui'

export default function RemindersLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {/* Reminder list */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-lg border bg-card px-4 py-4"
          >
            <Skeleton className="mt-0.5 h-5 w-5 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  )
}
