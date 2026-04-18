/**
 * Trading Engine — main orchestrator.
 *
 * Startup:
 *   1. Validate env vars
 *   2. Start heartbeat (writes STARTING → Supabase)
 *   3. Wait for market open (9:15 AM IST)
 *   4. Snapshot start-of-day equity for daily loss tracking
 *   5. Enter scan loop (every SCAN_INTERVAL_SECONDS)
 *   6. At 3:45 PM IST → write final STOPPING heartbeat → exit
 *
 * On Railway:
 *   - Build context: monorepo root
 *   - Dockerfile: services/trading-engine/Dockerfile
 *   - Deploy via Railway cron each morning at 8:55 AM IST (3:25 AM UTC)
 *   - Service exits cleanly after market close, costs ~$0 overnight
 */

import { config, isScanWindow, isShutdownTime, isEODCloseTime, formatISTTime } from './config'
import { startHeartbeat, stopHeartbeat, updateHeartbeatState } from './heartbeat'
import { runScanCycle } from './scanner'
import { forceCloseAllPositions, resetDailyRiskState, loadEngineState } from './paper-trader'
import { db } from './supabase'

console.log('═'.repeat(60))
console.log('  📈  PLANNINGO TRADING ENGINE v' + config.engineVersion)
console.log('  Admin:', config.adminUserId.substring(0, 8) + '...')
console.log('  Scan interval:', config.scanIntervalSeconds + 's')
console.log('═'.repeat(60))

let running = true
let scanLoopTimeout: ReturnType<typeof setTimeout> | null = null
let eodCloseDone = false

async function shutdown(reason: string): Promise<void> {
  if (!running) return
  running = false
  console.log(`\n[engine] Shutting down: ${reason}`)
  if (scanLoopTimeout) clearTimeout(scanLoopTimeout)
  await stopHeartbeat('STOPPING')
  console.log('[engine] Goodbye.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM received'))
process.on('SIGINT',  () => shutdown('SIGINT received (Ctrl+C)'))

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

async function scanLoop(): Promise<void> {
  while (running) {
    if (isShutdownTime()) {
      await shutdown('Market closed (3:45 PM IST)')
      return
    }

    if (!isScanWindow()) {
      await new Promise((r) => { scanLoopTimeout = setTimeout(r, 60_000) })
      continue
    }

    // EOD force-close at 2:45 PM IST — runs once per session
    if (!eodCloseDone && isEODCloseTime()) {
      eodCloseDone = true
      console.log(`\n[engine] ⏰ 2:45 PM IST — end-of-day close @ ${formatISTTime()}`)
      const closed = await forceCloseAllPositions(config.adminUserId)
      console.log(`[engine] EOD: closed ${closed} open position(s).`)
      updateHeartbeatState({ currentSymbol: null })
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

    const waitMs = config.scanIntervalSeconds * 1000
    console.log(`[engine] Next scan in ${config.scanIntervalSeconds}s (${formatISTTime()})`)
    await new Promise((r) => { scanLoopTimeout = setTimeout(r, waitMs) })
  }
}

async function snapshotStartOfDayEquity(): Promise<void> {
  // First try to restore persisted state from a previous run today
  await loadEngineState(config.adminUserId)

  const { data } = await db('paper_portfolio')
    .select('available_cash').eq('user_id', config.adminUserId).single()

  const { data: openTrades } = await db('paper_trades')
    .select('entry_price, quantity').eq('user_id', config.adminUserId).eq('status', 'OPEN')

  const locked = (openTrades ?? []).reduce(
    (s: number, t: { entry_price: number; quantity: number }) => s + t.entry_price * t.quantity, 0
  )
  const equity = (data?.available_cash ?? 0) + locked

  // Only overwrite start-of-day equity if no persisted state exists for today.
  // If loadEngineState restored a value, keep it (it was set at true market open).
  const { data: existing } = await db('engine_state')
    .select('id').eq('admin_user_id', config.adminUserId)
    .eq('trading_day', new Date().toISOString().substring(0, 10))
    .single()

  if (!existing) {
    await resetDailyRiskState(equity)
    console.log(`[engine] Start-of-day equity snapshot: ₹${equity.toFixed(0)}`)
  } else {
    console.log(`[engine] Resumed from persisted state (restart mid-session)`)
  }
}

async function main(): Promise<void> {
  await startHeartbeat()
  updateHeartbeatState({ status: 'STARTING' })

  if (isShutdownTime()) {
    console.log('[engine] Started after market close — exiting.')
    await shutdown('Started after market close')
    return
  }

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

  await snapshotStartOfDayEquity()

  console.log(`[engine] Market open — starting scan loop @ ${formatISTTime()}`)
  await scanLoop()
}

main().catch(async (err) => {
  console.error('[engine] Fatal error:', err)
  await stopHeartbeat('OFFLINE')
  process.exit(1)
})
