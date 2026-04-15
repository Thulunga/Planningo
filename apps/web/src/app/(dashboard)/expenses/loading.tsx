import { Skeleton } from '@planningo/ui'

export default function ExpensesLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>

      {/* Expense group grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
            {/* Group header */}
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            {/* Members avatars */}
            <div className="flex items-center gap-1">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-7 w-7 rounded-full" />
              ))}
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            {/* Summary */}
            <div className="flex items-center justify-between pt-1 border-t">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
