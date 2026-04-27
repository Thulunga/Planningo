import { Skeleton } from '@planningo/ui'

export default function BudgetLoading() {
  return (
    <div className="pb-28 sm:pb-6">
      {/* Sticky top bar */}
      <div className="flex items-center gap-3 border-b border-border/50 bg-background px-4 py-2.5 mb-4">
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        <div className="flex-1 min-w-0 space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-48 hidden sm:block" />
        </div>
      </div>

      {/* Month nav + action buttons */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28 rounded-md hidden sm:block" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-3">
            <Skeleton className="mb-1.5 h-3 w-20" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </div>

      {/* Main content — 2-col on lg */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left: arc gauge + budget breakdown */}
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {/* Arc gauge placeholder */}
            <Skeleton className="mx-auto h-28 w-52 rounded-t-full" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Right: transaction list */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
            {/* Filter row */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Skeleton className="h-9 rounded-md" />
              <Skeleton className="h-9 rounded-md" />
            </div>
            {/* Transaction rows */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border bg-card/50 py-2 px-2.5">
                <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-7 w-7 rounded-md" />
                <Skeleton className="h-7 w-7 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
