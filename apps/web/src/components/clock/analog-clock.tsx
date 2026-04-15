'use client'

import { useState, useEffect } from 'react'

interface AnalogClockProps {
  timezone?: string
  size?: number
  className?: string
}

/**
 * Extracts hours (0-23), minutes, and seconds in a given IANA timezone
 * using Intl.DateTimeFormat to correctly handle UTC offsets.
 */
function getTimePartsInTimezone(
  date: Date,
  timezone: string
): { hours: number; minutes: number; seconds: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10)

  return { hours: get('hour') % 24, minutes: get('minute'), seconds: get('second') }
}

function resolveTimezone(tz?: string): string {
  if (tz && tz !== 'UTC') return tz
  if (typeof Intl !== 'undefined') return Intl.DateTimeFormat().resolvedOptions().timeZone
  return 'UTC'
}

export function AnalogClock({ timezone, size = 160, className }: AnalogClockProps) {
  const [now, setNow] = useState<Date | null>(null)
  const [effectiveTimezone, setEffectiveTimezone] = useState<string>('UTC')

  useEffect(() => {
    setEffectiveTimezone(resolveTimezone(timezone))
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [timezone])

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4 // face radius, 4px inset for border

  if (!now) {
    return (
      <div
        className={className}
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size}>
          <circle cx={cx} cy={cy} r={r} className="fill-card stroke-border" strokeWidth={2} />
        </svg>
      </div>
    )
  }

  const { hours, minutes, seconds } = getTimePartsInTimezone(now, effectiveTimezone)

  // Smooth continuous angles (hands don't jump between seconds)
  const secondDeg = seconds * 6
  const minuteDeg = minutes * 6 + seconds * 0.1
  const hourDeg = (hours % 12) * 30 + minutes * 0.5

  // Hand lengths as fraction of radius
  const hourLen = r * 0.52
  const minuteLen = r * 0.72
  const secondLen = r * 0.80
  const secondTailLen = r * 0.2

  function handCoords(deg: number, length: number) {
    const rad = (deg - 90) * (Math.PI / 180)
    return {
      x: cx + length * Math.cos(rad),
      y: cy + length * Math.sin(rad),
    }
  }

  function tailCoords(deg: number, length: number) {
    const rad = (deg + 90) * (Math.PI / 180)
    return {
      x: cx + length * Math.cos(rad),
      y: cy + length * Math.sin(rad),
    }
  }

  const hourTip = handCoords(hourDeg, hourLen)
  const minuteTip = handCoords(minuteDeg, minuteLen)
  const secondTip = handCoords(secondDeg, secondLen)
  const secondTail = tailCoords(secondDeg, secondTailLen)

  // Tick mark positions
  const ticks = Array.from({ length: 60 }, (_, i) => {
    const isHour = i % 5 === 0
    const tickRad = (i * 6 - 90) * (Math.PI / 180)
    const outer = r - 1
    const inner = isHour ? r - (r * 0.14) : r - (r * 0.07)
    return {
      x1: cx + outer * Math.cos(tickRad),
      y1: cy + outer * Math.sin(tickRad),
      x2: cx + inner * Math.cos(tickRad),
      y2: cy + inner * Math.sin(tickRad),
      isHour,
    }
  })

  return (
    <div className={className} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Analog clock showing ${hours}:${String(minutes).padStart(2, '0')}`}
      >
        {/* Clock face */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          className="fill-card"
          stroke="hsl(var(--border))"
          strokeWidth={1.5}
        />

        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.isHour ? 'hsl(var(--foreground))' : 'hsl(var(--muted-foreground))'}
            strokeWidth={t.isHour ? 2 : 1}
            strokeLinecap="round"
            opacity={t.isHour ? 0.7 : 0.35}
          />
        ))}

        {/* Hour hand */}
        <line
          x1={cx}
          y1={cy}
          x2={hourTip.x}
          y2={hourTip.y}
          stroke="hsl(var(--foreground))"
          strokeWidth={size * 0.038}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* Minute hand */}
        <line
          x1={cx}
          y1={cy}
          x2={minuteTip.x}
          y2={minuteTip.y}
          stroke="hsl(var(--foreground))"
          strokeWidth={size * 0.024}
          strokeLinecap="round"
          opacity={0.75}
        />

        {/* Second hand + tail */}
        <line
          x1={secondTail.x}
          y1={secondTail.y}
          x2={secondTip.x}
          y2={secondTip.y}
          stroke="hsl(var(--primary))"
          strokeWidth={size * 0.013}
          strokeLinecap="round"
        />

        {/* Center cap */}
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.04}
          fill="hsl(var(--primary))"
        />
        <circle
          cx={cx}
          cy={cy}
          r={size * 0.018}
          fill="hsl(var(--card))"
        />
      </svg>
    </div>
  )
}
