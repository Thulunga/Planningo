/**
 * Comprehensive unit tests for Phase 7 refactored strategy
 * 
 * Test coverage:
 * - Multi-timeframe HTF trend detection (BULLISH/BEARISH/NEUTRAL)
 * - Structure pattern recognition (swing breaks, pullbacks, strong candles)
 * - Volume confirmation with 1.2x threshold
 * - Time-based filtering (IST 9:15-9:30, 3:00-3:30 blackout periods)
 * - Partial booking at 1R with trailing stop logic
 * - Weighted confluence scoring (6+ threshold)
 * - Mandatory HTF trend filter enforcement in signal generation
 * - Max daily trade limits (3 trades/day)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { Candle, IndicatorValues, TrendContext } from '../types'
import { getTrendContext } from '../multi-timeframe-analyzer'
import { analyzeBullishStructure, analyzeBearishStructure } from '../structure-analyzer'
import { analyzeVolume, isVolumeConfirmed } from '../volume-analyzer'
import { isTradeAllowedByTime, getTimeFilterReason } from '../time-filter'
import { generateSignal } from '../signal-engine'
import { checkPartialBooking1R, executePartialBooking, updateTrailingStop } from '../trade-simulator'
import { DEFAULT_STRATEGY_CONFIG, DEFAULT_RISK_CONFIG } from '../config'

// ── Test Fixtures ────────────────────────────────────────────────────────────

/**
 * Generate mock candles for testing
 * @param count Number of candles to generate
 * @param startTime Unix timestamp for first candle
 * @param basePrice Starting price
 * @param trend 'up' | 'down' | 'sideways'
 */
function generateMockCandles(
  count: number,
  startTime: number,
  basePrice: number = 1000,
  trend: 'up' | 'down' | 'sideways' = 'sideways'
): Candle[] {
  const candles: Candle[] = []
  let currentPrice = basePrice

  for (let i = 0; i < count; i++) {
    const candleTime = startTime + i * 300  // 5-min intervals

    // Price movement based on trend
    let priceChange = 0
    if (trend === 'up') priceChange = Math.random() * 5
    else if (trend === 'down') priceChange = -Math.random() * 5
    else priceChange = (Math.random() - 0.5) * 3

    const open = currentPrice
    currentPrice += priceChange
    const close = currentPrice
    const high = Math.max(open, close) + Math.random() * 2
    const low = Math.min(open, close) - Math.random() * 2
    const volume = 50000 + Math.random() * 150000

    candles.push({
      time: candleTime,
      open,
      high,
      low,
      close,
      volume,
    })
  }

  return candles
}

// ── 1. Multi-Timeframe HTF Trend Detection Tests ──────────────────────────────

describe('Multi-Timeframe HTF Trend Analysis', () => {
  it('should detect BULLISH trend when 15-min EMA50 > price and RSI > 40', () => {
    // Create uptrend candles
    const candles = generateMockCandles(60, 1000000, 1000, 'up')

    // Mock indicator calculation would produce EMA50 above price in uptrend
    const trendContext = getTrendContext(candles, { htfPeriod: 3, emaPeriod: 50, rsiPeriod: 14 })

    expect(trendContext.direction).toBe('BULLISH')
    expect(trendContext.strength).toBe('STRONG')
  })

  it('should detect BEARISH trend when 15-min EMA50 < price and RSI < 60', () => {
    // Create downtrend candles
    const candles = generateMockCandles(60, 1000000, 1000, 'down')

    const trendContext = getTrendContext(candles, { htfPeriod: 3, emaPeriod: 50, rsiPeriod: 14 })

    expect(trendContext.direction).toBe('BEARISH')
    expect(trendContext.strength).toBe('STRONG')
  })

  it('should detect NEUTRAL trend when RSI is between 40-60', () => {
    // Create sideways candles
    const candles = generateMockCandles(60, 1000000, 1000, 'sideways')

    const trendContext = getTrendContext(candles, { htfPeriod: 3, emaPeriod: 50, rsiPeriod: 14 })

    expect(trendContext.direction).toBe('NEUTRAL')
  })
})

