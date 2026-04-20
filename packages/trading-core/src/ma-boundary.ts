/**
 * 3-MA Boundary filter - prevents counter-trend entries.
 * Authoritative implementation shared by service and web app.
 *
 * Signal conditions:
 *   BUY:      MA1 > MA2 > MA3 (stable), MA1 slope positive, price near MA2
 *   SELL:     MA1 < MA2 < MA3 (stable), MA1 slope negative, price near MA2
 *   WAIT:     Trend aligned but price not close enough to MA2
 *   NO_TRADE: Spread too tight, slope too flat, or distance from MA2 too far
 */

import type { Candle, MAType, MABoundaryConfig, MABoundaryDecision } from './types'

export type { MAType, MABoundaryConfig, MABoundaryDecision }

const DEFAULT_MA_CONFIG: Required<MABoundaryConfig> = {
  ma1Length: 9,
  ma2Length: 21,
  ma3Length: 50,
  maType: 'EMA',
  noTradeSpreadThreshold: 0.002,
  slopeThreshold: 0.05,
  maxDistanceFromMA2: 0.01,
  pullbackAtrMultiplier: 0.5,
}

// ── MA calculation helpers ────────────────────────────────────────────────────

function getSMA(values: number[], length: number, index: number): number | null {
  if (index < length - 1) return null
  let sum = 0
  for (let i = index - length + 1; i <= index; i++) sum += values[i]!
  return sum / length
}

function getWMA(values: number[], length: number, index: number): number | null {
  if (index < length - 1) return null
  const denom = (length * (length + 1)) / 2
  let ws = 0
  for (let i = 0; i < length; i++) ws += values[index - length + 1 + i]! * (i + 1)
  return ws / denom
}

function getVWMA(
  source: number[], volume: number[], length: number, index: number
): number | null {
  if (index < length - 1) return null
  let num = 0, den = 0
  for (let i = index - length + 1; i <= index; i++) {
    num += source[i]! * volume[i]!
    den += volume[i]!
  }
  return den === 0 ? null : num / den
}

function getEMASeries(values: number[], length: number): Array<number | null> {
  const out: Array<number | null> = new Array(values.length).fill(null)
  if (values.length < length) return out
  const k   = 2 / (length + 1)
  let prev  = 0
  for (let i = 0; i < length; i++) prev += values[i]!
  prev /= length
  out[length - 1] = prev
  for (let i = length; i < values.length; i++) {
    prev    = (values[i]! - prev) * k + prev
    out[i]  = prev
  }
  return out
}

function calcMASeries(
  source: number[], length: number, type: MAType, volume?: number[]
): Array<number | null> {
  const out: Array<number | null> = new Array(source.length).fill(null)

  switch (type) {
    case 'SMA':
      for (let i = 0; i < source.length; i++) out[i] = getSMA(source, length, i)
      return out
    case 'EMA':
      return getEMASeries(source, length)
    case 'WMA':
      for (let i = 0; i < source.length; i++) out[i] = getWMA(source, length, i)
      return out
    case 'VWMA':
      for (let i = 0; i < source.length; i++)
        out[i] = volume ? getVWMA(source, volume, length, i) : null
      return out
    case 'DEMA': {
      const e1 = getEMASeries(source, length)
      const e2 = getEMASeries(e1.map((v) => v ?? 0), length)
      return e1.map((v, i) => (v === null || e2[i] === null ? null : 2 * v - e2[i]!))
    }
    case 'TEMA': {
      const e1 = getEMASeries(source, length)
      const e2 = getEMASeries(e1.map((v) => v ?? 0), length)
      const e3 = getEMASeries(e2.map((v) => v ?? 0), length)
      return e1.map((v, i) => {
        if (v === null || e2[i] === null || e3[i] === null) return null
        return 3 * v - 3 * e2[i]! + e3[i]!
      })
    }
    case 'HMA': {
      const half    = Math.max(1, Math.round(length / 2))
      const sqrtLen = Math.max(1, Math.round(Math.sqrt(length)))
      const wHalf   = calcMASeries(source, half, 'WMA')
      const wFull   = calcMASeries(source, length, 'WMA')
      const hull    = source.map((_, i) =>
        wHalf[i] === null || wFull[i] === null ? 0 : 2 * wHalf[i]! - wFull[i]!)
      return calcMASeries(hull, sqrtLen, 'WMA')
    }
  }
}

