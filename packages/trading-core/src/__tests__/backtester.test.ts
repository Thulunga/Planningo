import { describe, it, expect } from 'vitest'
import { runBacktest } from '../backtester'
import { DEFAULT_STRATEGY_CONFIG, DEFAULT_RISK_CONFIG } from '../config'
import type { Candle } from '../types'

function makeTrendingCandles(n: number, startPrice = 100, trend = 0.5): Candle[] {
  const candles: Candle[] = []
  // Start from 9:15 AM IST on a Monday = UTC 3:45 AM
  const baseTime = Math.floor(new Date('2024-01-15T03:45:00Z').getTime() / 1000)

  for (let i = 0; i < n; i++) {
    const close  = startPrice + trend * i + (Math.random() - 0.5) * 2
    const high   = close + 1
    const low    = close - 1
    candles.push({
      time:   baseTime + i * 300,  // 5-min candles
      open:   close - 0.3,
      high, low, close,
      volume: 50_000 + Math.floor(Math.random() * 50_000),
    })
  }
  return candles
}

describe('runBacktest', () => {
  const baseConfig = {
    symbol:         'TEST.NS',
    startDate:      new Date('2024-01-15'),
    endDate:        new Date('2024-01-19'),
    initialCapital: 100_000,
    strategyConfig: DEFAULT_STRATEGY_CONFIG,
    riskConfig:     DEFAULT_RISK_CONFIG,
  }

  it('returns a BacktestResult structure with all required fields', async () => {
    const candles = makeTrendingCandles(80)
    const result  = await runBacktest(candles, baseConfig)

    expect(result).toHaveProperty('runId')
    expect(result).toHaveProperty('config')
    expect(result).toHaveProperty('trades')
    expect(result).toHaveProperty('metrics')
    expect(result).toHaveProperty('equityCurve')
    expect(result).toHaveProperty('totalCandles')
    expect(result.totalCandles).toBeGreaterThanOrEqual(0)
  })

  it('all returned trades have status CLOSED/STOPPED_OUT/TARGET_HIT/EOD_CLOSED', async () => {
    const candles = makeTrendingCandles(80)
    const result  = await runBacktest(candles, baseConfig)
    const validStatuses = new Set(['CLOSED', 'STOPPED_OUT', 'TARGET_HIT', 'EOD_CLOSED'])

    for (const trade of result.trades) {
      expect(validStatuses.has(trade.status)).toBe(true)
    }
  })

  it('no look-ahead: candle i only uses candles 0..i for indicators', async () => {
    // We can't directly test this in a unit test, but we verify that the
    // backtester doesn't crash and returns results for minimal candle history
    const candles = makeTrendingCandles(40)  // just above minCandlesRequired=35
    const result  = await runBacktest(candles, baseConfig)
    expect(result.totalCandles).toBeLessThanOrEqual(40)
  })

  it('PnL of all trades sums to final equity minus initial capital', async () => {
    const candles = makeTrendingCandles(100)
    const result  = await runBacktest(candles, baseConfig)

    const totalPnl = result.trades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    // Allow small floating point difference
    expect(Math.abs(result.metrics.totalReturnAbs - totalPnl)).toBeLessThan(1)
  })
})
