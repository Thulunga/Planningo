/**
 * Trading Engine — main orchestrator.
 *
 * Startup:
 *   1. Validate env vars
 *   2. Start heartbeat (writes STARTING → Supabase)
 *   3. Wait for market open (9:15 AM IST)
 *   4. Enter scan loop (every SCAN_INTERVAL_SECONDS)
 *   5. At 3:45 PM IST → write final STOPPING heartbeat → exit
 *
 * On Railway:
 *   - Deploy via Dockerfile
 *   - Use Railway cron to trigger a new deploy each morning at 8:55 AM IST (3:25 AM UTC)
 *   - Service exits cleanly after market close, costing ~$0 overnight
 */

import { config, isScanWindow, isShutdownTime, formatISTTime } from './config'
import { startHeartbeat, stopHeartbeat, updateHeartbeatState } from './heartbeat'
import { runScanCycle } from './scanner'

console.log('═'.repeat(60))
console.log('  📈  PLANNINGO TRADING ENGINE v' + config.engineVersion)
console.log('  Admin:', config.adminUserId.substring(0, 8) + '...')
console.log('  Scan interval:', config.scanIntervalSeconds + 's')
console.log('═'.repeat(60))

let running = true
let scanLoopTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Graceful shutdown handler.
 */
async function shutdown(reason: string): Promise<void> {
  if (!running) return
  running = false

  console.log(`\n[engine] Shutting down: ${reason}`)
  if (scanLoopTimeout) clearTimeout(scanLoopTimeout)

  await stopHeartbeat('STOPPING')
  console.log('[engine] Goodbye.')
  process.exit(0)
}

// Catch signals for graceful shutdown
process.on('SIGTERM', () => shutdown('SIGTERM received'))
process.on('SIGINT',  () => shutdown('SIGINT received (Ctrl+C)'))

/**
 * Wait until a condition is true, polling every `intervalMs`.
 */
function waitUntil(condition: () => boolean, intervalMs: number, label: string): Promise<void> {
  return new Promise((resolve) => {
    const check = (): void => {
      if (!running) { resolve(); return }
      if (condition()) { resolve(); return }
      console.log(`[engine] Waiting for: ${label} — ${formatISTTime()}`)
      setTimeout(check, intervalMs)
    }
    check()
  })
}

/**
 * Main scan loop.
 */
async function scanLoop(): Promise<void> {
  while (running) {
    if (isShutdownTime()) {
      await shutdown('Market closed (3:45 PM IST)')
      return
    }

    if (!isScanWindow()) {
      // Not yet in scan window — wait 60s and check again
      await new Promise((r) => { scanLoopTimeout = setTimeout(r, 60_000) })
      continue
    }

    updateHeartbeatState({ status: 'RUNNING' })

    try {
      await runScanCycle()
    } catch (err) {
      console.error('[engine] Scan cycle error:', err)
    }

    if (isShutdownTime()) {
      await shutdown('Market closed after scan (3:45 PM IST)')
      return
    }

    // Wait for next interval
    const waitMs = config.scanIntervalSeconds * 1000
    console.log(`[engine] Next scan in ${config.scanIntervalSeconds}s (${formatISTTime()})`)
    await new Promise((r) => { scanLoopTimeout = setTimeout(r, waitMs) })
  }
}

/**
 * Entry point.
 */
async function main(): Promise<void> {
  // Start heartbeat immediately so the UI shows the engine is alive
  await startHeartbeat()
  updateHeartbeatState({ status: 'STARTING' })

  // If already past shutdown time (shouldn't happen, but safety check)
  if (isShutdownTime()) {
    console.log('[engine] Started after market close — exiting.')
    await shutdown('Started after market close')
    return
  }

  // Wait until scan window opens (9:15 AM IST)
  if (!isScanWindow()) {
    await waitUntil(
      () => isScanWindow() || isShutdownTime(),
      60_000,
      '9:15 AM IST scan window'
    )
  }

  if (isShutdownTime()) {
    await shutdown('Market closed before scan started')
    return
  }

  console.log(`[engine] Market open — starting scan loop @ ${formatISTTime()}`)
  await scanLoop()
}

main().catch(async (err) => {
  console.error('[engine] Fatal error:', err)
  await stopHeartbeat('OFFLINE')
  process.exit(1)
})