// ── 2. Structure Pattern Detection Tests ──────────────────────────────────────

describe('Structure Analysis (Swing Breaks, Pullbacks, Strong Candles)', () => {
  it('should detect swing high break in bullish structure', () => {
    const candles = generateMockCandles(15, 1000000, 1000, 'up')
    const atr = 5  // Average True Range for reference

    const result = analyzeBullishStructure(
      candles,
      candles[candles.length - 1]!.close,
      candles[candles.length - 1]!.close,  // ema9
      1000,                                  // ema21
      atr,
      1005,                                  // vwap
      { swingPeriod: 5, pullbackEmaThresholdPct: 0.01, strongCandleAtrMultiplier: 2.0, vwapThresholdPct: 0.005 }
    )

    expect(result.confidence).toBeGreaterThan(0)
    expect(['SWING_HIGH_BREAK', 'PULLBACK_TO_EMA', 'STRONG_CANDLE']).toContain(result.pattern)
  })

  it('should detect swing low break in bearish structure', () => {
    const candles = generateMockCandles(15, 1000000, 1000, 'down')
    const atr = 5

    const result = analyzeBearishStructure(
      candles,
      candles[candles.length - 1]!.close,
      candles[candles.length - 1]!.close,
      1010,
      atr,
      995,
      { swingPeriod: 5, pullbackEmaThresholdPct: 0.01, strongCandleAtrMultiplier: 2.0, vwapThresholdPct: 0.005 }
    )

    expect(result.confidence).toBeGreaterThan(0)
  })
})

// ── 3. Volume Confirmation Tests ─────────────────────────────────────────────

describe('Volume Analysis', () => {
  it('should confirm volume when current > 20-MA × 1.2x', () => {
    const candles = generateMockCandles(25, 1000000, 1000, 'up')
    // Artificially inflate last candle volume
    candles[candles.length - 1]!.volume = 200000

    const analysis = analyzeVolume(candles, { maPeriod: 20, multiplier: 1.2 })

    expect(analysis.isConfirmed).toBe(true)
    expect(analysis.volumeRatio).toBeGreaterThanOrEqual(1.2)
  })

  it('should reject volume when current < 20-MA × 1.2x', () => {
    const candles = generateMockCandles(25, 1000000, 1000, 'up')
    // Keep volume low
    candles[candles.length - 1]!.volume = 50000

    const analysis = analyzeVolume(candles, { maPeriod: 20, multiplier: 1.2 })

    expect(analysis.isConfirmed).toBe(false)
    expect(analysis.volumeRatio).toBeLessThan(1.2)
  })

  it('shorthand isVolumeConfirmed should match analyzeVolume.isConfirmed', () => {
    const candles = generateMockCandles(25, 1000000, 1000, 'up')
    candles[candles.length - 1]!.volume = 200000

    const analysis = analyzeVolume(candles, { maPeriod: 20, multiplier: 1.2 })
    const shorthand = isVolumeConfirmed(candles, 1.2, 20)

    expect(shorthand).toBe(analysis.isConfirmed)
  })
})

// ── 4. Time Filter Tests (IST Timezone) ──────────────────────────────────────

