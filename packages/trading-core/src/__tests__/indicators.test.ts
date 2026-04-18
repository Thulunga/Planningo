import { describe, it, expect } from 'vitest'
import { calculateIndicators } from '../indicators'
import { DEFAULT_STRATEGY_CONFIG } from '../config'
import type { Candle } from '../types'

function makeSinCandles(n: number, basePrice = 100, amplitude = 5): Candle[] {
  const candles: Candle[] = []
  for (let i = 0; i < n; i++) {
    const close  = basePrice + amplitude * Math.sin(i * 0.3)
    const high   = close + 0.5
    const low    = close - 0.5
    candles.push({
      time:   1_700_000_000 + i * 300,
      open:   close - 0.2,
      high,
      low,
      close,
      volume: 100_000,
    })
  }
  return candles
}

describe('calculateIndicators', () => {
  it('returns all nulls when candle count < minCandlesRequired', () => {
    const candles = makeSinCandles(20)
    const result  = calculateIndicators(candles, DEFAULT_STRATEGY_CONFIG)
    expect(result.rsi).toBeNull()
    expect(result.macd).toBeNull()
    expect(result.ema9).toBeNull()
    expect(result.atr).toBeNull()
  })

  it('returns numeric values with sufficient candles', () => {
    const candles = makeSinCandles(60)
    const result  = calculateIndicators(candles, DEFAULT_STRATEGY_CONFIG)
    expect(result.rsi).not.toBeNull()
    expect(result.ema9).not.toBeNull()
    expect(result.ema21).not.toBeNull()
    expect(result.atr).not.toBeNull()
    expect(result.supertrend).not.toBeNull()
  })

  it('RSI is between 0 and 100', () => {
    const candles = makeSinCandles(60)
    const result  = calculateIndicators(candles, DEFAULT_STRATEGY_CONFIG)
    if (result.rsi !== null) {
      expect(result.rsi).toBeGreaterThanOrEqual(0)
      expect(result.rsi).toBeLessThanOrEqual(100)
    }
  })

  it('ATR is positive', () => {
    const candles = makeSinCandles(60)
    const result  = calculateIndicators(candles, DEFAULT_STRATEGY_CONFIG)
    if (result.atr !== null) expect(result.atr).toBeGreaterThan(0)
  })

  it('Supertrend is BUY or SELL', () => {
    const candles = makeSinCandles(60)
    const result  = calculateIndicators(candles, DEFAULT_STRATEGY_CONFIG)
    if (result.supertrend !== null) {
      expect(['BUY', 'SELL']).toContain(result.supertrend)
    }
  })

  it('close, high, low match last candle', () => {
    const candles = makeSinCandles(60)
    const last    = candles[candles.length - 1]!
    const result  = calculateIndicators(candles, DEFAULT_STRATEGY_CONFIG)
    expect(result.close).toBe(last.close)
    expect(result.high).toBe(last.high)
    expect(result.low).toBe(last.low)
  })
})
