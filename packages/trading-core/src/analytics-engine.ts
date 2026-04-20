/**
 * Analytics Engine - compute performance metrics and equity curve
 * from a set of closed simulated trades.
 */

import type { SimulatedTrade, PerformanceMetrics, EquityPoint } from './types'

// ── Core metrics ──────────────────────────────────────────────────────────────

export function computeMetrics(
  trades: SimulatedTrade[],
  initialCapital: number
): PerformanceMetrics {
  const closed = trades.filter((t) => t.pnl !== undefined)

  if (closed.length === 0) {
    return emptyMetrics(initialCapital)
  }

  const pnls         = closed.map((t) => t.pnl!)
  const wins         = closed.filter((t) => t.pnl! > 0)
  const losses       = closed.filter((t) => t.pnl! <= 0)

  const totalReturnAbs = pnls.reduce((s, p) => s + p, 0)
  const totalReturn    = parseFloat(((totalReturnAbs / initialCapital) * 100).toFixed(2))

  const grossProfit = wins.reduce((s, t) => s + t.pnl!, 0)
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl!, 0))
  const profitFactor = grossLoss === 0
    ? (grossProfit > 0 ? Infinity : 1)
    : parseFloat((grossProfit / grossLoss).toFixed(3))

  const winRate    = parseFloat(((wins.length / closed.length) * 100).toFixed(2))
  const avgWin     = wins.length > 0
    ? parseFloat((grossProfit / wins.length).toFixed(2))
    : 0
  const avgLoss    = losses.length > 0
    ? parseFloat((-grossLoss  / losses.length).toFixed(2))
    : 0
  const avgTrade   = parseFloat((totalReturnAbs / closed.length).toFixed(2))

  const durations  = closed.filter((t) => t.durationMinutes !== undefined).map((t) => t.durationMinutes!)
  const avgDuration = durations.length > 0
    ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length)
    : 0

  const bestTrade  = Math.max(...pnls)
  const worstTrade = Math.min(...pnls)

  const { pct: maxDrawdown, abs: maxDrawdownAbs } = computeMaxDrawdown(
    buildEquityCurve(closed, initialCapital)
  )
  const sharpeRatio = computeSharpe(pnls, initialCapital)

  return {
    totalReturn, totalReturnAbs: parseFloat(totalReturnAbs.toFixed(2)),
    winRate, profitFactor,
    maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
    maxDrawdownAbs: parseFloat(maxDrawdownAbs.toFixed(2)),
    sharpeRatio,
    totalTrades:   closed.length,
    winningTrades: wins.length,
    losingTrades:  losses.length,
    averageWin:    avgWin,
    averageLoss:   avgLoss,
    averageTrade:  avgTrade,
    averageDurationMinutes: avgDuration,
    bestTrade:  parseFloat(bestTrade.toFixed(2)),
    worstTrade: parseFloat(worstTrade.toFixed(2)),
  }
}

// ── Equity curve ──────────────────────────────────────────────────────────────

/**
 * Build a chronological equity curve from closed trades.
 * Each point represents equity immediately after a trade closes.
 */
export function buildEquityCurve(
  trades: SimulatedTrade[],
  initialCapital: number
): EquityPoint[] {
  const sorted = [...trades]
    .filter((t) => t.exitTime !== undefined && t.pnl !== undefined)
    .sort((a, b) => a.exitTime!.getTime() - b.exitTime!.getTime())

  const curve: EquityPoint[] = []
  let equity = initialCapital
  let peak   = initialCapital

  // Prepend start point
  curve.push({ time: sorted[0]?.exitTime ?? new Date(), equity, drawdown: 0, drawdownAbs: 0 })

  for (const trade of sorted) {
    equity   += trade.pnl!
    peak      = Math.max(peak, equity)
    const dd  = equity - peak
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0
    curve.push({
      time:        trade.exitTime!,
      equity:      parseFloat(equity.toFixed(2)),
      drawdown:    parseFloat(ddPct.toFixed(3)),
      drawdownAbs: parseFloat(dd.toFixed(2)),
    })
  }

  return curve
}

// ── Drawdown ──────────────────────────────────────────────────────────────────