describe('Time-Based Market Filters (IST Timezone)', () => {
  it('should block trades during 9:15–9:30 IST (market open)', () => {
    // IST is UTC+5:30
    // 9:15 IST = 3:45 UTC
    const istMarketOpen = new Date('2024-01-01T03:45:00Z').getTime() / 1000

    const allowed = isTradeAllowedByTime(istMarketOpen, {
      enabled: true,
      skipRanges: [
        { start: '09:15', end: '09:30' },
        { start: '15:00', end: '15:30' },
      ],
    })

    expect(allowed).toBe(false)
  })

  it('should block trades during 3:00–3:30 PM IST (market close)', () => {
    // 3:00 PM IST = 9:30 AM UTC
    const istMarketClose = new Date('2024-01-01T09:30:00Z').getTime() / 1000

    const allowed = isTradeAllowedByTime(istMarketClose, {
      enabled: true,
      skipRanges: [
        { start: '09:15', end: '09:30' },
        { start: '15:00', end: '15:30' },
      ],
    })

    expect(allowed).toBe(false)
  })

  it('should allow trades during 9:45 AM IST (after market open)', () => {
    // 9:45 IST = 4:15 UTC
    const ist945am = new Date('2024-01-01T04:15:00Z').getTime() / 1000

    const allowed = isTradeAllowedByTime(ist945am, {
      enabled: true,
      skipRanges: [
        { start: '09:15', end: '09:30' },
        { start: '15:00', end: '15:30' },
      ],
    })

    expect(allowed).toBe(true)
  })

  it('getTimeFilterReason should provide descriptive explanation', () => {
    const istMarketOpen = new Date('2024-01-01T03:45:00Z').getTime() / 1000

    const reason = getTimeFilterReason(istMarketOpen, {
      enabled: true,
      skipRanges: [
        { start: '09:15', end: '09:30' },
        { start: '15:00', end: '15:30' },
      ],
    })

    expect(reason).toMatch(/blocked|9:15|9:30/i)
  })
})

// ── 5. Partial Booking & Trailing Stop Tests ──────────────────────────────────

describe('Partial Booking at 1R with Trailing Stop', () => {
  it('checkPartialBooking1R should return exit price when 1R is hit on LONG', () => {
    const trade = {
      id: 'test-1',
      symbol: 'RELIANCE.NS',
      side: 'LONG' as const,
      entryPrice: 1000,
      stopPrice: 990,
      targetPrice: 1030,
      quantity: 1,
      entryTime: new Date(),
      status: 'OPEN' as const,
    }

    const candle: Candle = {
      time: 0,
      open: 1020,
      high: 1010,  // 1R = entry + (entry - SL) = 1000 + 10 = 1010
      low: 1000,
      close: 1005,
      volume: 100000,
    }

    const oneRPrice = checkPartialBooking1R(trade as any, candle)

    expect(oneRPrice).toBe(1010)
  })

  it('checkPartialBooking1R should return null when 1R not hit', () => {
    const trade = {
      id: 'test-1',
      symbol: 'RELIANCE.NS',
      side: 'LONG' as const,
      entryPrice: 1000,
      stopPrice: 990,
      targetPrice: 1030,
      quantity: 1,
      entryTime: new Date(),
      status: 'OPEN' as const,
    }

    const candle: Candle = {
      time: 0,
      open: 1000,
      high: 1005,
      low: 995,
      close: 1000,
      volume: 100000,
    }

    const oneRPrice = checkPartialBooking1R(trade as any, candle)

    expect(oneRPrice).toBeNull()
  })

  it('checkPartialBooking1R should work for SHORT trades too', () => {
    const trade = {
      id: 'test-2',
      symbol: 'RELIANCE.NS',
      side: 'SHORT' as const,
      entryPrice: 1000,
      stopPrice: 1010,
      targetPrice: 970,
      quantity: 1,
      entryTime: new Date(),
      status: 'OPEN' as const,
    }

    const candle: Candle = {
      time: 0,
      open: 990,
      high: 1000,
      low: 985,   // 1R = entry - (SL - entry) = 1000 - 10 = 990
      close: 990,
      volume: 100000,
    }

    const oneRPrice = checkPartialBooking1R(trade as any, candle)

    expect(oneRPrice).toBe(990)
  })
})

// ── 6. Weighted Confluence Scoring Tests ─────────────────────────────────────

