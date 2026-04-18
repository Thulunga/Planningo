/**
 * Deterministic backtesting engine — candle-by-candle replay with no look-ahead bias.
 *
 * Algorithm per candle:
 *   1. Check open positions: update MAE/MFE, check stop/target hits
 *   2. Skip signal generation if any stop/target was just triggered (avoid same-candle re-entry)
 *   3. Calculate indicators using ONLY candles up to and including the current candle
 *   4. Generate signal
 *   5. Run risk checks (daily loss, cooldown, R:R, position size)
 *   6. Open new position if approved and no existing position in same symbol
 *   7. At market session end: EOD-close all remaining open positions
 *
 * Limitations:
 *   - Long-only (no short selling)
 *   - One position per symbol at a time
 *   - VWAP uses a rolling wall-clock window so backtest VWAP differs slightly
 *     from live intraday VWAP (each candle's VWAP anchor is that candle's time)
 */

import { randomUUID } from 'crypto'
import type {
  Candle, BacktestConfig, BacktestResult, SimulatedTrade,
  StrategyConfig, RiskConfig,
} from './types'
import { DEFAULT_STRATEGY_CONFIG, DEFAULT_RISK_CONFIG, DEFAULT_BACKTEST_CONFIG } from './config'
import { calculateIndicators } from './indicators'
import { generateSignal, isActionableSignal } from './signal-engine'
import { validateEntry, computeStopTarget } from './risk-manager'
import {
  openTrade, closeTrade, checkStopTarget, updateMAEMFE, resetTradeSeq,
} from './trade-simulator'
import { computeMetrics, buildEquityCurve } from './analytics-engine'
import { isEODCloseTime } from './market-hours'

const IST_OFFSET_MS = (5 * 60 + 30) * 60_000

function istDayString(unixSec: number): string {
  const d = new Date(unixSec * 1000 + IST_OFFSET_MS)
  return d.toISOString().substring(0, 10)  // "YYYY-MM-DD" in IST
}

function isEODCandle(unixSec: number): boolean {
  return isEODCloseTime(new Date(unixSec * 1000))
}

/**
 * Run a backtest over a series of 5-min OHLCV candles.
 *
 * @param candles  Historical candles sorted ascending by time (entire dataset)
 * @param config   Full BacktestConfig; use buildBacktestConfig() for convenience
 */
