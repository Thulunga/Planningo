/**
 * NSE market hours: 9:15 AM – 3:30 PM IST, Monday–Friday
 * Pre-open session: 9:00 AM – 9:15 AM IST (monitored but not traded)
 */

const IST_OFFSET_MINUTES = 330 // UTC+5:30

export type MarketStatus = 'OPEN' | 'PRE_OPEN' | 'CLOSED' | 'HOLIDAY'

export interface MarketInfo {
  status: MarketStatus
  /** ms until next open or close, depending on status */
  msUntilChange: number
  openTime: string  // "9:15 AM"
  closeTime: string // "3:30 PM"
  currentIST: string
}

function toIST(date: Date): Date {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60_000
  return new Date(utcMs + IST_OFFSET_MINUTES * 60_000)
}

function istMinutes(date: Date): number {
  const ist = toIST(date)
  return ist.getHours() * 60 + ist.getMinutes()
}

function istDayOfWeek(date: Date): number {
  return toIST(date).getDay() // 0 = Sunday
}

export function getMarketInfo(now: Date = new Date()): MarketInfo {
  const dayOfWeek = istDayOfWeek(now)
  const minuteOfDay = istMinutes(now)

  const PRE_OPEN_START = 9 * 60        // 9:00 AM
  const MARKET_OPEN   = 9 * 60 + 15   // 9:15 AM
  const MARKET_CLOSE  = 15 * 60 + 30  // 3:30 PM

  const ist = toIST(now)
  const currentIST = ist.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })

  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5

  let status: MarketStatus
  let msUntilChange = 0

  if (!isWeekday) {
    status = 'CLOSED'
    // ms until Monday 9:15 AM IST
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
    msUntilChange = daysUntilMonday * 24 * 60 * 60_000
  } else if (minuteOfDay < PRE_OPEN_START) {
    status = 'CLOSED'
    msUntilChange = (PRE_OPEN_START - minuteOfDay) * 60_000
  } else if (minuteOfDay < MARKET_OPEN) {
    status = 'PRE_OPEN'
    msUntilChange = (MARKET_OPEN - minuteOfDay) * 60_000
  } else if (minuteOfDay < MARKET_CLOSE) {
    status = 'OPEN'
    msUntilChange = (MARKET_CLOSE - minuteOfDay) * 60_000
  } else {
    status = 'CLOSED'
    // ms until next day pre-open (accounting for weekends)
    const nextDayMinutes = 24 * 60 - minuteOfDay + PRE_OPEN_START
    msUntilChange = nextDayMinutes * 60_000
  }

  return {
    status,
    msUntilChange,
    openTime: '9:15 AM',
    closeTime: '3:30 PM',
    currentIST,
  }
}

export function isMarketOpen(now: Date = new Date()): boolean {
  return getMarketInfo(now).status === 'OPEN'
}

/** Format ms duration as "2h 14m" or "45m" */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}