function computeMaxDrawdown(curve: EquityPoint[]): { pct: number; abs: number } {
  if (curve.length === 0) return { pct: 0, abs: 0 }
  const worstPct = Math.min(...curve.map((p) => p.drawdown))
  const worstAbs = Math.min(...curve.map((p) => p.drawdownAbs))
  return { pct: worstPct, abs: worstAbs }
}

// ── Sharpe ratio ─────────────────────────────────────────────────────────────

/**
 * Simplified Sharpe ratio: (mean trade return pct) / std(trade return pct) × sqrt(tradesPerYear).
 * Returns null if fewer than 10 trades (not statistically meaningful).
 *
 * For intraday NSE: ~250 trading days × ~2 trades/day ≈ 500 trades/year (rough).
 * We use per-trade annualisation: sqrt(500) ≈ 22.4.
 */
function computeSharpe(
  tradePnls: number[],
  initialCapital: number,
  annualisationFactor: number = 22.4
): number | null {
  if (tradePnls.length < 10) return null

  const returns = tradePnls.map((p) => p / initialCapital)
  const mean    = returns.reduce((s, r) => s + r, 0) / returns.length
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1)
  const stdDev  = Math.sqrt(variance)

  if (stdDev === 0) return null

  return parseFloat(((mean / stdDev) * annualisationFactor).toFixed(3))
}

// ── Analytics breakdown (for feature/outcome tables) ─────────────────────────

export interface TradeBreakdown {
  winRateBySession: Record<string, { wins: number; total: number; rate: number }>
  winRateByStrength: Record<string, { wins: number; total: number; rate: number }>
  winRateByConfluenceScore: Record<number, { wins: number; total: number; rate: number }>
  avgRMultiple: number | null
}

/**
 * Compute additional breakdowns useful for the analytics dashboard.
 */
export function computeBreakdowns(trades: SimulatedTrade[]): TradeBreakdown {
  const bySession:    Record<string, { wins: number; total: number }> = {}
  const byStrength:   Record<string, { wins: number; total: number }> = {}
  const byConfluence: Record<number,  { wins: number; total: number }> = {}

  const rMultiples: number[] = []

  for (const t of trades) {
    if (t.pnl === undefined) continue
    const won = t.pnl > 0

    // Placeholder: session is not stored on SimulatedTrade; skip breakdown
    // (feature table would supply this in the live analytics path)

    const strength = t.signalStrength ?? 'UNKNOWN'
    if (!byStrength[strength]) byStrength[strength] = { wins: 0, total: 0 }
    byStrength[strength]!.total++
    if (won) byStrength[strength]!.wins++

    const score = t.confluenceScore ?? -1
    if (!byConfluence[score]) byConfluence[score] = { wins: 0, total: 0 }
    byConfluence[score]!.total++
    if (won) byConfluence[score]!.wins++

    if (t.rMultiple !== undefined) rMultiples.push(t.rMultiple)
  }

  const toRate = (m: Record<string | number, { wins: number; total: number }>) => {
    const out: Record<string, { wins: number; total: number; rate: number }> = {}
    for (const [k, v] of Object.entries(m)) {
      out[k] = { ...v, rate: v.total > 0 ? parseFloat(((v.wins / v.total) * 100).toFixed(1)) : 0 }
    }
    return out
  }

  const avgRMultiple = rMultiples.length > 0
    ? parseFloat((rMultiples.reduce((s, r) => s + r, 0) / rMultiples.length).toFixed(3))
    : null

  return {
    winRateBySession:         toRate(bySession),
    winRateByStrength:        toRate(byStrength),
    winRateByConfluenceScore: toRate(byConfluence) as unknown as Record<number, { wins: number; total: number; rate: number }>,
    avgRMultiple,
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyMetrics(initialCapital: number): PerformanceMetrics {
  return {
    totalReturn: 0, totalReturnAbs: 0, winRate: 0, profitFactor: 1,
    maxDrawdown: 0, maxDrawdownAbs: 0, sharpeRatio: null,
    totalTrades: 0, winningTrades: 0, losingTrades: 0,
    averageWin: 0, averageLoss: 0, averageTrade: 0,
    averageDurationMinutes: 0, bestTrade: 0, worstTrade: 0,
  }
}
