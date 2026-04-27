import { Skeleton } from '@planningo/ui'

export default function NotificationsLoading() {
  return (
    <div className="space-y-6 max-w-lg">
      <Skeleton className="h-8 w-20" />
      <div className="space-y-1">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="rounded-xl border bg-card p-6 space-y-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-sm" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
    </div>
  )
}
