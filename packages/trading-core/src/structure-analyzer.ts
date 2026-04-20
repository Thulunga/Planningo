/**
 * Structure-Based Price Action Analyzer
 *
 * Detects key price action patterns that improve entry quality:
 * - Recent swing highs/lows (support/resistance breaks)
 * - Pullbacks to moving averages (trend pullback entries)
 * - Strong candles (price action confirmation)
 * - VWAP proximity (institutional anchoring)
 *
 * These patterns are more reliable than indicator stacking alone and form the basis
 * of professional price action trading.
 */

import type { Candle } from './types'

export type StructurePattern = 'SWING_HIGH_BREAK' | 'SWING_LOW_BREAK' | 'PULLBACK_TO_EMA' | 'STRONG_CANDLE' | 'NONE'

export interface StructureSignal {
  pattern: StructurePattern
  confidence: number         // 0–1, higher = more confident
  entryZone: { low: number; high: number }  // price range for entry
  reason: string
}

/**
 * Configuration for structure detection.
 */
export interface StructureConfig {
  /**
   * Number of candles to look back for swing high/low.
   * Default 10.
   */
  swingPeriod: number

  /**
   * Percentage threshold for pullback to EMA.
   * Entry is valid if price is within this % of EMA (e.g., 0.01 = 1%).
   * Default 0.01.
   */
  pullbackEmaThresholdPct: number

  /**
   * ATR multiplier for strong candle detection.
   * A candle is "strong" if its range > ATR × this multiplier.
   * Default 2.0.
   */
  strongCandleAtrMultiplier: number

  /**
   * VWAP proximity threshold.
   * Price is near VWAP if within this % (e.g., 0.005 = 0.5%).
   * Default 0.005.
   */
  vwapThresholdPct: number
}

export const DEFAULT_STRUCTURE_CONFIG: StructureConfig = {
  swingPeriod: 10,
  pullbackEmaThresholdPct: 0.01,
  strongCandleAtrMultiplier: 1.0,  // Lowered from 2.0 - 5-min bars rarely exceed 2×ATR
  vwapThresholdPct: 0.005,
}

/**
 * Detect recent swing high in a series of candles.
 *
 * @param candles       Array of candles
 * @param swingPeriod   Number of candles to look back
 * @returns             Swing high price or null
 */
export function getSwingHigh(candles: Candle[], swingPeriod: number): number | null {
  if (candles.length < swingPeriod) return null

  const lookback = candles.slice(-swingPeriod)
  return Math.max(...lookback.map((c) => c.high))
}

/**
 * Detect recent swing low in a series of candles.
 *
 * @param candles       Array of candles
 * @param swingPeriod   Number of candles to look back
 * @returns             Swing low price or null
 */
export function getSwingLow(candles: Candle[], swingPeriod: number): number | null {
  if (candles.length < swingPeriod) return null

  const lookback = candles.slice(-swingPeriod)
  return Math.min(...lookback.map((c) => c.low))
}

/**
 * Check if price is in a pullback to EMA.
 *
 * @param price         Current price
 * @param ema           EMA value
 * @param thresholdPct  Pullback threshold (e.g., 0.01 = 1%)
 * @returns             true if price is within threshold of EMA
 */
export function isPullbackToEMA(price: number, ema: number | null, thresholdPct: number): boolean {
  if (!ema || ema <= 0) return false
  const distance = Math.abs(price - ema) / ema
  return distance <= thresholdPct
}

/**
 * Check if the latest candle is a strong candle.
 *
 * @param candle                  Latest candle
 * @param atr                      Average True Range
 * @param atrMultiplier            Strength threshold (e.g., 2.0)
 * @returns                        true if candle range > ATR × multiplier
 */
export function isStrongCandle(candle: Candle, atr: number | null, atrMultiplier: number): boolean {
  if (!atr || atr <= 0) return false

  const candleRange = candle.high - candle.low
  const strongThreshold = atr * atrMultiplier

  return candleRange > strongThreshold
}

/**
 * Detect structure-based signals for bullish entries.
 *
 * Logic:
 *   1. Price broke above recent swing high (momentum entry)
 *   2. Price pulled back to EMA after being above (trend pullback entry)
 *   3. Latest candle is strong (bullish confirmation)
 *
 * @param candles     Array of historical candles (latest at end)
 * @param price       Current price
 * @param ema9        Fast EMA (9-period)
 * @param ema21       Slow EMA (21-period)
 * @param atr         Average True Range
 * @param vwap        VWAP value
 * @param config      Structure configuration
 * @returns           StructureSignal for bullish entry
 */
