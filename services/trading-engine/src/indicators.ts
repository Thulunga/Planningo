/**
 * Technical indicator calculations — enhanced from web app version.
 * Adds VWAP as a 6th indicator for stronger confluence.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RSI, MACD, EMA, BollingerBands, ATR } = require('technicalindicators')
import type { Candle } from './market-data'

export interface IndicatorValues {
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null
  ema9: number | null
  ema21: number | null
  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  supertrend: 'BUY' | 'SELL' | null
  supertrendLine: number | null
  atr: number | null
  vwap: number | null
  close: number
  high: number
  low: number
  volume: number
}

/**
 * Calculate all 6 indicators from a series of candles.
 * Returns values for the most recent (last) candle.
 * Requires at least 35 candles for meaningful results.
 */
export function calculateIndicators(candles: Candle[]): IndicatorValues {
  if (candles.length < 35) {
    const last = candles[candles.length - 1] ?? { close: 0, high: 0, low: 0, volume: 0 }
    return {
      rsi: null, macd: null, macdSignal: null, macdHistogram: null,
      ema9: null, ema21: null, bbUpper: null, bbMiddle: null, bbLower: null,
      supertrend: null, supertrendLine: null, atr: null, vwap: null,
      close: last.close, high: last.high, low: last.low, volume: last.volume,
    }
  }

  const closes = candles.map((c) => c.close)
  const highs  = candles.map((c) => c.high)
  const lows   = candles.map((c) => c.low)

  // RSI (14)
  const rsiVals = RSI.calculate({ period: 14, values: closes })
  const rsi = rsiVals[rsiVals.length - 1] ?? null

  // MACD (12, 26, 9)
  const macdVals = MACD.calculate({
    fastPeriod: 12, slowPeriod: 26, signalPeriod: 9,
    values: closes, SimpleMAOscillator: false, SimpleMASignal: false,
  })
  const lastMACD = macdVals[macdVals.length - 1]
  const macd = lastMACD?.MACD ?? null
  const macdSignal = lastMACD?.signal ?? null
  const macdHistogram = lastMACD?.histogram ?? null

  // EMA 9 and 21
  const ema9Vals  = EMA.calculate({ period: 9,  values: closes })
  const ema21Vals = EMA.calculate({ period: 21, values: closes })
  const ema9  = ema9Vals[ema9Vals.length - 1]   ?? null
  const ema21 = ema21Vals[ema21Vals.length - 1] ?? null

  // Bollinger Bands (20, 2)
  const bbVals = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 })
  const lastBB = bbVals[bbVals.length - 1]
  const bbUpper  = lastBB?.upper  ?? null
  const bbMiddle = lastBB?.middle ?? null
  const bbLower  = lastBB?.lower  ?? null

  // ATR (14)
  const atrVals = ATR.calculate({ period: 14, high: highs, low: lows, close: closes })
  const atr = atrVals[atrVals.length - 1] ?? null

  // Supertrend (7, 3)
  const { supertrend, supertrendLine } = calculateSupertrend(candles, 7, 3)

  // VWAP — rolling intraday (uses today's candles only)
  const vwap = calculateVWAP(candles)

  const last = candles[candles.length - 1]!

  return {
    rsi, macd, macdSignal, macdHistogram,
    ema9, ema21, bbUpper, bbMiddle, bbLower,
    supertrend, supertrendLine, atr, vwap,
    close: last.close, high: last.high, low: last.low, volume: last.volume,
  }
}

/**
 * Calculate VWAP using only today's candles (intraday rolling VWAP).
 */
function calculateVWAP(candles: Candle[]): number | null {
  // Identify candles from today's session (within last 8 hours)
  const now = Math.floor(Date.now() / 1000)
  const eightHoursAgo = now - 8 * 3600
  const todayCandles = candles.filter((c) => c.time >= eightHoursAgo)

  if (todayCandles.length === 0) return null

  let cumVolume = 0
  let cumTPV = 0 // TypicalPrice × Volume

  for (const c of todayCandles) {
    const typicalPrice = (c.high + c.low + c.close) / 3
    cumTPV += typicalPrice * c.volume
    cumVolume += c.volume
  }

  if (cumVolume === 0) return null
  return parseFloat((cumTPV / cumVolume).toFixed(2))
}

/**
 * Supertrend indicator (ATR-based).
 * Returns 'BUY' when price is above supertrend line.
 */
function calculateSupertrend(
  candles: Candle[],
  period: number = 7,
  multiplier: number = 3
): { supertrend: 'BUY' | 'SELL' | null; supertrendLine: number | null } {
  if (candles.length < period + 1) {
    return { supertrend: null, supertrendLine: null }
  }

  const highs  = candles.map((c) => c.high)
  const lows   = candles.map((c) => c.low)
  const closes = candles.map((c) => c.close)

  const atrValues = ATR.calculate({ period, high: highs, low: lows, close: closes })
  const offset = candles.length - atrValues.length

  const upperBands: number[] = []
  const lowerBands: number[] = []
  const supertrendArr: ('BUY' | 'SELL')[] = []

  let prevUpperBand = 0, prevLowerBand = 0
  let prevSupertrend: 'BUY' | 'SELL' = 'BUY'

  for (let i = 0; i < atrValues.length; i++) {
    const ci  = i + offset
    const hl2 = (highs[ci]! + lows[ci]!) / 2
    const atr = atrValues[i]!
    const rawUpper = hl2 + multiplier * atr
    const rawLower = hl2 - multiplier * atr

    const upperBand = i === 0 ? rawUpper
      : (rawUpper < prevUpperBand || closes[ci - 1]! > prevUpperBand ? rawUpper : prevUpperBand)
    const lowerBand = i === 0 ? rawLower
      : (rawLower > prevLowerBand || closes[ci - 1]! < prevLowerBand ? rawLower : prevLowerBand)

    let trend: 'BUY' | 'SELL'
    if (i === 0) {
      trend = closes[ci]! > upperBand ? 'BUY' : 'SELL'
    } else if (prevSupertrend === 'SELL' && closes[ci]! > prevUpperBand) {
      trend = 'BUY'
    } else if (prevSupertrend === 'BUY' && closes[ci]! < prevLowerBand) {
      trend = 'SELL'
    } else {
      trend = prevSupertrend
    }

    upperBands.push(upperBand)
    lowerBands.push(lowerBand)
    supertrendArr.push(trend)

    prevUpperBand = upperBand
    prevLowerBand = lowerBand
    prevSupertrend = trend
  }

  const lastTrend = supertrendArr[supertrendArr.length - 1] ?? null
  const lastUpper = upperBands[upperBands.length - 1] ?? 0
  const lastLower = lowerBands[lowerBands.length - 1] ?? 0
  const supertrendLine = lastTrend === 'SELL' ? lastUpper : lastLower

  return { supertrend: lastTrend, supertrendLine }
}
