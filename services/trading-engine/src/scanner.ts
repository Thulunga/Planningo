/**
 * Scanner - reads the watchlist, runs all indicators per symbol,
 * generates signals, writes scan_logs + trading_signals, executes paper trades.
 *
 * One full pass = one "scan cycle".
 */

import { db } from './supabase'
import { config, formatISTTime } from './config'
import { fetchCandles } from './market-data'
import { calculateIndicators } from './indicators'
import { generateSignal, isActionableSignal } from './signal-engine'
import { executePaperTrade, checkStopLossAndTargets } from './paper-trader'
import { updateHeartbeatState } from './heartbeat'
import { getTrendContext, DEFAULT_HTF_CONFIG } from '@planningo/trading-core'

let totalScanCount  = 0
let totalSignalCount = 0

function toDbConfluenceScore(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(raw)) return null
  return Math.max(0, Math.min(6, Math.round(raw)))
}

/**
 * Load the admin user's active watchlist from Supabase.
 */
async function loadWatchlist(): Promise<Array<{ symbol: string; display_name: string }>> {
  const { data, error } = await db('trading_watchlist')
    .select('symbol, display_name')
    .eq('user_id', config.adminUserId)
    .eq('is_active', true)

  if (error) {
    console.error('[scanner] Failed to load watchlist:', error)
    if (error.code === '22P02') {
      console.error('[scanner] ⚠  ADMIN_USER_ID is not a valid UUID - update this env var in Railway')
    }
    return []
  }
  return data ?? []
}

/**
 * Run a complete scan cycle across all watchlist symbols.
 * Returns the number of signals generated.
 */
export async function runScanCycle(): Promise<number> {
  const watchlist = await loadWatchlist()
  if (watchlist.length === 0) {
    console.log('[scanner] No active symbols in watchlist - skipping scan')
    return 0
  }

  totalScanCount++
  let cycleSignals = 0

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`[scanner] Scan #${totalScanCount} @ ${formatISTTime()} - ${watchlist.length} symbols`)
  console.log('═'.repeat(60))

  updateHeartbeatState({
    status: 'RUNNING',
    scanCount: totalScanCount,
    symbolsWatched: watchlist.length,
  })

  // Check stop losses and targets first
  await checkStopLossAndTargets(config.adminUserId)

  // Process each symbol sequentially to avoid rate limiting
  for (const { symbol } of watchlist) {
    updateHeartbeatState({ currentSymbol: symbol })
    await scanSymbol(symbol)

    // Small delay between Yahoo Finance calls
    await new Promise((r) => setTimeout(r, 800))
  }

  totalSignalCount += cycleSignals
  updateHeartbeatState({ currentSymbol: null, signalCount: totalSignalCount })

  console.log(`[scanner] Cycle complete - ${cycleSignals} signals generated`)
  return cycleSignals

  /**
   * Inner function: scan one symbol and persist results.
   */
  async function scanSymbol(symbol: string): Promise<void> {
    try {
      const candles = await fetchCandles(symbol, 100)

      if (candles.length < 35) {
        console.log(`[scanner] ${symbol}: Insufficient candles (${candles.length}) - skipping`)
        await writeScanLog(symbol, null, null, null, {}, 0, 'HOLD', null, 'SKIPPED', 'Insufficient candle data', null)
        return
      }

      const indicators = calculateIndicators(candles)
      const trendContext = getTrendContext(candles, DEFAULT_HTF_CONFIG)
      const signal     = generateSignal(indicators, candles, undefined, trendContext)
      const dbConfluenceScore = toDbConfluenceScore(signal.confluenceScore)

      // Format vote map for DB storage
      const votesMap: Record<string, number> = {}
      const keyMap: Record<string, string> = {
        'EMA Cross': 'ema_cross', 'RSI(14)': 'rsi', 'MACD': 'macd',
        'Supertrend': 'supertrend', 'BB Bands': 'bb', 'VWAP': 'vwap',
      }
      for (const v of signal.votes) {
        const key = keyMap[v.name] ?? v.name.toLowerCase()
        votesMap[key] = v.vote === 'BUY' ? 1 : v.vote === 'SELL' ? -1 : 0
      }

      // Log to console with visual breakdown
      printScanResult(symbol, signal)

      // Persist signal to trading_signals if actionable (BUY/SELL)
      let savedSignalId: string | null = null
      if (signal.type !== 'HOLD') {
        const { data: savedSignal, error: sigErr } = await db('trading_signals').insert({
          user_id:         config.adminUserId,
          symbol,
          signal_type:     signal.type,
          strength:        signal.strength,
          price:           signal.price,
          indicators: {
            rsi:            indicators.rsi,
            macd:           indicators.macd,
            macdSignal:     indicators.macdSignal,
            macdHistogram:  indicators.macdHistogram,
            ema9:           indicators.ema9,
            ema21:          indicators.ema21,
            bbUpper:        indicators.bbUpper,
            bbMiddle:       indicators.bbMiddle,
            bbLower:        indicators.bbLower,
            supertrend:     indicators.supertrend,
            supertrendLine: indicators.supertrendLine,
            atr:            indicators.atr,
            vwap:           indicators.vwap,
          },
          confluence_score: dbConfluenceScore,
          candle_time:      signal.candleTime.toISOString(),
        }).select('id').single()

        if (sigErr || !savedSignal) {
          console.error(`[scanner] Failed to save signal for ${symbol}:`, sigErr)
        } else {
          savedSignalId = savedSignal.id
          cycleSignals++
        }
      }

      // Execute paper trade if signal is actionable
      let tradeAction = 'HOLD'
      let tradeReason = 'Signal type is HOLD - no trade action'
      let tradeId: string | null = null

      if (savedSignalId && isActionableSignal(signal)) {
        const result = await executePaperTrade(config.adminUserId, {
          id:          savedSignalId,
          symbol,
          signal_type: signal.type,
          price:       signal.price,
          indicators:  { atr: indicators.atr ?? undefined },
        })
        tradeAction = result.action
        tradeReason = result.reason
        tradeId     = result.tradeId ?? null
      } else if (signal.type !== 'HOLD') {
        tradeAction = 'SKIPPED'
        tradeReason = `Signal is ${signal.strength} - not actionable (need STRONG/VERY_STRONG)`
      }

      // Write scan log
      await writeScanLog(
        symbol,
        indicators,
        signal.votes,
        dbConfluenceScore,
        signal.reasons,
        signal.confluenceScore,
        signal.type,
        signal.strength,
        tradeAction,
        tradeReason,
        tradeId
      )
    } catch (err) {
      console.error(`[scanner] Error scanning ${symbol}:`, err)
    }
  }
}

