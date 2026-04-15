import { Skeleton } from '@planningo/ui'

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="space-y-1">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Settings sections */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-4 w-full max-w-sm" />
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
