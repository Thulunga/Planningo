/**
 * Trade simulation primitives for backtesting.
 * Handles fill simulation (slippage), brokerage charges, and trade lifecycle.
 */

import type { BacktestConfig, Candle, SimulatedTrade, SignalStrength } from './types'

let tradeSeq = 0
export function resetTradeSeq(): void { tradeSeq = 0 }

// ── Charge calculation ────────────────────────────────────────────────────────

/**
 * Approximate Zerodha intraday MIS charges for an NSE equity round-trip.
 *
 * Components:
 *   Brokerage : brokeragePct × (buy turnover + sell turnover)
 *   STT       : sttPct × sell turnover  (intraday equity sell side)
 *   Exchange  : 0.00325% × total turnover  (NSE transaction charges)
 *   SEBI fee  : 0.0000010 × total turnover  (₹1/crore)
 *   Stamp duty: stampDutyPct × buy turnover
 *   GST       : 18% on (brokerage + exchange + SEBI)
 */
export function calcCharges(
  quantity: number,
  entryPrice: number,
  exitPrice: number,
  config: BacktestConfig
): number {
  const buyTurnover  = quantity * entryPrice
  const sellTurnover = quantity * exitPrice
  const totalTurnover = buyTurnover + sellTurnover

  const brokerage   = config.brokeragePct * totalTurnover
  const stt         = config.sttPct       * sellTurnover
  const exchangeFee = 0.0000325           * totalTurnover
  const sebiFee     = 0.000001            * totalTurnover
  const stampDuty   = config.stampDutyPct * buyTurnover
  const taxable     = brokerage + exchangeFee + sebiFee
  const gst         = 0.18 * taxable

  return parseFloat((brokerage + stt + exchangeFee + sebiFee + stampDuty + gst).toFixed(2))
}

// ── Slippage ──────────────────────────────────────────────────────────────────

/**
 * Apply slippage to a fill price.
 * BUY fills higher (adverse); SELL fills lower (adverse).
 */
export function applySlippage(
  price: number,
  direction: 'BUY' | 'SELL',
  slippagePct: number
): number {
  const factor = direction === 'BUY' ? 1 + slippagePct : 1 - slippagePct
  return parseFloat((price * factor).toFixed(2))
}

// ── Trade lifecycle ───────────────────────────────────────────────────────────

/** Open a new simulated trade. */
export function openTrade(
  symbol: string,
  entryCandle: Candle,
  quantity: number,
  stopLoss: number,
  target: number,
  slippagePct: number,
  confluenceScore?: number,
  signalStrength?: SignalStrength,
  riskAmount?: number
): SimulatedTrade {
  const fillPrice = applySlippage(entryCandle.close, 'BUY', slippagePct)
  tradeSeq++
  return {
    id:           `bt-${tradeSeq}`,
    symbol,
    entryTime:    new Date(entryCandle.time * 1000),
    entryPrice:   fillPrice,
    quantity,
    stopLoss,
    target,
    status:       'OPEN',
    confluenceScore,
    signalStrength,
    riskAmount,
    mae:          0,
    mfe:          0,
  }
}

/** Update MAE/MFE with a new candle while trade is open. */
export function updateMAEMFE(trade: SimulatedTrade, candle: Candle): void {
  if (trade.status !== 'OPEN') return
  const unrealised = (candle.close - trade.entryPrice) * trade.quantity
  if (trade.mae === undefined || unrealised < trade.mae) trade.mae = unrealised
  if (trade.mfe === undefined || unrealised > trade.mfe) trade.mfe = unrealised
}

/**
 * Close an open simulated trade.
 * Returns the trade with all result fields populated.
 */
export function closeTrade(
  trade: SimulatedTrade,
  exitCandle: Candle,
  reason: 'SIGNAL_SELL' | 'STOP_HIT' | 'TARGET_HIT' | 'EOD_CLOSE' | 'FORCE_CLOSE',
  config: BacktestConfig,
  overrideExitPrice?: number  // used for stop/target exact price
): SimulatedTrade {
  const direction   = 'SELL' // only long trades supported
  const rawExit     = overrideExitPrice ?? exitCandle.close
  const exitPrice   = applySlippage(rawExit, direction, config.slippagePct)
  const grossPnl    = (exitPrice - trade.entryPrice) * trade.quantity
  const charges     = calcCharges(trade.quantity, trade.entryPrice, exitPrice, config)
  const pnl         = parseFloat((grossPnl - charges).toFixed(2))
  const pnlPct      = parseFloat(((pnl / (trade.entryPrice * trade.quantity)) * 100).toFixed(3))
  const riskAmt     = trade.riskAmount ?? Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity
  const rMultiple   = riskAmt > 0 ? parseFloat((pnl / riskAmt).toFixed(3)) : 0
  const durationMs  = exitCandle.time * 1000 - trade.entryTime.getTime()

  const statusMap = {
    SIGNAL_SELL: 'CLOSED',
    STOP_HIT:    'STOPPED_OUT',
    TARGET_HIT:  'TARGET_HIT',
    EOD_CLOSE:   'EOD_CLOSED',
    FORCE_CLOSE: 'CLOSED',
  } as const

  return {
    ...trade,
    exitTime:         new Date(exitCandle.time * 1000),
    exitPrice,
    pnl,
    pnlPct,
    rMultiple,
    status:           statusMap[reason],
    exitReason:       reason,
    chargesTotal:     charges,
    durationMinutes:  Math.round(durationMs / 60_000),
  }
}

/**
 * Check a candle against an open trade's stop and target.
 * Returns the exit reason if triggered, or null if still open.
 * Uses candle high/low for stop/target checks (intra-candle simulation).
 */
export function checkStopTarget(
  trade: SimulatedTrade,
  candle: Candle
): { triggered: true; reason: 'STOP_HIT' | 'TARGET_HIT'; exitPrice: number } | { triggered: false } {
  if (trade.status !== 'OPEN') return { triggered: false }

  // Stop: candle low reaches or breaches the stop price
  if (candle.low <= trade.stopLoss) {
    return { triggered: true, reason: 'STOP_HIT', exitPrice: trade.stopLoss }
  }
  // Target: candle high reaches or breaches the target
  if (candle.high >= trade.target) {
    return { triggered: true, reason: 'TARGET_HIT', exitPrice: trade.target }
  }
  return { triggered: false }
}
