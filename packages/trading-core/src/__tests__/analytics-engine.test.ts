import { describe, it, expect } from 'vitest'
import { computeMetrics, buildEquityCurve } from '../analytics-engine'
import type { SimulatedTrade } from '../types'

function makeTrade(
  id: string, pnl: number, exitReason = 'SIGNAL_SELL',
  durationMinutes = 30
): SimulatedTrade {
  const entry  = new Date('2024-01-15T09:30:00Z')
  const exit   = new Date(entry.getTime() + durationMinutes * 60_000)
  return {
    id, symbol: 'TEST.NS',
    side:       'LONG',
    entryTime:  entry,
    entryPrice: 100,
    exitTime:   exit,
    exitPrice:  100 + pnl / 10,
    quantity:   10,
    stopLoss:   97,
    target:     106,
    pnl,
    pnlPct:     pnl,
    rMultiple:  pnl / 30,  // rough
    status:     exitReason === 'STOP_HIT' ? 'STOPPED_OUT' : 'CLOSED',
    exitReason,
    durationMinutes,
  }
}

describe('computeMetrics', () => {
  it('returns empty metrics for zero trades', () => {
    const m = computeMetrics([], 100_000)
    expect(m.totalTrades).toBe(0)
    expect(m.totalReturn).toBe(0)
    expect(m.sharpeRatio).toBeNull()
  })

  it('computes correct win rate', () => {
    const trades = [
      makeTrade('1', 100),
      makeTrade('2', 200),
      makeTrade('3', -50, 'STOP_HIT'),
    ]
    const m = computeMetrics(trades, 100_000)
    expect(m.totalTrades).toBe(3)
    expect(m.winningTrades).toBe(2)
    expect(m.losingTrades).toBe(1)
    expect(m.winRate).toBeCloseTo(66.67, 1)
  })

  it('computes profit factor', () => {
    const trades = [
      makeTrade('1', 300),
      makeTrade('2', -100, 'STOP_HIT'),
    ]
    const m = computeMetrics(trades, 100_000)
    expect(m.profitFactor).toBe(3)
  })

  it('returns Infinity profit factor when no losses', () => {
    const trades = [makeTrade('1', 100), makeTrade('2', 200)]
    const m = computeMetrics(trades, 100_000)
    expect(m.profitFactor).toBe(Infinity)
  })

  it('computes total return abs', () => {
    const trades = [makeTrade('1', 500), makeTrade('2', -100)]
    const m = computeMetrics(trades, 100_000)
    expect(m.totalReturnAbs).toBe(400)
    expect(m.totalReturn).toBeCloseTo(0.4, 1)
  })

  it('computes max drawdown (negative)', () => {
    // equity goes 100000 → 100500 (win) → 100400 (small loss) → 99900 (big loss)
    const trades = [
      makeTrade('1', 500),
      makeTrade('2', -100),
      makeTrade('3', -500),
    ]
    const m = computeMetrics(trades, 100_000)
    expect(m.maxDrawdown).toBeLessThan(0)
    expect(m.maxDrawdownAbs).toBeLessThan(0)
  })
})

describe('buildEquityCurve', () => {
  it('starts at initialCapital and reflects trade P&L', () => {
    const trades = [makeTrade('1', 500), makeTrade('2', -200)]
    const curve  = buildEquityCurve(trades, 100_000)
    expect(curve.length).toBe(3)  // start + 2 trades
    const last = curve[curve.length - 1]!
    expect(last.equity).toBe(100_300)
  })

  it('computes drawdown correctly', () => {
    const trades = [makeTrade('1', 1000), makeTrade('2', -500)]
    const curve  = buildEquityCurve(trades, 100_000)
    const afterWin  = curve[1]!
    const afterLoss = curve[2]!
    expect(afterWin.drawdown).toBe(0)   // at peak
    expect(afterLoss.drawdown).toBeLessThan(0)  // below peak
  })
})
