/**
 * Technical indicator calculations — 6-indicator suite for NSE 5-min intraday.
 * Authoritative implementation; web app and service both import from here.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RSI, MACD, EMA, BollingerBands, ATR } = require('technicalindicators')

import type { Candle, IndicatorValues, StrategyConfig } from './types'
import { DEFAULT_STRATEGY_CONFIG } from './config'

/**
 * Calculate all 6 indicators for the most recent candle in a series.
 * Requires at least `config.minCandlesRequired` candles (default 35).
 *
 * @param nowSec  Unix timestamp (seconds) to use as "now" for the VWAP rolling
 *                window. Pass `candle.time` during backtesting so each candle
 *                anchors its own VWAP window rather than using wall-clock time.
 *                Defaults to `Date.now() / 1000` (live mode).
 */
export function calculateIndicators(
  candles: Candle[],
  config: StrategyConfig = DEFAULT_STRATEGY_CONFIG,
  nowSec?: number
): IndicatorValues {
  const last = candles[candles.length - 1] ?? { close: 0, high: 0, low: 0, volume: 0 }

  if (candles.length < config.minCandlesRequired) {
    return {
      rsi: null, macd: null, macdSignal: null, macdHistogram: null,
      ema9: null, ema21: null,
      bbUpper: null, bbMiddle: null, bbLower: null,
      supertrend: null, supertrendLine: null,
      atr: null, vwap: null,
      close: last.close, high: last.high, low: last.low, volume: last.volume,
    }
  }

  const closes = candles.map((c) => c.close)
  const highs  = candles.map((c) => c.high)
  const lows   = candles.map((c) => c.low)

  // RSI
  const rsiVals  = RSI.calculate({ period: config.rsiPeriod, values: closes })
  const rsi      = (rsiVals[rsiVals.length - 1] as number | undefined) ?? null

  // MACD
  const macdVals = MACD.calculate({
    fastPeriod: config.macdFast, slowPeriod: config.macdSlow,
    signalPeriod: config.macdSignalPeriod,
    values: closes, SimpleMAOscillator: false, SimpleMASignal: false,
  })
  const lastMACD    = macdVals[macdVals.length - 1] as { MACD?: number; signal?: number; histogram?: number } | undefined
  const macd        = lastMACD?.MACD        ?? null
  const macdSignal  = lastMACD?.signal      ?? null
  const macdHistogram = lastMACD?.histogram ?? null

  // EMA fast / slow
  const ema9Vals  = EMA.calculate({ period: config.emaFast, values: closes })
  const ema21Vals = EMA.calculate({ period: config.emaSlow, values: closes })
  const ema9      = (ema9Vals[ema9Vals.length - 1]   as number | undefined) ?? null
  const ema21     = (ema21Vals[ema21Vals.length - 1] as number | undefined) ?? null

  // Bollinger Bands
  const bbVals   = BollingerBands.calculate({ period: config.bbPeriod, values: closes, stdDev: config.bbStdDev })
  const lastBB   = bbVals[bbVals.length - 1] as { upper?: number; middle?: number; lower?: number } | undefined
  const bbUpper  = lastBB?.upper  ?? null
  const bbMiddle = lastBB?.middle ?? null
  const bbLower  = lastBB?.lower  ?? null

  // ATR
  const atrVals = ATR.calculate({ period: config.atrPeriod, high: highs, low: lows, close: closes })
  const atr     = (atrVals[atrVals.length - 1] as number | undefined) ?? null

  // Supertrend
  const { supertrend, supertrendLine } = calculateSupertrend(
    candles, config.supertrendPeriod, config.supertrendMultiplier
  )

  // VWAP (rolling intraday window, anchored to nowSec)
  const vwap = calculateVWAP(candles, config.vwapHours, nowSec)

  return {
    rsi, macd, macdSignal, macdHistogram,
    ema9, ema21,
    bbUpper, bbMiddle, bbLower,
    supertrend, supertrendLine,
    atr, vwap,
    close: last.close, high: last.high, low: last.low, volume: last.volume,
  }
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function calculateVWAP(candles: Candle[], windowHours: number, nowSec?: number): number | null {
  const now          = nowSec ?? Math.floor(Date.now() / 1000)
  const windowStart  = now - windowHours * 3600
  const session      = candles.filter((c) => c.time >= windowStart)

  if (session.length === 0) return null

  let cumTPV = 0
  let cumVol = 0
  for (const c of session) {
    const tp = (c.high + c.low + c.close) / 3
    cumTPV  += tp * c.volume
    cumVol  += c.volume
  }
  if (cumVol === 0) return null
  return parseFloat((cumTPV / cumVol).toFixed(2))
}

function calculateSupertrend(
  candles: Candle[],
  period: number,
  multiplier: number
): { supertrend: 'BUY' | 'SELL' | null; supertrendLine: number | null } {
  if (candles.length < period + 1) return { supertrend: null, supertrendLine: null }

  const highs  = candles.map((c) => c.high)
  const lows   = candles.map((c) => c.low)
  const closes = candles.map((c) => c.close)

  const atrValues = ATR.calculate({ period, high: highs, low: lows, close: closes }) as number[]
  const offset    = candles.length - atrValues.length

  let prevUpperBand  = 0
  let prevLowerBand  = 0
  let prevTrend: 'BUY' | 'SELL' = 'BUY'

  const upperBands: number[] = []
  const lowerBands: number[] = []
  const trends:     ('BUY' | 'SELL')[] = []

  for (let i = 0; i < atrValues.length; i++) {
    const ci    = i + offset
    const hl2   = (highs[ci]! + lows[ci]!) / 2
    const atr   = atrValues[i]!
    const rawUp = hl2 + multiplier * atr
    const rawLo = hl2 - multiplier * atr

    const upperBand = i === 0 ? rawUp
      : (rawUp < prevUpperBand || closes[ci - 1]! > prevUpperBand ? rawUp : prevUpperBand)
    const lowerBand = i === 0 ? rawLo
      : (rawLo > prevLowerBand || closes[ci - 1]! < prevLowerBand ? rawLo : prevLowerBand)

    let trend: 'BUY' | 'SELL'
    if (i === 0) {
      trend = closes[ci]! > upperBand ? 'BUY' : 'SELL'
    } else if (prevTrend === 'SELL' && closes[ci]! > prevUpperBand) {
      trend = 'BUY'
    } else if (prevTrend === 'BUY' && closes[ci]! < prevLowerBand) {
      trend = 'SELL'
    } else {
      trend = prevTrend
    }

    upperBands.push(upperBand)
    lowerBands.push(lowerBand)
    trends.push(trend)

    prevUpperBand = upperBand
    prevLowerBand = lowerBand
    prevTrend     = trend
  }

  const lastTrend     = trends[trends.length - 1]     ?? null
  const lastUpperBand = upperBands[upperBands.length - 1] ?? 0
  const lastLowerBand = lowerBands[lowerBands.length - 1] ?? 0
  const supertrendLine = lastTrend === 'SELL' ? lastUpperBand : lastLowerBand

  return { supertrend: lastTrend, supertrendLine }
}
