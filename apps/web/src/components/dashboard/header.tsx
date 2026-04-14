import { RealTimeClock } from '@/components/clock/real-time-clock'
import type { Tables } from '@planningo/database'

interface HeaderProps {
  profile: Tables<'profiles'> | null
}

export function Header({ profile }: HeaderProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
      <div className="flex items-center gap-2">
        {/* Breadcrumb / page title injected by each page via React context if needed */}
      </div>

      <div className="flex items-center gap-4">
        {/* Live clock — always visible */}
        <RealTimeClock
          timezone={profile?.timezone ?? 'UTC'}
          className="flex flex-col items-end"
        />
      </div>
    </header>
  )
}
