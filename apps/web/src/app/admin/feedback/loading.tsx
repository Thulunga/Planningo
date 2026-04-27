import { Skeleton } from '@planningo/ui'

export default function AdminFeedbackLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 flex items-start gap-3">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
            <Skeleton className="h-8 w-8 rounded shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
