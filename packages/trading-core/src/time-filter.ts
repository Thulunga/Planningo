/**
 * Time-Based Entry Filters
 *
 * Avoids high-volatility and low-liquidity periods:
 * - First 15 minutes after market open (9:15–9:30 IST): High volatility, stop hunts
 * - Last 30 minutes before market close (3:00–3:30 IST): Low liquidity, profit-taking
 *
 * Configuration is flexible to accommodate different trading styles.
 */

export interface TimeRange {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
}

export interface TimeFilterConfig {
  /**
   * Array of time ranges to exclude from trading (IST timezone).
   * Default: Skip 9:15–9:30 and 3:00–3:30.
   */
  skipRanges: TimeRange[]
  
  /**
   * Enable/disable time filtering.
   * Default: true.
   */
  enabled: boolean
}

export const DEFAULT_TIME_FILTER_CONFIG: TimeFilterConfig = {
  skipRanges: [
    { startHour: 9, startMinute: 15, endHour: 9, endMinute: 30 },   // Market open volatility
    { startHour: 15, startMinute: 0, endHour: 15, endMinute: 30 },  // Market close low liquidity
  ],
  enabled: true,
}

/**
 * Convert Unix timestamp (seconds) to IST time.
 *
 * @param unixSec   Unix timestamp in seconds
 * @returns         { hour, minute } in IST
 */
function getISTTime(unixSec: number): { hour: number; minute: number } {
  // IST is UTC+5:30
  const istOffsetSeconds = (5 * 3600) + (30 * 60)
  const istUnixSec = unixSec + istOffsetSeconds

  // Extract hour and minute from IST timestamp
  const hour = Math.floor((istUnixSec % 86400) / 3600)
  const minute = Math.floor(((istUnixSec % 86400) % 3600) / 60)

  return { hour, minute }
}

/**
 * Check if a given time is within a skip range.
 *
 * @param hour      Hour in IST (0–23)
 * @param minute    Minute (0–59)
 * @param range     TimeRange to check against
 * @returns         true if time is within skip range
 */
function isWithinRange(hour: number, minute: number, range: TimeRange): boolean {
  const timeInMinutes = hour * 60 + minute
  const rangeStartMinutes = range.startHour * 60 + range.startMinute
  const rangeEndMinutes = range.endHour * 60 + range.endMinute

  // Handle ranges that wrap around midnight (if needed)
  if (rangeStartMinutes <= rangeEndMinutes) {
    return timeInMinutes >= rangeStartMinutes && timeInMinutes < rangeEndMinutes
  } else {
    return timeInMinutes >= rangeStartMinutes || timeInMinutes < rangeEndMinutes
  }
}

/**
 * Check if trading is allowed at the given Unix timestamp.
 *
 * @param unixSec   Unix timestamp (seconds)
 * @param config    TimeFilterConfig
 * @returns         true if trading is allowed, false if in skip range
 */
export function isTradeAllowedByTime(unixSec: number, config: TimeFilterConfig = DEFAULT_TIME_FILTER_CONFIG): boolean {
  if (!config.enabled) return true

  const istTime = getISTTime(unixSec)

  for (const range of config.skipRanges) {
    if (isWithinRange(istTime.hour, istTime.minute, range)) {
      return false
    }
  }

  return true
}

/**
 * Get human-readable IST time for logging/debugging.
 *
 * @param unixSec   Unix timestamp (seconds)
 * @returns         HH:MM IST format
 */
export function formatISTTime(unixSec: number): string {
  const istTime = getISTTime(unixSec)
  return `${String(istTime.hour).padStart(2, '0')}:${String(istTime.minute).padStart(2, '0')} IST`
}

/**
 * Get reason why a time is blocked (for logging).
 *
 * @param unixSec   Unix timestamp (seconds)
 * @param config    TimeFilterConfig
 * @returns         Description of why trading is blocked, or null if allowed
 */
export function getTimeFilterReason(unixSec: number, config: TimeFilterConfig = DEFAULT_TIME_FILTER_CONFIG): string | null {
  if (!config.enabled) return null

  const istTime = getISTTime(unixSec)

  for (const range of config.skipRanges) {
    if (isWithinRange(istTime.hour, istTime.minute, range)) {
      const timeStr = `${String(istTime.hour).padStart(2, '0')}:${String(istTime.minute).padStart(2, '0')}`
      const rangeStr = `${String(range.startHour).padStart(2, '0')}:${String(range.startMinute).padStart(2, '0')}–${String(range.endHour).padStart(2, '0')}:${String(range.endMinute).padStart(2, '0')}`
      return `⏱ Blackout time: ${timeStr} IST within blocked range ${rangeStr} IST`
    }
  }

  return null
}