export function analyzeBullishStructure(
  candles: Candle[],
  price: number,
  ema9: number | null,
  ema21: number | null,
  atr: number | null,
  vwap: number | null,
  config: StructureConfig = DEFAULT_STRUCTURE_CONFIG
): StructureSignal {
  if (candles.length === 0) {
    return {
      pattern: 'NONE',
      confidence: 0,
      entryZone: { low: 0, high: 0 },
      reason: 'Insufficient candle data',
    }
  }

  const lastCandle = candles[candles.length - 1]!
  let pattern: StructurePattern = 'NONE'
  let confidence = 0
  let reason = ''
  let entryZone = { low: price * 0.99, high: price * 1.01 }

  // Check for swing high break (bullish breakout)
  // Exclude current candle from lookback - close can never exceed its own high
  const swingHigh = getSwingHigh(candles.slice(0, -1), config.swingPeriod)
  if (swingHigh && price > swingHigh * 1.002) {
    pattern = 'SWING_HIGH_BREAK'
    confidence = 0.8
    reason = `Price ₹${price.toFixed(1)} broke above swing high ₹${swingHigh.toFixed(1)}`
    entryZone = { low: swingHigh, high: price * 1.01 }
  }

  // Check for pullback to EMA9 (trend pullback entry)
  if (ema9 && isPullbackToEMA(price, ema9, config.pullbackEmaThresholdPct) && price > ema9) {
    if (pattern === 'NONE') {
      pattern = 'PULLBACK_TO_EMA'
      confidence = 0.7
      reason = `Price ₹${price.toFixed(1)} near EMA9 ₹${ema9.toFixed(1)} - pullback to support`
      entryZone = { low: ema9 * 0.99, high: ema9 * 1.01 }
    } else {
      // Increase confidence if both patterns align
      confidence = Math.min(1, confidence + 0.15)
      reason += ` + pullback to EMA9`
    }
  }

  // Check for strong bullish candle (confirmation)
  if (lastCandle.close > lastCandle.open && isStrongCandle(lastCandle, atr, config.strongCandleAtrMultiplier)) {
    if (pattern === 'NONE') {
      pattern = 'STRONG_CANDLE'
      confidence = 0.6
      reason = `Strong bullish candle (close: ₹${lastCandle.close.toFixed(1)}, range: ₹${(lastCandle.high - lastCandle.low).toFixed(1)})`
      entryZone = { low: lastCandle.low, high: lastCandle.high }
    } else {
      // Boost confidence with strong candle confirmation
      confidence = Math.min(1, confidence + 0.1)
      reason += ` + strong bullish candle`
    }
  }

  // Check VWAP alignment (additional confirmation)
  if (vwap && price > vwap * (1 - config.vwapThresholdPct)) {
    if (pattern !== 'NONE') {
      confidence = Math.min(1, confidence + 0.05)
      reason += ` + price near VWAP`
    }
  }

  if (pattern === 'NONE') {
    reason = 'No bullish structure detected'
  }

  return { pattern, confidence, entryZone, reason }
}

/**
 * Detect structure-based signals for bearish entries.
 *
 * Logic:
 *   1. Price broke below recent swing low (momentum entry)
 *   2. Price pulled back to EMA after being below (trend pullback entry)
 *   3. Latest candle is strong and red (bearish confirmation)
 *
 * @param candles     Array of historical candles (latest at end)
 * @param price       Current price
 * @param ema9        Fast EMA (9-period)
 * @param ema21       Slow EMA (21-period)
 * @param atr         Average True Range
 * @param vwap        VWAP value
 * @param config      Structure configuration
 * @returns           StructureSignal for bearish entry
 */
export function analyzeBearishStructure(
  candles: Candle[],
  price: number,
  ema9: number | null,
  ema21: number | null,
  atr: number | null,
  vwap: number | null,
  config: StructureConfig = DEFAULT_STRUCTURE_CONFIG
): StructureSignal {
  if (candles.length === 0) {
    return {
      pattern: 'NONE',
      confidence: 0,
      entryZone: { low: 0, high: 0 },
      reason: 'Insufficient candle data',
    }
  }

  const lastCandle = candles[candles.length - 1]!
  let pattern: StructurePattern = 'NONE'
  let confidence = 0
  let reason = ''
  let entryZone = { low: price * 0.99, high: price * 1.01 }

  // Check for swing low break (bearish breakdown)
  // Exclude current candle from lookback - close can never go below its own low
  const swingLow = getSwingLow(candles.slice(0, -1), config.swingPeriod)
  if (swingLow && price < swingLow * 0.998) {
    pattern = 'SWING_LOW_BREAK'
    confidence = 0.8
    reason = `Price ₹${price.toFixed(1)} broke below swing low ₹${swingLow.toFixed(1)}`
    entryZone = { low: price * 0.99, high: swingLow }
  }

  // Check for pullback to EMA9 (trend pullback entry)
  if (ema9 && isPullbackToEMA(price, ema9, config.pullbackEmaThresholdPct) && price < ema9) {
    if (pattern === 'NONE') {
      pattern = 'PULLBACK_TO_EMA'
      confidence = 0.7
      reason = `Price ₹${price.toFixed(1)} near EMA9 ₹${ema9.toFixed(1)} - pullback to resistance`
      entryZone = { low: ema9 * 0.99, high: ema9 * 1.01 }
    } else {
      // Increase confidence if both patterns align
      confidence = Math.min(1, confidence + 0.15)
      reason += ` + pullback to EMA9`
    }
  }

  // Check for strong bearish candle (confirmation)
  if (lastCandle.close < lastCandle.open && isStrongCandle(lastCandle, atr, config.strongCandleAtrMultiplier)) {
    if (pattern === 'NONE') {
      pattern = 'STRONG_CANDLE'
      confidence = 0.6
      reason = `Strong bearish candle (close: ₹${lastCandle.close.toFixed(1)}, range: ₹${(lastCandle.high - lastCandle.low).toFixed(1)})`
      entryZone = { low: lastCandle.low, high: lastCandle.high }
    } else {
      // Boost confidence with strong candle confirmation
      confidence = Math.min(1, confidence + 0.1)
      reason += ` + strong bearish candle`
    }
  }

  // Check VWAP alignment (additional confirmation)
  if (vwap && price < vwap * (1 + config.vwapThresholdPct)) {
    if (pattern !== 'NONE') {
      confidence = Math.min(1, confidence + 0.05)
      reason += ` + price near VWAP`
    }
  }

  if (pattern === 'NONE') {
    reason = 'No bearish structure detected'
  }

  return { pattern, confidence, entryZone, reason }
}
