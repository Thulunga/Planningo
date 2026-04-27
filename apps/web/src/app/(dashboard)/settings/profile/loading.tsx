import { Skeleton } from '@planningo/ui'

export default function ProfileSettingsLoading() {
  return (
    <div className="space-y-6 max-w-lg">
      <Skeleton className="h-8 w-20" />
      <div className="space-y-1">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </div>
  )
}
