'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface RealTimeClockProps {
  timezone?: string
  className?: string
}

export function RealTimeClock({ timezone = 'UTC', className }: RealTimeClockProps) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    // Set initial time only on client to avoid hydration mismatch
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!now) {
    return (
      <div className={className}>
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-0.5 h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  // Format in user's timezone
  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className={className}>
      <div className="font-mono text-sm font-semibold tabular-nums text-foreground">{timeStr}</div>
      <div className="text-xs text-muted-foreground">{dateStr}</div>
    </div>
  )
}