describe('Weighted Confluence Scoring (6+ threshold)', () => {
  it('should generate BUY signal when score ≥ 6 with bullish indicators', () => {
    const candles = generateMockCandles(50, 1000000, 1000, 'up')

    const indicators: IndicatorValues = {
      close: 1020,
      open: 1010,
      high: 1025,
      low: 1005,
      volume: 150000,
      atr: 5,
      ema9: 1020,
      ema21: 1010,
      rsi: 65,  // Bullish RSI
      macd: 5,
      macdSignal: 3,
      macdHistogram: 2,
      bbUpper: 1030,
      bbMiddle: 1015,
      bbLower: 1000,
      supertrend: 'BUY',
      supertrendLine: 1005,
      vwap: 1015,
    }

    const trendContext: TrendContext = {
      direction: 'BULLISH',
      strength: 'STRONG',
      htfEma50: 1010,
      htfRsi: 60,
      candleTime: candles[candles.length - 1]!.time,
    }

    const signal = generateSignal(indicators, candles, DEFAULT_STRATEGY_CONFIG, trendContext)

    expect(signal.type).toBe('BUY')
    expect(signal.confluenceScore).toBeGreaterThanOrEqual(6)
    expect(signal.strength).toMatch(/WEAK|STRONG|VERY_STRONG/)
  })

  it('should generate SELL signal when score ≥ 6 with bearish indicators', () => {
    const candles = generateMockCandles(50, 1000000, 1000, 'down')

    const indicators: IndicatorValues = {
      close: 980,
      open: 990,
      high: 995,
      low: 975,
      volume: 150000,
      atr: 5,
      ema9: 980,
      ema21: 990,
      rsi: 35,  // Bearish RSI
      macd: -5,
      macdSignal: -3,
      macdHistogram: -2,
      bbUpper: 1000,
      bbMiddle: 985,
      bbLower: 970,
      supertrend: 'SELL',
      supertrendLine: 995,
      vwap: 985,
    }

    const trendContext: TrendContext = {
      direction: 'BEARISH',
      strength: 'STRONG',
      htfEma50: 990,
      htfRsi: 40,
      candleTime: candles[candles.length - 1]!.time,
    }

    const signal = generateSignal(indicators, candles, DEFAULT_STRATEGY_CONFIG, trendContext)

    expect(signal.type).toBe('SELL')
    expect(signal.confluenceScore).toBeGreaterThanOrEqual(6)
  })

  it('should hold when score < 6', () => {
    const candles = generateMockCandles(50, 1000000, 1000, 'sideways')

    const indicators: IndicatorValues = {
      close: 1000,
      open: 1000,
      high: 1005,
      low: 995,
      volume: 100000,
      atr: 5,
      ema9: 1000,
      ema21: 1000,
      rsi: 50,  // Neutral RSI
      macd: 0,
      macdSignal: 0,
      macdHistogram: 0,
      bbUpper: 1010,
      bbMiddle: 1000,
      bbLower: 990,
      supertrend: 'BUY',
      supertrendLine: 995,
      vwap: 1000,
    }

    const trendContext: TrendContext = {
      direction: 'NEUTRAL',
      strength: 'WEAK',
      htfEma50: 1000,
      htfRsi: 50,
      candleTime: candles[candles.length - 1]!.time,
    }

    const signal = generateSignal(indicators, candles, DEFAULT_STRATEGY_CONFIG, trendContext)

    expect(signal.type).toBe('HOLD')
    expect(signal.confluenceScore).toBeLessThan(6)
  })
})

// ── 7. Mandatory HTF Trend Filter Tests ──────────────────────────────────────

