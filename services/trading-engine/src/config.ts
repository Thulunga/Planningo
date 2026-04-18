/**
 * Service configuration — environment variable validation and market-hours helpers.
 * Market-hours logic (IST-correct) is re-exported from @planningo/trading-core.
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
      `${key} must be a UUID — got "${val}"\n` +
      `  Hint: SELECT id FROM profiles WHERE email = 'your@email.com';`
    )
  }
  return val
}

export const config = {
  supabaseUrl:              required('SUPABASE_URL'),
  supabaseServiceRoleKey:   required('SUPABASE_SERVICE_ROLE_KEY'),
  adminUserId:              requiredUUID('ADMIN_USER_ID'),
  engineVersion:            process.env.ENGINE_VERSION ?? '1.1.0',
  scanIntervalSeconds:      parseInt(process.env.SCAN_INTERVAL_SECONDS ?? '60', 10),
  heartbeatIntervalSeconds: 30,
}

// Re-export IST-correct market-hours helpers from the shared core package.
// The original service had a bug: it used now.getUTCDay() for day-of-week
// which is wrong at IST day boundaries (Sunday 11:30 PM UTC = Monday IST).
export {
  getNSETime, isWeekend, isEngineStartTime,
  isScanWindow, isShutdownTime, isEODCloseTime,
  formatISTTime,
} from '@planningo/trading-core'
