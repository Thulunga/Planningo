/**
 * Trade simulation primitives for backtesting.
 * Handles fill simulation (slippage), brokerage charges, and trade lifecycle.
 */

import type { BacktestConfig, Candle, SimulatedTrade, SignalStrength, TradeSide } from './types'

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

/** Open a new simulated long (BUY) trade. */
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
    side:         'LONG',
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

/** Open a new simulated short (SELL) trade. */
export function openShortTrade(
  symbol: string,
  entryCandle: Candle,
  quantity: number,
  stopLoss: number,  // above entry for shorts
  target: number,    // below entry for shorts
  slippagePct: number,
  confluenceScore?: number,
  signalStrength?: SignalStrength,
  riskAmount?: number
): SimulatedTrade {
  // Shorting: we fill the sell at a slightly lower price (adverse slippage)
  const fillPrice = applySlippage(entryCandle.close, 'SELL', slippagePct)
  tradeSeq++
  return {
    id:           `bt-${tradeSeq}`,
    symbol,
    side:         'SHORT',
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
  // For shorts, profit direction is inverted
  const direction  = trade.side === 'SHORT' ? -1 : 1
  const unrealised = direction * (candle.close - trade.entryPrice) * trade.quantity
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
  reason: 'SIGNAL_SELL' | 'SIGNAL_BUY' | 'STOP_HIT' | 'TARGET_HIT' | 'EOD_CLOSE' | 'FORCE_CLOSE',
  config: BacktestConfig,
  overrideExitPrice?: number  // used for stop/target exact price
): SimulatedTrade {
  const isShort   = trade.side === 'SHORT'
  // Closing a long: we SELL. Closing a short: we BUY back.
  const closeDir  = isShort ? 'BUY' : 'SELL'
  const rawExit   = overrideExitPrice ?? exitCandle.close
  const exitPrice = applySlippage(rawExit, closeDir, config.slippagePct)

  // For shorts, profit = entry - exit (we sold high, bought back low)
  const grossPnl  = isShort
    ? (trade.entryPrice - exitPrice) * trade.quantity
    : (exitPrice - trade.entryPrice) * trade.quantity

  const charges     = calcCharges(trade.quantity, trade.entryPrice, exitPrice, config)
  const pnl         = parseFloat((grossPnl - charges).toFixed(2))
  const pnlPct      = parseFloat(((pnl / (trade.entryPrice * trade.quantity)) * 100).toFixed(3))
  const riskAmt     = trade.riskAmount ?? Math.abs(trade.entryPrice - trade.stopLoss) * trade.quantity
  const rMultiple   = riskAmt > 0 ? parseFloat((pnl / riskAmt).toFixed(3)) : 0
  const durationMs  = exitCandle.time * 1000 - trade.entryTime.getTime()

  const statusMap = {
    SIGNAL_SELL: 'CLOSED',
    SIGNAL_BUY:  'CLOSED',
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

  if (trade.side === 'SHORT') {
    // Short: stop is above entry (triggered when candle.high reaches it)
    if (candle.high >= trade.stopLoss) {
      return { triggered: true, reason: 'STOP_HIT', exitPrice: trade.stopLoss }
    }
    // Short: target is below entry (triggered when candle.low reaches it)
    if (candle.low <= trade.target) {
      return { triggered: true, reason: 'TARGET_HIT', exitPrice: trade.target }
    }
  } else {
    // Long: stop is below entry
    if (candle.low <= trade.stopLoss) {
      return { triggered: true, reason: 'STOP_HIT', exitPrice: trade.stopLoss }
    }
    // Long: target is above entry
    if (candle.high >= trade.target) {
      return { triggered: true, reason: 'TARGET_HIT', exitPrice: trade.target }
    }
  }
  return { triggered: false }
}

/**
 * Check if a trade has reached +1R profit (partial booking trigger).
 * Returns exit price if triggered, null otherwise.
 *
 * For LONG: 1R price = entry + (entry - stopLoss)
 * For SHORT: 1R price = entry - (stopLoss - entry)
 */
export function checkPartialBooking1R(
  trade: SimulatedTrade,
  candle: Candle
): number | null {
  if (trade.status !== 'OPEN') return null
  if (trade.partialExitPrice !== undefined) return null  // Already took partial exit

  if (trade.side === 'SHORT') {
    // Short: 1R target is below entry by (stopLoss - entry) distance
    const distance = trade.stopLoss - trade.entryPrice
    const oneRPrice = trade.entryPrice - distance

    if (candle.low <= oneRPrice) {
      return oneRPrice
    }
  } else {
    // Long: 1R target is above entry by (entry - stopLoss) distance
    const distance = trade.entryPrice - trade.stopLoss
    const oneRPrice = trade.entryPrice + distance

    if (candle.high >= oneRPrice) {
      return oneRPrice
    }
  }

  return null
}

/**
 * Execute partial booking: close 50% of position at 1R level,
 * and update remaining 50% stop loss to breakeven + 0.5×ATR (lock profit, trail).
 *
 * @param trade           Trade to partially exit
 * @param oneRExitPrice   Price at which to execute partial exit (1R level)
 * @param atr             Average True Range for trailing stop calculation
 * @param candle          Candle where exit happens
 * @param config          Backtest config (for slippage/charges)
 * @returns               [closedTrade, updatedRemainingTrade]
 *                        closedTrade = 50% exited with pnl/charges
 *                        updatedRemainingTrade = remaining 50% with updated SL
 */
export function executePartialBooking(
  trade: SimulatedTrade,
  oneRExitPrice: number,
  atr: number | null,
  candle: Candle,
  config: BacktestConfig
): [SimulatedTrade, SimulatedTrade] {
  const halfQuantity = Math.floor(trade.quantity / 2)
  const remainingQuantity = trade.quantity - halfQuantity

  // ── Close 50% position ─────────────────────────────────────────────────
  const closeDir = trade.side === 'SHORT' ? 'BUY' : 'SELL'
  const exitPrice = applySlippage(oneRExitPrice, closeDir, config.slippagePct)

  const isShort = trade.side === 'SHORT'
  const grossPnlPartial = isShort
    ? (trade.entryPrice - exitPrice) * halfQuantity
    : (exitPrice - trade.entryPrice) * halfQuantity

  const chargesPartial = calcCharges(halfQuantity, trade.entryPrice, exitPrice, config)
  const pnlPartial = parseFloat((grossPnlPartial - chargesPartial).toFixed(2))

  const closedTrade: SimulatedTrade = {
    ...trade,
    quantity: halfQuantity,
    remainingQuantity: remainingQuantity,
    exitTime: new Date(candle.time * 1000),
    exitPrice,
    pnl: pnlPartial,
    pnlPct: parseFloat(((pnlPartial / (trade.entryPrice * halfQuantity)) * 100).toFixed(3)),
    rMultiple: trade.riskAmount ? parseFloat((pnlPartial / (trade.riskAmount * 0.5)).toFixed(3)) : 0,
    status: 'CLOSED',
    exitReason: 'PARTIAL_1R',
    chargesTotal: chargesPartial,
    partialExitPrice: exitPrice,
    partialExitTime: new Date(candle.time * 1000),
    durationMinutes: Math.round((candle.time * 1000 - trade.entryTime.getTime()) / 60_000),
  }

  // ── Update remaining 50% with trailing stop ──────────────────────────
  // Move SL to breakeven + 0.5×ATR (lock profit, allow some room to trail)
  const trailingStopValue = atr ? atr * 0.5 : Math.abs(trade.entryPrice - trade.stopLoss) * 0.25
  const newStopLoss = isShort
    ? trade.entryPrice + trailingStopValue  // For shorts, SL is above
    : trade.entryPrice - trailingStopValue  // For longs, SL is below

  const remainingTrade: SimulatedTrade = {
    ...trade,
    quantity: remainingQuantity,
    remainingQuantity: remainingQuantity,
    stopLoss: parseFloat(newStopLoss.toFixed(2)),
    trailingStopPrice: parseFloat(newStopLoss.toFixed(2)),
    partialExitPrice: exitPrice,
    partialExitTime: new Date(candle.time * 1000),
    // Keep other fields: entryPrice, entryTime, target, etc.
  }

  return [closedTrade, remainingTrade]
}

/**
 * Update trailing stop for remaining position after partial exit.
 * Trail by recent swing low/high (or ATR-based).
 *
 * For LONG: trail stop by lowest close since 1R exit - 1.5×ATR
 * For SHORT: trail stop by highest close since 1R exit + 1.5×ATR
 */
export function updateTrailingStop(
  trade: SimulatedTrade,
  recentCandles: Candle[],
  atr: number | null
): void {
  if (trade.status !== 'OPEN') return
  if (trade.partialExitTime === undefined) return  // No partial exit yet

  const effectiveAtr = atr ?? Math.abs(trade.entryPrice - trade.stopLoss) * 0.2

  if (trade.side === 'SHORT') {
    // Short: trail stop by highest close - 1.5×ATR (allow room to trail up)
    const recentHigh = Math.max(...recentCandles.map((c) => c.close))
    const newTrailingStop = recentHigh + effectiveAtr * 1.5
    if (newTrailingStop < trade.trailingStopPrice!) {
      trade.trailingStopPrice = parseFloat(newTrailingStop.toFixed(2))
    }
  } else {
    // Long: trail stop by lowest close + 1.5×ATR (allow room to trail down slightly)
    const recentLow = Math.min(...recentCandles.map((c) => c.close))
    const newTrailingStop = recentLow - effectiveAtr * 1.5
    if (newTrailingStop > trade.trailingStopPrice!) {
      trade.trailingStopPrice = parseFloat(newTrailingStop.toFixed(2))
    }
  }
}

/**
 * Check if trailing stop is hit for a partially-exited trade.
 * Returns exit price if triggered, null otherwise.
 */
export function checkTrailingStopHit(
  trade: SimulatedTrade,
  candle: Candle
): number | null {
  if (trade.status !== 'OPEN') return null
  if (!trade.trailingStopPrice) return null

  if (trade.side === 'SHORT') {
    // Short: stop is above entry
    if (candle.high >= trade.trailingStopPrice) {
      return trade.trailingStopPrice
    }
  } else {
    // Long: stop is below entry
    if (candle.low <= trade.trailingStopPrice) {
      return trade.trailingStopPrice
    }
  }

  return null
}