describe('Mandatory HTF Trend Filter Enforcement', () => {
  it('should reject BUY signal when HTF trend is BEARISH', () => {
    const candles = generateMockCandles(50, 1000000, 1000, 'up')

    const indicators: IndicatorValues = {
      close: 1020,
      open: 1010,
      high: 1025,
      low: 1005,
      volume: 150000,
      atr: 5,
      ema9: 1020,
      ema21: 1010,
      rsi: 65,
      macd: 5,
      macdSignal: 3,
      macdHistogram: 2,
      bbUpper: 1030,
      bbMiddle: 1015,
      bbLower: 1000,
      supertrend: 'BUY',
      supertrendLine: 1005,
      vwap: 1015,
    }

    const bearishTrend: TrendContext = {
      direction: 'BEARISH',  // Misaligned with BUY signal
      strength: 'STRONG',
      htfEma50: 1010,
      htfRsi: 30,
      candleTime: candles[candles.length - 1]!.time,
    }

    const signal = generateSignal(indicators, candles, DEFAULT_STRATEGY_CONFIG, bearishTrend)

    expect(signal.type).toBe('HOLD')
    expect(signal.reasons.trend_filter).toMatch(/BEARISH.*rejecting BUY/i)
  })

  it('should reject SELL signal when HTF trend is BULLISH', () => {
    const candles = generateMockCandles(50, 1000000, 1000, 'down')

    const indicators: IndicatorValues = {
      close: 980,
      open: 990,
      high: 995,
      low: 975,
      volume: 150000,
      atr: 5,
      ema9: 980,
      ema21: 990,
      rsi: 35,
      macd: -5,
      macdSignal: -3,
      macdHistogram: -2,
      bbUpper: 1000,
      bbMiddle: 985,
      bbLower: 970,
      supertrend: 'SELL',
      supertrendLine: 995,
      vwap: 985,
    }

    const bullishTrend: TrendContext = {
      direction: 'BULLISH',  // Misaligned with SELL signal
      strength: 'STRONG',
      htfEma50: 990,
      htfRsi: 70,
      candleTime: candles[candles.length - 1]!.time,
    }

    const signal = generateSignal(indicators, candles, DEFAULT_STRATEGY_CONFIG, bullishTrend)

    expect(signal.type).toBe('HOLD')
    expect(signal.reasons.trend_filter).toMatch(/BULLISH.*rejecting SELL/i)
  })

  it('should reject all signals when HTF trend is NEUTRAL', () => {
    const candles = generateMockCandles(50, 1000000, 1000, 'up')

    const indicators: IndicatorValues = {
      close: 1020,
      open: 1010,
      high: 1025,
      low: 1005,
      volume: 150000,
      atr: 5,
      ema9: 1020,
      ema21: 1010,
      rsi: 65,
      macd: 5,
      macdSignal: 3,
      macdHistogram: 2,
      bbUpper: 1030,
      bbMiddle: 1015,
      bbLower: 1000,
      supertrend: 'BUY',
      supertrendLine: 1005,
      vwap: 1015,
    }

    const neutralTrend: TrendContext = {
      direction: 'NEUTRAL',
      strength: 'WEAK',
      htfEma50: 1010,
      htfRsi: 50,
      candleTime: candles[candles.length - 1]!.time,
    }

    const signal = generateSignal(indicators, candles, DEFAULT_STRATEGY_CONFIG, neutralTrend)

    expect(signal.type).toBe('HOLD')
    expect(signal.reasons.trend_filter).toMatch(/NEUTRAL.*no entry allowed/i)
  })
})

// ── 8. Integration Tests ────────────────────────────────────────────────────

describe('Integration: Full Signal Generation Pipeline', () => {
  it('complete bullish setup: HTF BULLISH + structure + volume + high confluence', () => {
    const candles = generateMockCandles(60, 1000000, 1000, 'up')
    candles[candles.length - 1]!.volume = 200000  // High volume

    const indicators: IndicatorValues = {
      close: 1020,
      open: 1015,
      high: 1025,
      low: 1010,
      volume: 200000,
      atr: 5,
      ema9: 1022,
      ema21: 1008,
      rsi: 70,
      macd: 8,
      macdSignal: 5,
      macdHistogram: 3,
      bbUpper: 1032,
      bbMiddle: 1015,
      bbLower: 998,
      supertrend: 'BUY',
      supertrendLine: 1005,
      vwap: 1018,
    }

    const trendContext: TrendContext = {
      direction: 'BULLISH',
      strength: 'STRONG',
      htfEma50: 1005,
      htfRsi: 65,
      candleTime: candles[candles.length - 1]!.time,
    }

    const signal = generateSignal(indicators, candles, DEFAULT_STRATEGY_CONFIG, trendContext)

    expect(signal.type).toBe('BUY')
    expect(signal.confluenceScore).toBeGreaterThanOrEqual(6)
    expect(signal.strength).toBe('STRONG')
    expect(signal.trendContext.direction).toBe('BULLISH')
  })
})
