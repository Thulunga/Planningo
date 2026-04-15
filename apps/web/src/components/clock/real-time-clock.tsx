'use client'

import { useState, useEffect } from 'react'

interface RealTimeClockProps {
  timezone?: string
  className?: string
}

/**
 * Resolves the effective timezone to use for display:
 * - If the profile has an explicitly set non-UTC timezone, use it.
 * - Otherwise fall back to the browser's local timezone via Intl.
 * This covers the common case where users haven't visited Settings yet
 * and the profile still carries the default 'UTC' sentinel.
 */
function resolveTimezone(profileTimezone?: string): string {
  if (profileTimezone && profileTimezone !== 'UTC') return profileTimezone
  if (typeof Intl !== 'undefined') {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }
  return 'UTC'
}

export function RealTimeClock({ timezone, className }: RealTimeClockProps) {
  const [now, setNow] = useState<Date | null>(null)
  // Resolve once on mount (browser-only) and keep stable across ticks
  const [effectiveTimezone, setEffectiveTimezone] = useState<string>('UTC')

  useEffect(() => {
    setEffectiveTimezone(resolveTimezone(timezone))
    setNow(new Date())
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [timezone])

  if (!now) {
    return (
      <div className={className}>
        <div className="h-5 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-0.5 h-3 w-24 animate-pulse rounded bg-muted" />
      </div>
    )
  }

  const timeStr = now.toLocaleTimeString('en-US', {
    timeZone: effectiveTimezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const dateStr = now.toLocaleDateString('en-US', {
    timeZone: effectiveTimezone,
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