/**
 * Persist a scan log entry to Supabase.
 */
async function writeScanLog(
  symbol: string,
  indicators: ReturnType<typeof calculateIndicators> | null,
  votes: Array<{ name: string; vote: string; value: string; reason: string }> | null,
  confluenceScore: number | null,
  reasons: Record<string, string>,
  _score: number,
  signalType: string,
  signalStrength: string | null,
  tradeAction: string,
  tradeReason: string,
  tradeId: string | null
): Promise<void> {
  const votesMap: Record<string, number> = {}
  if (votes) {
    const keyMap: Record<string, string> = {
      'EMA Cross': 'ema_cross', 'RSI(14)': 'rsi', 'MACD': 'macd',
      'Supertrend': 'supertrend', 'BB Bands': 'bb', 'VWAP': 'vwap',
    }
    for (const v of votes) {
      const key = keyMap[v.name] ?? v.name.toLowerCase()
      votesMap[key] = v.vote === 'BUY' ? 1 : v.vote === 'SELL' ? -1 : 0
    }
  }

  const { error } = await db('scan_logs').insert({
    user_id:          config.adminUserId,
    symbol,
    scanned_at:       new Date().toISOString(),
    price:            indicators?.close ?? null,
    rsi:              indicators?.rsi ?? null,
    macd:             indicators?.macd ?? null,
    macd_signal:      indicators?.macdSignal ?? null,
    macd_histogram:   indicators?.macdHistogram ?? null,
    ema9:             indicators?.ema9 ?? null,
    ema21:            indicators?.ema21 ?? null,
    bb_upper:         indicators?.bbUpper ?? null,
    bb_middle:        indicators?.bbMiddle ?? null,
    bb_lower:         indicators?.bbLower ?? null,
    supertrend:       indicators?.supertrend ?? null,
    supertrend_line:  indicators?.supertrendLine ?? null,
    atr:              indicators?.atr ?? null,
    vwap:             indicators?.vwap ?? null,
    votes:            votesMap,
    confluence_score: confluenceScore,
    signal_type:      signalType,
    signal_strength:  signalStrength,
    reasons,
    trade_action:     tradeAction,
    trade_reason:     tradeReason,
    trade_id:         tradeId,
  })

  if (error) console.error(`[scanner] scan_logs insert error for ${symbol}:`, error)
}

/**
 * Pretty-print a scan result to the console.
 */
function printScanResult(symbol: string, signal: ReturnType<typeof generateSignal>): void {
  const icon   = signal.type === 'BUY' ? '🟢' : signal.type === 'SELL' ? '🔴' : '⚪'
  const price  = `₹${signal.price.toFixed(2)}`
  const score  = `[${signal.confluenceScore.toFixed(1)}/9.5]`
  const header = `${icon} ${symbol.padEnd(16)} ${price.padStart(12)}  ${signal.type.padEnd(4)}  ${signal.strength.padEnd(12)} ${score}`

  console.log(header)
  for (const v of signal.votes) {
    const voteIcon = v.vote === 'BUY' ? '  ✅' : v.vote === 'SELL' ? '  ❌' : '  ⚪'
    console.log(`${voteIcon} ${v.name.padEnd(12)}: ${v.value}`)
    console.log(`      ${v.reason}`)
  }
  if (signal.type !== 'HOLD') {
    console.log(`  → SIGNAL: ${signal.type} (${signal.strength})`)
  }
  console.log()
}