/** Returns last MA value for a given source series. */
export function calcMA(
  source: number[], length: number, type: MAType, volume?: number[]
): number | null {
  const series = calcMASeries(source, length, type, volume)
  return series[series.length - 1] ?? null
}

// ── Boundary evaluation ───────────────────────────────────────────────────────

export function evaluateThreeMABoundary(
  candles: Candle[],
  atr: number | null,
  cfg: MABoundaryConfig = {}
): MABoundaryDecision {
  const config  = { ...DEFAULT_MA_CONFIG, ...cfg }
  const closes  = candles.map((c) => c.close)
  const volumes = candles.map((c) => c.volume)
  const price   = closes[closes.length - 1] ?? 0

  const s1 = calcMASeries(closes, config.ma1Length, config.maType, volumes)
  const s2 = calcMASeries(closes, config.ma2Length, config.maType, volumes)
  const s3 = calcMASeries(closes, config.ma3Length, config.maType, volumes)

  const ma1     = s1[s1.length - 1]
  const ma2     = s2[s2.length - 1]
  const ma3     = s3[s3.length - 1]
  const prevMa1 = s1[s1.length - 2]
  const prevMa2 = s2[s2.length - 2]
  const prevMa3 = s3[s3.length - 2]

  if ([ma1, ma2, ma3, prevMa1, prevMa2, prevMa3].some((v) => v == null) || price <= 0) {
    return {
      signal: 'WAIT', reason: 'insufficient_ma_data', confidence: 0,
      ma1: ma1 ?? null, ma2: ma2 ?? null, ma3: ma3 ?? null,
      slope: null, maSpread: null, distanceFromMA2: null, nearMA2: false,
    }
  }

  const slope          = ma1! - prevMa1!
  const maSpread       = Math.abs(ma1! - ma3!) / price
  const distanceFromMA2 = Math.abs(price - ma2!) / price
  const nearMA2        = atr !== null
    ? Math.abs(price - ma2!) < atr * config.pullbackAtrMultiplier
    : false

  if (maSpread < config.noTradeSpreadThreshold) {
    return { signal: 'NO_TRADE', reason: 'no_trade_zone', confidence: 0, ma1: ma1!, ma2: ma2!, ma3: ma3!, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  if (Math.abs(slope) < config.slopeThreshold) {
    return { signal: 'NO_TRADE', reason: 'slope_too_flat', confidence: 0, ma1: ma1!, ma2: ma2!, ma3: ma3!, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  if (distanceFromMA2 > config.maxDistanceFromMA2) {
    return { signal: 'NO_TRADE', reason: 'too_far_from_ma2', confidence: 0, ma1: ma1!, ma2: ma2!, ma3: ma3!, slope, maSpread, distanceFromMA2, nearMA2 }
  }

  const bullishStable = ma1! > ma2! && ma2! > ma3! && prevMa1! > prevMa2! && prevMa2! > prevMa3!
  const bearishStable = ma1! < ma2! && ma2! < ma3! && prevMa1! < prevMa2! && prevMa2! < prevMa3!

  const sepStr    = Math.min(1, maSpread / 0.01)
  const slopeStr  = Math.min(1, Math.abs(slope) / Math.max(config.slopeThreshold * 4, 0.0001))
  const closeStr  = Math.max(0, 1 - distanceFromMA2 / config.maxDistanceFromMA2)
  const confidence = Number(((sepStr + slopeStr + closeStr) / 3).toFixed(3))

  if (bullishStable && slope > 0 && nearMA2) {
    return { signal: 'BUY', confidence, ma1: ma1!, ma2: ma2!, ma3: ma3!, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  if (bearishStable && slope < 0 && nearMA2) {
    return { signal: 'SELL', confidence, ma1: ma1!, ma2: ma2!, ma3: ma3!, slope, maSpread, distanceFromMA2, nearMA2 }
  }
  return { signal: 'WAIT', reason: 'entry_conditions_not_met', confidence, ma1: ma1!, ma2: ma2!, ma3: ma3!, slope, maSpread, distanceFromMA2, nearMA2 }
}
