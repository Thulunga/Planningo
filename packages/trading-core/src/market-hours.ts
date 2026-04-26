/**
 * NSE market hours: 9:15 AM-3:30 PM IST, Monday–Friday (IST = UTC+5:30).
 *
 * Critical fix vs. the original service implementation:
 *   The service used `now.getUTCDay()` to determine day-of-week which is
 *   incorrect at IST day boundaries (e.g., Sunday 11:59 PM UTC = Monday
 *   5:29 AM IST). This module always converts to IST first.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000  // 330 minutes → milliseconds

export type MarketStatus = 'OPEN' | 'PRE_OPEN' | 'CLOSED'

export interface MarketInfo {
  status: MarketStatus
  msUntilChange: number   // ms until next open or close
  openTime: string        // "9:15 AM"
  closeTime: string       // "3:30 PM"
  currentIST: string      // human-readable current IST time
}

// Timing constants (minutes from midnight IST)
const PRE_OPEN_START = 9 * 60         // 9:00 AM
const MARKET_OPEN    = 9 * 60 + 15   // 9:15 AM
const MARKET_CLOSE   = 15 * 60 + 30  // 3:30 PM
const SCAN_WINDOW_END = 15 * 60 + 45  // 3:45 PM  (engine shuts down)
const EOD_CLOSE_TIME  = 14 * 60 + 45  // 2:45 PM  (force-close all positions)
const ENGINE_START    = 9 * 60        // 9:00 AM  (pre-open, engine wakes up)

// ── Internal helpers ─────────────────────────────────────────────────────────

/** Convert any Date to its IST equivalent Date object. */
function toIST(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60_000 + IST_OFFSET_MS)
}

/** Minutes elapsed since midnight IST for a given Date. */
function istMinuteOfDay(date: Date): number {
  const ist = toIST(date)
  return ist.getHours() * 60 + ist.getMinutes()
}

/** Day-of-week in IST (0 = Sunday, 6 = Saturday). */
function istDayOfWeek(date: Date): number {
  return toIST(date).getDay()
}

function isISTWeekday(date: Date): boolean {
  const dow = istDayOfWeek(date)
  return dow >= 1 && dow <= 5
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getMarketInfo(now: Date = new Date()): MarketInfo {
  const minuteOfDay = istMinuteOfDay(now)
  const ist         = toIST(now)

  const currentIST = ist.toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  })

  if (!isISTWeekday(now)) {
    const dow          = istDayOfWeek(now)
    const daysToMonday = dow === 0 ? 1 : 8 - dow
    return {
      status: 'CLOSED',
      msUntilChange: daysToMonday * 24 * 60 * 60_000,
      openTime: '9:15 AM', closeTime: '3:30 PM', currentIST,
    }
  }

  let status: MarketStatus
  let msUntilChange: number

  if (minuteOfDay < PRE_OPEN_START) {
    status         = 'CLOSED'
    msUntilChange  = (PRE_OPEN_START - minuteOfDay) * 60_000
  } else if (minuteOfDay < MARKET_OPEN) {
    status         = 'PRE_OPEN'
    msUntilChange  = (MARKET_OPEN - minuteOfDay) * 60_000
  } else if (minuteOfDay < MARKET_CLOSE) {
    status         = 'OPEN'
    msUntilChange  = (MARKET_CLOSE - minuteOfDay) * 60_000
  } else {
    status         = 'CLOSED'
    const nextDay  = 24 * 60 - minuteOfDay + PRE_OPEN_START
    msUntilChange  = nextDay * 60_000
  }

  return { status, msUntilChange, openTime: '9:15 AM', closeTime: '3:30 PM', currentIST }
}

export function isMarketOpen(now: Date = new Date()): boolean {
  return getMarketInfo(now).status === 'OPEN'
}

/** Returns { hours, minutes, dayOfWeek } in IST. Replaces the buggy UTC version. */
export function getNSETime(now: Date = new Date()): { hours: number; minutes: number; dayOfWeek: number } {
  const ist = toIST(now)
  return {
    hours:      ist.getHours(),
    minutes:    ist.getMinutes(),
    dayOfWeek:  ist.getDay(),
  }
}

export function isWeekend(now: Date = new Date()): boolean {
  return !isISTWeekday(now)
}

/** Engine wake-up: from 9:00 AM IST on weekdays. */
export function isEngineStartTime(now: Date = new Date()): boolean {
  if (!isISTWeekday(now)) return false
  return istMinuteOfDay(now) >= ENGINE_START
}

/** Active scan window: 9:15 AM-3:45 PM IST on weekdays. */
export function isScanWindow(now: Date = new Date()): boolean {
  if (!isISTWeekday(now)) return false
  const m = istMinuteOfDay(now)
  return m >= MARKET_OPEN && m <= SCAN_WINDOW_END
}

/** Engine shutdown: after 3:45 PM IST or on weekends. */
export function isShutdownTime(now: Date = new Date()): boolean {
  if (!isISTWeekday(now)) return true
  return istMinuteOfDay(now) > SCAN_WINDOW_END
}

/**
 * End-of-day force-close window: from 2:45 PM IST.
 * Block new entries and close all open intraday positions.
 */
export function isEODCloseTime(now: Date = new Date()): boolean {
  if (!isISTWeekday(now)) return false
  return istMinuteOfDay(now) >= EOD_CLOSE_TIME
}

/** Format current IST time as "YYYY-MM-DD HH:MM:SS IST". */
export function formatISTTime(now: Date = new Date()): string {
  const ist = toIST(now)
  return ist.toISOString().replace('T', ' ').substring(0, 19) + ' IST'
}

/** Format ms duration as "2h 14m" or "45m". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000)
  const hours        = Math.floor(totalMinutes / 60)
  const minutes      = totalMinutes % 60
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
}

/** Returns 'MORNING' | 'MIDDAY' | 'AFTERNOON' for a given time. */
export function getSession(now: Date = new Date()): 'MORNING' | 'MIDDAY' | 'AFTERNOON' {
  const m = istMinuteOfDay(now)
  if (m < 11 * 60 + 30) return 'MORNING'     // 9:15 AM-11:30 AM
  if (m < 13 * 60)      return 'MIDDAY'       // 11:30 AM-1:00 PM
  return 'AFTERNOON'                           // 1:00 PM-3:30 PM
}
