import { describe, it, expect } from 'vitest'
import {
  getNSETime, isWeekend, isScanWindow, isShutdownTime, isEODCloseTime,
  getMarketInfo, formatISTTime,
} from '../market-hours'

// Helper: create a Date at a specific IST time
// IST = UTC+5:30, so IST hour:min = UTC hour:min - 5:30
function istDate(isoDateIST: string): Date {
  // e.g. "2024-01-15T10:00:00" in IST → subtract 5h30m to get UTC
  const dt   = new Date(isoDateIST + '+05:30')
  return dt
}

describe('getNSETime', () => {
  it('returns correct IST hours and minutes', () => {
    const d = istDate('2024-01-15T09:15:00') // Monday 9:15 AM IST
    const t = getNSETime(d)
    expect(t.hours).toBe(9)
    expect(t.minutes).toBe(15)
    expect(t.dayOfWeek).toBe(1) // Monday
  })

  it('correctly handles UTC day boundary (Sunday 23:00 UTC = Monday 4:30 AM IST)', () => {
    // Sunday 23:30 UTC = Monday 05:00 AM IST
    const d = new Date('2024-01-14T23:30:00Z') // Sunday UTC
    const t = getNSETime(d)
    expect(t.dayOfWeek).toBe(1) // Monday in IST
    expect(t.hours).toBe(5)
    expect(t.minutes).toBe(0)
  })
})

describe('isWeekend', () => {
  it('returns true for Saturday IST', () => {
    expect(isWeekend(istDate('2024-01-13T10:00:00'))).toBe(true)
  })
  it('returns false for Monday IST', () => {
    expect(isWeekend(istDate('2024-01-15T10:00:00'))).toBe(false)
  })
  it('handles UTC/IST boundary correctly - Sunday 11 PM UTC = Monday IST', () => {
    // Sunday 23:00 UTC = Monday 4:30 AM IST → NOT weekend in IST
    const d = new Date('2024-01-14T23:00:00Z')
    expect(isWeekend(d)).toBe(false)
  })
})

describe('isScanWindow', () => {
  it('returns true at 10:00 AM IST on weekday', () => {
    expect(isScanWindow(istDate('2024-01-15T10:00:00'))).toBe(true)
  })
  it('returns false before 9:15 AM IST', () => {
    expect(isScanWindow(istDate('2024-01-15T09:00:00'))).toBe(false)
  })
  it('returns false after 3:45 PM IST', () => {
    expect(isScanWindow(istDate('2024-01-15T15:50:00'))).toBe(false)
  })
  it('returns false on Saturday', () => {
    expect(isScanWindow(istDate('2024-01-13T10:00:00'))).toBe(false)
  })
})

describe('isEODCloseTime', () => {
  it('returns true at 2:45 PM IST', () => {
    expect(isEODCloseTime(istDate('2024-01-15T14:45:00'))).toBe(true)
  })
  it('returns false at 2:44 PM IST', () => {
    expect(isEODCloseTime(istDate('2024-01-15T14:44:00'))).toBe(false)
  })
  it('returns false on weekends', () => {
    expect(isEODCloseTime(istDate('2024-01-13T15:00:00'))).toBe(false)
  })
})

describe('isShutdownTime', () => {
  it('returns true after 3:45 PM IST', () => {
    expect(isShutdownTime(istDate('2024-01-15T15:46:00'))).toBe(true)
  })
  it('returns false at 10:00 AM IST', () => {
    expect(isShutdownTime(istDate('2024-01-15T10:00:00'))).toBe(false)
  })
  it('returns true on weekends', () => {
    expect(isShutdownTime(istDate('2024-01-13T10:00:00'))).toBe(true)
  })
})

describe('getMarketInfo', () => {
  it('returns OPEN during market hours on weekday', () => {
    const info = getMarketInfo(istDate('2024-01-15T11:00:00'))
    expect(info.status).toBe('OPEN')
  })
  it('returns PRE_OPEN between 9:00 and 9:15 AM IST', () => {
    const info = getMarketInfo(istDate('2024-01-15T09:10:00'))
    expect(info.status).toBe('PRE_OPEN')
  })
  it('returns CLOSED on weekend', () => {
    const info = getMarketInfo(istDate('2024-01-13T10:00:00'))
    expect(info.status).toBe('CLOSED')
  })
})
