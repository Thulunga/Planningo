/**
 * Multi-Timeframe Trend Analysis
 *
 * Detects market trend on a higher timeframe (15-min) to filter entries.
 * Only allows LONG trades in uptrends and SHORT trades in downtrends.
 *
 * Key insight: Most losing trades in the backtest happened because the 5-min
 * signals (EMA 9/21 cross, RSI, etc.) triggered at local tops/bottoms, opposite
 * to the broader 15-min trend. This module fixes that by adding a mandatory
 * trend context before any entry is allowed.
 */

import type { Candle, StrategyConfig } from './types'
import { DEFAULT_STRATEGY_CONFIG } from './config'
import { calculateIndicators } from './indicators'

/**
 * Trend direction and strength on the higher timeframe (15-min).
 */
export type TrendDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL'

export interface TrendContext {
  direction: TrendDirection
  strength: 'STRONG' | 'WEAK'
  htfEma50: number | null
  htfRsi: number | null
  candleTime: number
}

/**
 * Configuration for multi-timeframe trend detection (HTF = higher timeframe).
 */
export interface HTFConfig {
  /**
   * Higher timeframe (in seconds). 1800 = 30-min (recommended for NSE intraday).
   * 30-min bars capture intraday trend without being too slow like 15-min EMA50.
   */
  htfPeriodSec: number

  /**
   * Slow EMA period on HTF (trend baseline).
   * Default 20: on 30-min bars = 10 trading hours ≈ 1.5 days. Responsive.
   */
  htfEmaTrendPeriod: number

  /**
   * Fast EMA period on HTF (momentum direction).
   * Default 9: on 30-min bars = 4.5 hours. Catches short-term turning points.
   * BULLISH requires: price > fastEMA > slowEMA (all aligned up).
   * BEARISH requires: price < fastEMA < slowEMA (all aligned down).
   */
  htfFastEmaPeriod: number

  /**
   * RSI period for trend strength on HTF.
   * Default 14.
   */
  htfRsiPeriod: number

  /**
   * Minimum RSI (on HTF) to consider trend BULLISH.
   * Default 52 - requires clear upward momentum, not just "not oversold".
   */
  htfRsiBullishThreshold: number

  /**
   * Maximum RSI (on HTF) to consider trend BEARISH.
   * Default 48 - requires clear downward momentum, not just "not overbought".
   */
  htfRsiBearishThreshold: number

  /**
   * Minimum ADX (optional, for trend strength).
   * Set to 0 to disable ADX check.
   */
  htfAdxMinimum: number
}

/**
 * Default HTF configuration (30-min trend filter with dual EMA).
 *
 * Key changes from v1:
 *  - 30-min bars (was 15-min): wider view catches broader intraday trend
 *  - Dual EMA: price > EMA9 > EMA20 required for BULLISH (not just price > EMA50)
 *  - RSI thresholds tightened: 52/48 instead of 40/60 - eliminates choppy-range false signals
 */
export const DEFAULT_HTF_CONFIG: HTFConfig = {
  htfPeriodSec: 1800,          // 30 minutes
  htfEmaTrendPeriod: 20,       // slow EMA: ~10 hrs of trading on 30-min bars
  htfFastEmaPeriod: 9,         // fast EMA: ~4.5 hrs on 30-min bars
  htfRsiPeriod: 14,
  htfRsiBullishThreshold: 52,  // must be in real upward momentum (not just >40)
  htfRsiBearishThreshold: 48,  // must be in real downward momentum (not just <60)
  htfAdxMinimum: 0,            // ADX disabled by default
}

/**
 * Aggregate 5-min candles into higher-timeframe candles (e.g., 15-min).
 *
 * @param fiveMinCandles  Array of 5-min candles, sorted ascending by time
 * @param htfPeriodSec    HTF period in seconds (e.g., 900 for 15-min)
 * @returns               Array of aggregated HTF candles
 */
export function aggregateToHTF(fiveMinCandles: Candle[], htfPeriodSec: number): Candle[] {
  if (fiveMinCandles.length === 0) return []

  const htfCandles: Candle[] = []
  let currentBucket: Candle[] = []
  let bucketStartTime = 0

  for (const candle of fiveMinCandles) {
    if (bucketStartTime === 0) {
      // First candle: align to HTF bucket
      bucketStartTime = Math.floor(candle.time / htfPeriodSec) * htfPeriodSec
    }

    const candleBucket = Math.floor(candle.time / htfPeriodSec) * htfPeriodSec

    if (candleBucket === bucketStartTime) {
      // Same bucket: accumulate
      currentBucket.push(candle)
    } else {
      // New bucket: finalize previous HTF candle and start new one
      if (currentBucket.length > 0) {
        const htfCandle = finalizeHTFCandle(currentBucket, bucketStartTime)
        htfCandles.push(htfCandle)
      }
      currentBucket = [candle]
      bucketStartTime = candleBucket
    }
  }

  // Finalize last bucket
  if (currentBucket.length > 0) {
    const htfCandle = finalizeHTFCandle(currentBucket, bucketStartTime)
    htfCandles.push(htfCandle)
  }

  return htfCandles
}

/**
 * Convert an array of 5-min candles (same HTF bucket) into one HTF candle.
 */
function finalizeHTFCandle(bucket: Candle[], bucketTime: number): Candle {
  const open = bucket[0]!.open
  const high = Math.max(...bucket.map((c) => c.high))
  const low = Math.min(...bucket.map((c) => c.low))
  const close = bucket[bucket.length - 1]!.close
  const volume = bucket.reduce((sum, c) => sum + c.volume, 0)

  return { time: bucketTime, open, high, low, close, volume }
}

