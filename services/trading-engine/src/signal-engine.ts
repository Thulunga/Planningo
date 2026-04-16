/**
 * Signal engine — 6-indicator confluence strategy for NSE intraday (5-min).
 *
 * Indicators: EMA cross, RSI, MACD, Supertrend, Bollinger Bands, VWAP
 * Signal fires when 4+ of 6 indicators agree (upgraded from 3/5).
 * Strength: 4/6 = WEAK, 5/6 = STRONG, 6/6 = VERY_STRONG
 *
 * Returns full vote breakdown + human-readable reasons for each indicator.
 */

import type { IndicatorValues } from './indicators'
import type { Candle } from './market-data'

export type SignalType    = 'BUY' | 'SELL' | 'HOLD'
export type SignalStrength = 'WEAK' | 'STRONG' | 'VERY_STRONG'

export interface IndicatorVoteDetail {
  name: string
  vote: 'BUY' | 'SELL' | 'NEUTRAL'
  value: string    // formatted display value
  reason: string   // human-readable explanation
}

export interface Signal {
  type: SignalType
  strength: SignalStrength
  confluenceScore: number
  price: number
  indicators: IndicatorValues
  votes: IndicatorVoteDetail[]
  reasons: Record<string, string>   // { ema_cross: "...", rsi: "...", ... }
  candleTime: Date
}

/**
 * Score each of the 6 indicators and return a confluence signal with full breakdown.
 */
