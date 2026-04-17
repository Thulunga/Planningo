import type { Candle } from './market-data'

/**
 * NOTE: This file intentionally exists in the web runtime.
 * The service runtime has its own copy under `services/trading-engine/src/ma-boundary.ts`
 * because both runtimes compile independently with different tsconfig roots.
 * Keeping one file per runtime avoids cross-package build coupling.
 */
export type MAType = 'SMA' | 'EMA' | 'WMA' | 'VWMA' | 'DEMA' | 'TEMA' | 'HMA'
export type MABoundarySignal = 'NO_TRADE' | 'BUY' | 'SELL' | 'WAIT'

export interface MABoundaryConfig {
  ma1Length?: number
  ma2Length?: number
  ma3Length?: number
  maType?: MAType
  noTradeSpreadThreshold?: number
  slopeThreshold?: number
  maxDistanceFromMA2?: number
  pullbackAtrMultiplier?: number
}

export interface MABoundaryDecision {
  signal: MABoundarySignal
  reason?: string
  confidence: number
  ma1: number | null
  ma2: number | null
  ma3: number | null
  slope: number | null
  maSpread: number | null
  distanceFromMA2: number | null
  nearMA2: boolean
}

const DEFAULT_CONFIG: Required<MABoundaryConfig> = {
  ma1Length: 9,
  ma2Length: 21,
  ma3Length: 50,
  maType: 'EMA',
  noTradeSpreadThreshold: 0.002,
  slopeThreshold: 0.05,
  maxDistanceFromMA2: 0.01,
  pullbackAtrMultiplier: 0.5,
}

function getSMA(values: number[], length: number, index: number): number | null {
  if (index < length - 1) return null
  let sum = 0
  for (let i = index - length + 1; i <= index; i++) sum += values[i]!
  return sum / length
}

function getWMA(values: number[], length: number, index: number): number | null {
  if (index < length - 1) return null
  const denominator = (length * (length + 1)) / 2
  let weightedSum = 0
  for (let i = 0; i < length; i++) weightedSum += values[index - length + 1 + i]! * (i + 1)
  return weightedSum / denominator
}

function getVWMA(source: number[], volume: number[], length: number, index: number): number | null {
  if (index < length - 1) return null
  let num = 0
  let den = 0
  for (let i = index - length + 1; i <= index; i++) {
    num += source[i]! * volume[i]!
    den += volume[i]!
  }
  if (den === 0) return null
  return num / den
}

function getEMA(values: number[], length: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null)
  if (values.length < length) return out

  const multiplier = 2 / (length + 1)
  let seed = 0
  for (let i = 0; i < length; i++) seed += values[i]!
  let prev = seed / length
  out[length - 1] = prev

  for (let i = length; i < values.length; i++) {
    prev = (values[i]! - prev) * multiplier + prev
    out[i] = prev
  }
  return out
}

function calcMASeries(source: number[], length: number, type: MAType, volume?: number[]): Array<number | null> {
  const out: Array<number | null> = new Array(source.length).fill(null)

  switch (type) {
    case 'SMA':
      for (let i = 0; i < source.length; i++) out[i] = getSMA(source, length, i)
      return out
    case 'EMA':
      return getEMA(source, length)
    case 'WMA':
      for (let i = 0; i < source.length; i++) out[i] = getWMA(source, length, i)
      return out
    case 'VWMA':
      for (let i = 0; i < source.length; i++) out[i] = volume ? getVWMA(source, volume, length, i) : null
      return out
    case 'DEMA': {
      const ema1 = getEMA(source, length)
      const ema1Clean = ema1.map((v) => v ?? 0)
      const ema2 = getEMA(ema1Clean, length)
      return ema1.map((v, i) => (v === null || ema2[i] === null ? null : 2 * v - ema2[i]!))
    }
    case 'TEMA': {
      const ema1 = getEMA(source, length)
      const ema1Clean = ema1.map((v) => v ?? 0)
      const ema2 = getEMA(ema1Clean, length)
      const ema2Clean = ema2.map((v) => v ?? 0)
      const ema3 = getEMA(ema2Clean, length)
      return ema1.map((v, i) => {
        if (v === null || ema2[i] === null || ema3[i] === null) return null
        return 3 * v - 3 * ema2[i]! + ema3[i]!
      })
    }
    case 'HMA': {
      const half = Math.max(1, Math.round(length / 2))
      const sqrtLen = Math.max(1, Math.round(Math.sqrt(length)))
      const wmaHalf = calcMASeries(source, half, 'WMA')
      const wmaFull = calcMASeries(source, length, 'WMA')
      const hullSource = source.map((_, i) => {
        if (wmaHalf[i] === null || wmaFull[i] === null) return 0
        return 2 * wmaHalf[i]! - wmaFull[i]!
      })
      return calcMASeries(hullSource, sqrtLen, 'WMA')
    }
  }
}

