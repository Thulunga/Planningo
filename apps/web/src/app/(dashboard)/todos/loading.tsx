import { Skeleton } from '@planningo/ui'

export default function TodosLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Filter chips — horizontal scroll */}
      <div className="flex gap-2 overflow-x-hidden">
        {['All', 'Today', 'Overdue', 'Todo', 'In Progress', 'Done', 'Cancelled'].map((label) => (
          <Skeleton key={label} className="h-9 shrink-0 rounded-full px-3" style={{ width: `${label.length * 9 + 20}px` }} />
        ))}
      </div>

      {/* Todo rows — matches TodoRow layout: checkbox + title area + MoreVertical */}
      <div className="space-y-1.5">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex items-start gap-2 rounded-lg border bg-card py-2.5 pr-1.5 pl-2.5">
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
            <div className="flex-1 space-y-1.5 py-1">
              <Skeleton className={`h-4 ${i % 3 === 0 ? 'w-2/3' : i % 2 === 0 ? 'w-3/4' : 'w-1/2'}`} />
              {i % 2 === 0 && (
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-12 rounded" />
                  <Skeleton className="h-4 w-16 rounded" />
                </div>
              )}
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