export function generateSignal(indicators: IndicatorValues, candles: Candle[]): Signal {
  const voteDetails: IndicatorVoteDetail[] = []

  // ── 1. EMA 9 / 21 Cross ─────────────────────────────────────────────────
  if (indicators.ema9 !== null && indicators.ema21 !== null) {
    const bullish = indicators.ema9 > indicators.ema21
    const spread  = Math.abs(indicators.ema9 - indicators.ema21)
    const pct     = ((spread / indicators.close) * 100).toFixed(2)
    voteDetails.push({
      name: 'EMA Cross',
      vote: bullish ? 'BUY' : 'SELL',
      value: `EMA9: ₹${indicators.ema9.toFixed(1)}  EMA21: ₹${indicators.ema21.toFixed(1)}`,
      reason: bullish
        ? `EMA9 above EMA21 by ${pct}% — uptrend momentum`
        : `EMA9 below EMA21 by ${pct}% — downtrend momentum`,
    })
  } else {
    voteDetails.push({ name: 'EMA Cross', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 2. RSI (14) ──────────────────────────────────────────────────────────
  if (indicators.rsi !== null) {
    const r = indicators.rsi
    let vote: 'BUY' | 'SELL' | 'NEUTRAL'
    let reason: string

    if (r < 35) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} — deeply oversold, expect bounce`
    } else if (r < 45) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} — oversold territory, bullish bias`
    } else if (r <= 60) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} — healthy bullish momentum zone`
    } else if (r <= 70) {
      vote = 'NEUTRAL'; reason = `RSI ${r.toFixed(1)} — elevated, watch for reversal`
    } else {
      vote = 'SELL'; reason = `RSI ${r.toFixed(1)} — overbought, expect pullback`
    }
    voteDetails.push({ name: 'RSI(14)', vote, value: `${r.toFixed(1)}`, reason })
  } else {
    voteDetails.push({ name: 'RSI(14)', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 3. MACD (12, 26, 9) ──────────────────────────────────────────────────
  if (indicators.macd !== null && indicators.macdSignal !== null && indicators.macdHistogram !== null) {
    const bullish = indicators.macd > indicators.macdSignal
    const hist    = indicators.macdHistogram.toFixed(3)
    const trend   = indicators.macdHistogram > 0 ? 'expanding' : 'contracting'
    voteDetails.push({
      name: 'MACD',
      vote: bullish ? 'BUY' : 'SELL',
      value: `MACD: ${indicators.macd.toFixed(3)}  Sig: ${indicators.macdSignal.toFixed(3)}  Hist: ${hist}`,
      reason: bullish
        ? `MACD above signal (histogram ${hist} ${trend}) — bullish crossover`
        : `MACD below signal (histogram ${hist} ${trend}) — bearish crossover`,
    })
  } else {
    voteDetails.push({ name: 'MACD', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 4. Supertrend (7, 3) ─────────────────────────────────────────────────
  if (indicators.supertrend !== null) {
    const bullish = indicators.supertrend === 'BUY'
    const line    = indicators.supertrendLine?.toFixed(1) ?? 'n/a'
    voteDetails.push({
      name: 'Supertrend',
      vote: bullish ? 'BUY' : 'SELL',
      value: `Line: ₹${line}  Trend: ${bullish ? '🟢 UP' : '🔴 DOWN'}`,
      reason: bullish
        ? `Price above Supertrend support at ₹${line} — uptrend intact`
        : `Price below Supertrend resistance at ₹${line} — downtrend active`,
    })
  } else {
    voteDetails.push({ name: 'Supertrend', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 5. Bollinger Bands (20, 2) ────────────────────────────────────────────
  if (indicators.bbUpper !== null && indicators.bbLower !== null && indicators.bbMiddle !== null) {
    const price = indicators.close
    const bw    = ((indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle * 100).toFixed(1)
    let vote: 'BUY' | 'SELL' | 'NEUTRAL'
    let reason: string

    if (price <= indicators.bbLower * 1.005) {
      vote = 'BUY'
      reason = `Price ₹${price.toFixed(1)} at/below BB lower ₹${indicators.bbLower.toFixed(1)} — oversold bounce expected (BW: ${bw}%)`
    } else if (price >= indicators.bbUpper * 0.995) {
      vote = 'SELL'
      reason = `Price ₹${price.toFixed(1)} at/above BB upper ₹${indicators.bbUpper.toFixed(1)} — overbought, mean reversion likely (BW: ${bw}%)`
    } else if (price > indicators.bbMiddle) {
      vote = 'BUY'
      reason = `Price ₹${price.toFixed(1)} above BB midline ₹${indicators.bbMiddle.toFixed(1)} — bullish bias within band (BW: ${bw}%)`
    } else {
      vote = 'SELL'
      reason = `Price ₹${price.toFixed(1)} below BB midline ₹${indicators.bbMiddle.toFixed(1)} — bearish bias within band (BW: ${bw}%)`
    }
    voteDetails.push({
      name: 'BB Bands',
      vote,
      value: `U: ₹${indicators.bbUpper.toFixed(1)}  M: ₹${indicators.bbMiddle.toFixed(1)}  L: ₹${indicators.bbLower.toFixed(1)}`,
      reason,
    })
  } else {
    voteDetails.push({ name: 'BB Bands', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 6. VWAP ──────────────────────────────────────────────────────────────
  if (indicators.vwap !== null) {
    const price  = indicators.close
    const diff   = ((price - indicators.vwap) / indicators.vwap * 100).toFixed(2)
    const bullish = price > indicators.vwap
    voteDetails.push({
      name: 'VWAP',
      vote: bullish ? 'BUY' : 'SELL',
      value: `VWAP: ₹${indicators.vwap.toFixed(1)}  Price: ₹${price.toFixed(1)}`,
      reason: bullish
        ? `Price ${diff}% above VWAP ₹${indicators.vwap.toFixed(1)} — institutional buying zone`
        : `Price ${diff}% below VWAP ₹${indicators.vwap.toFixed(1)} — distribution / selling pressure`,
    })
  } else {
    voteDetails.push({ name: 'VWAP', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient volume data for VWAP' })
  }

  // ── Tally ─────────────────────────────────────────────────────────────────
  const actionableVotes = voteDetails.filter((v) => v.vote !== 'NEUTRAL')
  const buyCount  = actionableVotes.filter((v) => v.vote === 'BUY').length
  const sellCount = actionableVotes.filter((v) => v.vote === 'SELL').length

  let type: SignalType = 'HOLD'
  let confluenceScore  = 0

  if (buyCount >= 4 && buyCount > sellCount) {
    type = 'BUY'
    confluenceScore = buyCount
  } else if (sellCount >= 4 && sellCount > buyCount) {
    type = 'SELL'
    confluenceScore = sellCount
  } else {
    confluenceScore = Math.max(buyCount, sellCount)
  }

  let strength: SignalStrength = 'WEAK'
  if (confluenceScore >= 6)      strength = 'VERY_STRONG'
  else if (confluenceScore >= 5) strength = 'STRONG'
  else                           strength = 'WEAK'

  const reasons: Record<string, string> = {}
  const keyMap: Record<string, string> = {
    'EMA Cross': 'ema_cross', 'RSI(14)': 'rsi', 'MACD': 'macd',
    'Supertrend': 'supertrend', 'BB Bands': 'bb', 'VWAP': 'vwap',
  }
  for (const v of voteDetails) {
    const key = keyMap[v.name] ?? v.name.toLowerCase()
    reasons[key] = `${v.vote !== 'NEUTRAL' ? (v.vote === 'BUY' ? '✅' : '❌') : '⚪'} ${v.reason}`
  }

  const lastCandle = candles[candles.length - 1]!

  return {
    type, strength, confluenceScore,
    price: indicators.close,
    indicators,
    votes: voteDetails,
    reasons,
    candleTime: new Date(lastCandle.time * 1000),
  }
}

/** True for STRONG or VERY_STRONG BUY/SELL signals */
export function isActionableSignal(signal: Signal): boolean {
  return (
    (signal.type === 'BUY' || signal.type === 'SELL') &&
    (signal.strength === 'STRONG' || signal.strength === 'VERY_STRONG')
  )
}
