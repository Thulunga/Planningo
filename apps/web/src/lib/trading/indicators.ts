/**
 * Technical indicator calculations for the trading bot.
 * Uses the `technicalindicators` library for RSI, MACD, EMA, Bollinger Bands.
 * Supertrend is computed manually (ATR-based).
 */

import {
  RSI,
  MACD,
  EMA,
  BollingerBands,
  ATR,
} from 'technicalindicators'
import type { Candle } from './market-data'

export interface IndicatorValues {
  rsi: number | null
  macd: number | null          // MACD line
  macdSignal: number | null    // Signal line
  macdHistogram: number | null
  ema9: number | null
  ema21: number | null
  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  supertrend: 'BUY' | 'SELL' | null
  supertrendLine: number | null
  atr: number | null
  close: number
  high: number
  low: number
  volume: number
}

/**
 * Calculate all indicators from a series of candles.
 * Returns values for the most recent (last) candle.
 * Requires at least 35 candles for meaningful results.
 */
export function calculateIndicators(candles: Candle[]): IndicatorValues {
  if (candles.length < 35) {
    const last = candles[candles.length - 1] ?? { close: 0, high: 0, low: 0, volume: 0 }
    return {
      rsi: null,
      macd: null,
      macdSignal: null,
      macdHistogram: null,
      ema9: null,
      ema21: null,
      bbUpper: null,
      bbMiddle: null,
      bbLower: null,
      supertrend: null,
      supertrendLine: null,
      atr: null,
      close: last.close,
      high: last.high,
      low: last.low,
      volume: last.volume,
    }
  }

  const closes = candles.map((c) => c.close)
  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)

  // RSI (14)
  const rsiValues = RSI.calculate({ period: 14, values: closes })
  const rsi = rsiValues[rsiValues.length - 1] ?? null

  // MACD (12, 26, 9)
  const macdValues = MACD.calculate({
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    values: closes,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  })
  const lastMACD = macdValues[macdValues.length - 1]
  const macd = lastMACD?.MACD ?? null
  const macdSignal = lastMACD?.signal ?? null
  const macdHistogram = lastMACD?.histogram ?? null

  // EMA 9 and EMA 21
  const ema9Values = EMA.calculate({ period: 9, values: closes })
  const ema21Values = EMA.calculate({ period: 21, values: closes })
  const ema9 = ema9Values[ema9Values.length - 1] ?? null
  const ema21 = ema21Values[ema21Values.length - 1] ?? null

  // Bollinger Bands (20, 2)
  const bbValues = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 })
  const lastBB = bbValues[bbValues.length - 1]
  const bbUpper = lastBB?.upper ?? null
  const bbMiddle = lastBB?.middle ?? null
  const bbLower = lastBB?.lower ?? null

  // ATR (14) — used for Supertrend
  const atrValues = ATR.calculate({ period: 14, high: highs, low: lows, close: closes })
  const atr = atrValues[atrValues.length - 1] ?? null

  // Supertrend (7, 3 multiplier) — computed manually
  const { supertrend, supertrendLine } = calculateSupertrend(candles, 7, 3)

  const last = candles[candles.length - 1]!

  return {
    rsi,
    macd,
    macdSignal,
    macdHistogram,
    ema9,
    ema21,
    bbUpper,
    bbMiddle,
    bbLower,
    supertrend,
    supertrendLine,
    atr,
    close: last.close,
    high: last.high,
    low: last.low,
    volume: last.volume,
  }
}

/**
 * Compute Supertrend indicator.
 * Returns 'BUY' when price is above the supertrend line, 'SELL' when below.
 * period: ATR lookback (default 7)
 * multiplier: factor applied to ATR (default 3)
 */
function calculateSupertrend(
  candles: Candle[],
  period: number = 7,
  multiplier: number = 3
): { supertrend: 'BUY' | 'SELL' | null; supertrendLine: number | null } {
  if (candles.length < period + 1) {
    return { supertrend: null, supertrendLine: null }
  }

  const highs = candles.map((c) => c.high)
  const lows = candles.map((c) => c.low)
  const closes = candles.map((c) => c.close)

  // Calculate ATR for each candle from index `period`
  const atrValues = ATR.calculate({
    period,
    high: highs,
    low: lows,
    close: closes,
  })

  // Align ATR with candles (ATR output starts at index `period`)
  const offset = candles.length - atrValues.length
  const upperBands: number[] = []
  const lowerBands: number[] = []
  const supertrendArr: ('BUY' | 'SELL')[] = []

  let prevUpperBand = 0
  let prevLowerBand = 0
  let prevSupertrend: 'BUY' | 'SELL' = 'BUY'

  for (let i = 0; i < atrValues.length; i++) {
    const candleIdx = i + offset
    const hl2 = (highs[candleIdx]! + lows[candleIdx]!) / 2
    const atr = atrValues[i]!
    const rawUpper = hl2 + multiplier * atr
    const rawLower = hl2 - multiplier * atr

    const upperBand =
      i === 0
        ? rawUpper
        : rawUpper < prevUpperBand || closes[candleIdx - 1]! > prevUpperBand
          ? rawUpper
          : prevUpperBand

    const lowerBand =
      i === 0
        ? rawLower
        : rawLower > prevLowerBand || closes[candleIdx - 1]! < prevLowerBand
          ? rawLower
          : prevLowerBand

    let trend: 'BUY' | 'SELL'
    if (i === 0) {
      trend = closes[candleIdx]! > upperBand ? 'BUY' : 'SELL'
    } else if (prevSupertrend === 'SELL' && closes[candleIdx]! > prevUpperBand) {
      trend = 'BUY'
    } else if (prevSupertrend === 'BUY' && closes[candleIdx]! < prevLowerBand) {
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
