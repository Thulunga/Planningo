import { Skeleton } from '@planningo/ui'

export default function DashboardLoading() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Greeting hero — matches the gradient card with analog clock */}
      <div className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <div className="flex justify-center sm:justify-start sm:shrink-0">
          {/* Clock circle */}
          <div className="h-[110px] w-[110px] rounded-full border-2 border-primary/20 bg-card/50" />
        </div>
        <div className="hidden sm:block w-px self-stretch bg-border/50" />
        <div className="block sm:hidden h-px w-full bg-border/50" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-72" />
          <div className="mt-3 flex gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-md" />
          ))}
        </div>
      </div>

      {/* 3-column card grid — todos, events, planner */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-5 w-10 rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