/** Reusable MA function used by boundary logic. Returns last MA value. */
export function calcMA(source: number[], length: number, type: MAType, volume?: number[]): number | null {
  const series = calcMASeries(source, length, type, volume)
  return series[series.length - 1] ?? null
}

export function evaluateThreeMABoundary(
  candles: Candle[],
  atr: number | null,
  cfg: MABoundaryConfig = {}
): MABoundaryDecision {
  const config = { ...DEFAULT_CONFIG, ...cfg }
  const closes = candles.map((c) => c.close)
  const volumes = candles.map((c) => c.volume)
  const price = closes[closes.length - 1] ?? 0

  const ma1Series = calcMASeries(closes, config.ma1Length, config.maType, volumes)
  const ma2Series = calcMASeries(closes, config.ma2Length, config.maType, volumes)
  const ma3Series = calcMASeries(closes, config.ma3Length, config.maType, volumes)

  const ma1 = ma1Series[ma1Series.length - 1]
  const ma2 = ma2Series[ma2Series.length - 1]
  const ma3 = ma3Series[ma3Series.length - 1]
  const prevMa1 = ma1Series[ma1Series.length - 2]
  const prevMa2 = ma2Series[ma2Series.length - 2]
  const prevMa3 = ma3Series[ma3Series.length - 2]

  if ([ma1, ma2, ma3, prevMa1, prevMa2, prevMa3].some((v) => v === null) || price <= 0) {
    return {
      signal: 'WAIT',
      reason: 'insufficient_ma_data',
      confidence: 0,
      ma1: ma1 ?? null,
      ma2: ma2 ?? null,
      ma3: ma3 ?? null,
      slope: null,
      maSpread: null,
      distanceFromMA2: null,
      nearMA2: false,
    }
  }

  const slope = ma1! - prevMa1!
  const maSpread = Math.abs(ma1! - ma3!) / price
  const distanceFromMA2 = Math.abs(price - ma2!) / price
  const nearMA2 = atr !== null ? Math.abs(price - ma2!) < atr * config.pullbackAtrMultiplier : false

  if (maSpread < config.noTradeSpreadThreshold) {
    return { signal: 'NO_TRADE', reason: 'no_trade_zone', confidence: 0, ma1, ma2, ma3, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  if (Math.abs(slope) < config.slopeThreshold) {
    return { signal: 'NO_TRADE', reason: 'slope_too_flat', confidence: 0, ma1, ma2, ma3, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  if (distanceFromMA2 > config.maxDistanceFromMA2) {
    return { signal: 'NO_TRADE', reason: 'too_far_from_ma2', confidence: 0, ma1, ma2, ma3, slope, maSpread, distanceFromMA2, nearMA2 }
  }

  const bullishTrend = ma1! > ma2! && ma2! > ma3!
  const bearishTrend = ma1! < ma2! && ma2! < ma3!
  const bullishStable = bullishTrend && prevMa1! > prevMa2! && prevMa2! > prevMa3!
  const bearishStable = bearishTrend && prevMa1! < prevMa2! && prevMa2! < prevMa3!

  const separationStrength = Math.min(1, maSpread / 0.01)
  const slopeStrength = Math.min(1, Math.abs(slope) / Math.max(config.slopeThreshold * 4, 0.0001))
  const closenessStrength = Math.max(0, 1 - distanceFromMA2 / config.maxDistanceFromMA2)
  const confidence = Number(((separationStrength + slopeStrength + closenessStrength) / 3).toFixed(3))

  if (bullishStable && slope > 0 && nearMA2) {
    return { signal: 'BUY', confidence, ma1, ma2, ma3, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  if (bearishStable && slope < 0 && nearMA2) {
    return { signal: 'SELL', confidence, ma1, ma2, ma3, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  return { signal: 'WAIT', reason: 'entry_conditions_not_met', confidence, ma1, ma2, ma3, slope, maSpread, distanceFromMA2, nearMA2 }
}