export async function runBacktest(
  candles: Candle[],
  partialConfig: Partial<BacktestConfig> & { symbol: string; startDate: Date; endDate: Date }
): Promise<BacktestResult> {
  const config: BacktestConfig = {
    ...DEFAULT_BACKTEST_CONFIG,
    strategyConfig: DEFAULT_STRATEGY_CONFIG,
    riskConfig:     DEFAULT_RISK_CONFIG,
    ...partialConfig,
  }

  resetTradeSeq()
  const startedAt = new Date()

  // Filter candles to the requested date range (IST day comparison)
  const startDay = istDayString(Math.floor(config.startDate.getTime() / 1000))
  const endDay   = istDayString(Math.floor(config.endDate.getTime()   / 1000))
  const inRange  = candles.filter((c) => {
    const day = istDayString(c.time)
    return day >= startDay && day <= endDay
  })

  const minHistory = config.strategyConfig.minCandlesRequired

  // Backtest state
  let equity             = config.initialCapital
  let startOfDayEquity   = config.initialCapital
  let currentDay         = ''
  let lastLossTime: Date | null = null
  const openPositions    = new Map<string, SimulatedTrade>()  // symbol → trade
  const closedTrades: SimulatedTrade[] = []

  for (let i = 0; i < inRange.length; i++) {
    const candle  = inRange[i]!
    const day     = istDayString(candle.time)

    // ── Day boundary: reset daily equity snapshot ─────────────────────────
    if (day !== currentDay) {
      currentDay       = day
      startOfDayEquity = equity
    }

    // ── Step 1: Update open positions ─────────────────────────────────────
    let exitedThisCandleSymbol: string | null = null

    for (const [symbol, trade] of openPositions.entries()) {
      updateMAEMFE(trade, candle)

      const check = checkStopTarget(trade, candle)
      if (check.triggered) {
        const closed = closeTrade(trade, candle, check.reason, config, check.exitPrice)
        closedTrades.push(closed)
        openPositions.delete(symbol)
        equity = recalcEquity(equity, trade, closed)
        if (closed.status === 'STOPPED_OUT') lastLossTime = closed.exitTime!
        exitedThisCandleSymbol = symbol
      }
    }

    // ── Step 2: EOD force-close ───────────────────────────────────────────
    if (isEODCandle(candle.time) && openPositions.size > 0) {
      for (const [symbol, trade] of openPositions.entries()) {
        const closed = closeTrade(trade, candle, 'EOD_CLOSE', config)
        closedTrades.push(closed)
        equity = recalcEquity(equity, trade, closed)
      }
      openPositions.clear()
      continue
    }

    // ── Step 3: Signal generation (no look-ahead: slice up to i inclusive) ─
    if (i < minHistory - 1) continue  // not enough history yet

    const history = inRange.slice(0, i + 1)
    const indicators = calculateIndicators(history, config.strategyConfig)
    const signal     = generateSignal(indicators, history, config.strategyConfig)

    if (!isActionableSignal(signal)) continue

    // ── Step 4: Risk checks before BUY ───────────────────────────────────
    if (signal.type === 'BUY') {
      if (openPositions.has(config.symbol)) continue                            // already in position
      if (openPositions.size >= config.riskConfig.maxConcurrentPositions) continue

      // Skip if we just exited this candle (avoid re-entry same candle)
      if (exitedThisCandleSymbol === config.symbol) continue

      const riskCheck = validateEntry(
        signal.price, indicators.atr, 'BUY',
        equity, startOfDayEquity, lastLossTime, config.riskConfig,
        new Date(candle.time * 1000)
      )
      if (!riskCheck.approved) continue

      const trade = openTrade(
        config.symbol, candle, riskCheck.quantity,
        riskCheck.stopPrice, riskCheck.targetPrice,
        config.slippagePct,
        signal.confluenceScore, signal.strength, riskCheck.riskAmount
      )
      openPositions.set(config.symbol, trade)
      equity -= trade.entryPrice * trade.quantity   // deduct cost
    }

    // ── Step 5: Sell signal → close matching open position ────────────────
    if (signal.type === 'SELL' && openPositions.has(config.symbol)) {
      const trade  = openPositions.get(config.symbol)!
      const closed = closeTrade(trade, candle, 'SIGNAL_SELL', config)
      closedTrades.push(closed)
      openPositions.delete(config.symbol)
      equity = recalcEquity(equity, trade, closed)
    }
  }

  // ── Force-close any remaining open positions (end of dataset) ─────────
  const lastCandle = inRange[inRange.length - 1]
  if (lastCandle) {
    for (const [, trade] of openPositions.entries()) {
      const closed = closeTrade(trade, lastCandle, 'FORCE_CLOSE', config)
      closedTrades.push(closed)
      equity = recalcEquity(equity, trade, closed)
    }
  }

  const completedAt = new Date()
  const metrics     = computeMetrics(closedTrades, config.initialCapital)
  const equityCurve = buildEquityCurve(closedTrades, config.initialCapital)

  return {
    runId:       randomUUID(),
    config,
    trades:      closedTrades,
    metrics,
    equityCurve,
    totalCandles: inRange.length,
    startedAt,
    completedAt,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function recalcEquity(
  currentEquity: number,
  openTrade: SimulatedTrade,
  closed: SimulatedTrade
): number {
  // Add back the entry cost, then add net PnL (already charges-deducted)
  const entryCost = openTrade.entryPrice * openTrade.quantity
  return parseFloat((currentEquity + entryCost + (closed.pnl ?? 0)).toFixed(2))
}
