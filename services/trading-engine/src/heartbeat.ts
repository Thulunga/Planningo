/**
 * Service heartbeat - writes a single row to `service_heartbeat` every 30s.
 * The UI subscribes via Supabase Realtime to show ONLINE/OFFLINE status.
 */

import { db } from './supabase'
import { config, formatISTTime } from './config'

interface HeartbeatState {
  status: 'STARTING' | 'RUNNING' | 'STOPPING' | 'OFFLINE'
  scanCount: number
  signalCount: number
  symbolsWatched: number
  currentSymbol: string | null
}

let heartbeatInterval: ReturnType<typeof setInterval> | null = null
let state: HeartbeatState = {
  status:         'STARTING',
  scanCount:      0,
  signalCount:    0,
  symbolsWatched: 0,
  currentSymbol:  null,
}

/**
 * Update in-memory state - next heartbeat upsert will carry these values.
 */
export function updateHeartbeatState(patch: Partial<HeartbeatState>): void {
  state = { ...state, ...patch }
}

/**
 * Write (upsert) the current state to Supabase.
 */
async function writeHeartbeat(): Promise<void> {
  try {
    await db('service_heartbeat').upsert(
      {
        service_name:   'trading-engine',
        status:         state.status,
        last_heartbeat: new Date().toISOString(),
        scan_count:     state.scanCount,
        signal_count:   state.signalCount,
        symbols_watched: state.symbolsWatched,
        current_symbol: state.currentSymbol,
        engine_version: config.engineVersion,
      },
      { onConflict: 'service_name' }
    )
    console.log(`[heartbeat] ${formatISTTime()} - ${state.status} | scans:${state.scanCount} signals:${state.signalCount}`)
  } catch (err) {
    console.error('[heartbeat] Write failed:', err)
  }
}

/**
 * Start sending heartbeats every `intervalSeconds` seconds.
 */
export async function startHeartbeat(): Promise<void> {
  // Write immediately on start
  await writeHeartbeat()

  heartbeatInterval = setInterval(writeHeartbeat, config.heartbeatIntervalSeconds * 1000)
  console.log(`[heartbeat] Started - interval: ${config.heartbeatIntervalSeconds}s`)
}

/**
 * Write a final OFFLINE/STOPPING heartbeat and stop the interval.
 */
export async function stopHeartbeat(finalStatus: 'STOPPING' | 'OFFLINE' = 'OFFLINE'): Promise<void> {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval)
    heartbeatInterval = null
  }
  updateHeartbeatState({ status: finalStatus, currentSymbol: null })
  await writeHeartbeat()
  console.log('[heartbeat] Stopped.')
}
