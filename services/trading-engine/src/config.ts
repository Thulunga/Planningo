/**
 * Configuration and environment variable validation.
 * Fail fast on startup if required vars are missing.
 */

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required env var: ${key}`)
  return val
}

function requiredUUID(key: string): string {
  const val = required(key)
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRe.test(val)) {
    throw new Error(
      `${key} must be a UUID (e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx") — got "${val}"\n` +
      `  Hint: run this in Supabase SQL Editor:\n` +
      `  SELECT id FROM profiles WHERE email = '${val.includes('@') ? val : 'your@email.com'}';`
    )
  }
  return val
}

export const config = {
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  adminUserId: requiredUUID('ADMIN_USER_ID'),
  engineVersion: process.env.ENGINE_VERSION ?? '1.0.0',
  scanIntervalSeconds: parseInt(process.env.SCAN_INTERVAL_SECONDS ?? '300', 10),
  heartbeatIntervalSeconds: 30,
}

// ── NSE Market Hours (IST = UTC+5:30) ────────────────────────────────────────

export function getNSETime(): { hours: number; minutes: number; dayOfWeek: number } {
  const now = new Date()
  // IST offset: UTC+5:30 (330 minutes)
  const istOffset = 5 * 60 + 30
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const istMinutes = (utcMinutes + istOffset) % (24 * 60)

  return {
    hours: Math.floor(istMinutes / 60),
    minutes: istMinutes % 60,
    dayOfWeek: now.getUTCDay(), // 0=Sun ... 6=Sat (UTC day — approx fine for IST)
  }
}

export function isWeekend(): boolean {
  const { dayOfWeek } = getNSETime()
  return dayOfWeek === 0 || dayOfWeek === 6
}

/** Returns true from 9:00 AM IST (pre-open startup) */
export function isEngineStartTime(): boolean {
  if (isWeekend()) return false
  const { hours, minutes } = getNSETime()
  const totalMinutes = hours * 60 + minutes
  return totalMinutes >= 9 * 60  // 9:00 AM IST
}

/** Returns true during active scanning window: 9:15 AM – 3:45 PM IST */
export function isScanWindow(): boolean {
  if (isWeekend()) return false
  const { hours, minutes } = getNSETime()
  const totalMinutes = hours * 60 + minutes
  return totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 45
}

/** Returns true after 3:45 PM IST — engine should shut down */
export function isShutdownTime(): boolean {
  if (isWeekend()) return true
  const { hours, minutes } = getNSETime()
  const totalMinutes = hours * 60 + minutes
  return totalMinutes > 15 * 60 + 45
}

export function formatISTTime(): string {
  const now = new Date()
  const istOffset = 5 * 60 + 30
  const utcMs = now.getTime()
  const istDate = new Date(utcMs + istOffset * 60 * 1000)
  return istDate.toISOString().replace('T', ' ').substring(0, 19) + ' IST'
}