/**
 * Analyze HTF (15-min) trend using EMA and RSI.
 *
 * Logic:
 *   - BULLISH: price > EMA(50) on 15-min AND RSI(14) > 40
 *   - BEARISH: price < EMA(50) on 15-min AND RSI(14) < 60
 *   - NEUTRAL: anything else
 *
 * @param htfCandles     Array of aggregated 15-min candles
 * @param config         HTF configuration
 * @returns              TrendContext for the latest HTF candle
 */
export function analyzeTrend(
  htfCandles: Candle[],
  config: HTFConfig = DEFAULT_HTF_CONFIG
): TrendContext {
  const lastTime = htfCandles.length > 0 ? htfCandles[htfCandles.length - 1]!.time : 0
  const lastPrice = htfCandles.length > 0 ? htfCandles[htfCandles.length - 1]!.close : 0

  // Need enough candles for both EMAs and RSI
  const minRequired = Math.max(
    config.htfEmaTrendPeriod,
    config.htfFastEmaPeriod ?? config.htfEmaTrendPeriod,
    config.htfRsiPeriod
  ) + 5
  if (htfCandles.length < minRequired) {
    return {
      direction: 'NEUTRAL',
      strength: 'WEAK',
      htfEma50: null,
      htfRsi: null,
      candleTime: lastTime,
    }
  }

  const closes = htfCandles.map((c) => c.close)

  // Slow EMA (trend baseline)
  const slowEma = calculateEMA(closes, config.htfEmaTrendPeriod)

  // Fast EMA (momentum direction) - dual-EMA confirmation
  const fastEmaPeriod = config.htfFastEmaPeriod ?? config.htfEmaTrendPeriod
  const fastEma = calculateEMA(closes, fastEmaPeriod)

  // RSI for momentum strength
  const rsi14 = calculateRSI(closes, config.htfRsiPeriod)

  // Determine trend using dual-EMA alignment
  // BULLISH: price > fastEMA > slowEMA AND RSI above bullish threshold
  // BEARISH: price < fastEMA < slowEMA AND RSI below bearish threshold
  // NEUTRAL: anything else (choppy, ranging, or indeterminate)
  let direction: TrendDirection = 'NEUTRAL'
  let strength: 'STRONG' | 'WEAK' = 'WEAK'

  if (slowEma !== null && fastEma !== null && rsi14 !== null) {
    const bullish = lastPrice > fastEma && fastEma > slowEma && rsi14 > config.htfRsiBullishThreshold
    const bearish = lastPrice < fastEma && fastEma < slowEma && rsi14 < config.htfRsiBearishThreshold

    if (bullish) {
      direction = 'BULLISH'
      strength = rsi14 > 60 ? 'STRONG' : 'WEAK'
    } else if (bearish) {
      direction = 'BEARISH'
      strength = rsi14 < 40 ? 'STRONG' : 'WEAK'
    } else {
      direction = 'NEUTRAL'
    }
  }

  return {
    direction,
    strength,
    htfEma50: slowEma,
    htfRsi: rsi14,
    candleTime: lastTime,
  }
}

/**
 * Simple EMA calculation (exponential moving average).
 * Matches the technicalindicators library behavior.
 *
 * @param values    Array of numbers (prices)
 * @param period    EMA period (e.g., 50)
 * @returns         Latest EMA value, or null if insufficient data
 */
function calculateEMA(values: number[], period: number): number | null {
  if (values.length < period) return null

  const k = 2 / (period + 1)
  let ema = values.slice(0, period).reduce((a, b) => a + b) / period

  for (let i = period; i < values.length; i++) {
    ema = values[i]! * k + ema * (1 - k)
  }

  return ema
}

/**
 * Simple RSI calculation (relative strength index).
 * Matches the technicalindicators library behavior.
 *
 * @param values    Array of prices
 * @param period    RSI period (e.g., 14)
 * @returns         Latest RSI value (0–100), or null if insufficient data
 */
function calculateRSI(values: number[], period: number): number | null {
  if (values.length < period + 1) return null

  let gains = 0
  let losses = 0

  // First average gain/loss
  for (let i = 1; i <= period; i++) {
    const diff = values[i]! - values[i - 1]!
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  // Smoothed gains/losses
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i]! - values[i - 1]!
    const currentGain = diff > 0 ? diff : 0
    const currentLoss = diff < 0 ? Math.abs(diff) : 0

    avgGain = (avgGain * (period - 1) + currentGain) / period
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period
  }

  if (avgLoss === 0) {
    return avgGain === 0 ? 50 : 100
  }

  const rs = avgGain / avgLoss
  const rsi = 100 - 100 / (1 + rs)

  return rsi
}

/**
 * Get trend context for the latest candle, given 5-min candles.
 * This is the main export function for use in backtesting.
 *
 * @param fiveMinCandles  5-min candles sorted ascending by time
 * @param config          HTF configuration
 * @returns               TrendContext for filtering entries
 */
export function getTrendContext(
  fiveMinCandles: Candle[],
  config: HTFConfig = DEFAULT_HTF_CONFIG
): TrendContext {
  const htfCandles = aggregateToHTF(fiveMinCandles, config.htfPeriodSec)
  return analyzeTrend(htfCandles, config)
}
