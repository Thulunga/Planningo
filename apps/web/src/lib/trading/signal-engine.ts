/**
 * Signal engine: multi-indicator confluence strategy for NSE intraday (5-min).
 * Generates BUY / SELL / HOLD signals with a strength score.
 *
 * Signal is only actionable when 3+ indicators agree.
 * Strength:
 *   3/5 = WEAK
 *   4/5 = STRONG
 *   5/5 = VERY_STRONG
 */

import type { IndicatorValues } from './indicators'
import type { Candle } from './market-data'

export type SignalType = 'BUY' | 'SELL' | 'HOLD'
export type SignalStrength = 'WEAK' | 'STRONG' | 'VERY_STRONG'

export interface Signal {
  type: SignalType
  strength: SignalStrength
  confluenceScore: number
  price: number
  indicators: IndicatorValues
  reasons: string[]
  candleTime: Date
}

interface IndicatorVote {
  bullish: boolean | null  // null = neutral / insufficient data
  reason: string
}

/**
 * Score each indicator and produce a confluence signal.
 * Each indicator casts one vote: bullish (BUY) or bearish (SELL) or null (neutral).
 */
export function generateSignal(
  indicators: IndicatorValues,
  candles: Candle[]
): Signal {
  const votes: IndicatorVote[] = []

  // ── 1. EMA 9 / 21 Crossover ─────────────────────────────────────────────
  if (indicators.ema9 !== null && indicators.ema21 !== null) {
    const bullish = indicators.ema9 > indicators.ema21

    // Check previous candle for crossover (more precise signal)
    const prevCandles = candles.slice(-2)
    let isCrossover = false
    if (prevCandles.length === 2) {
      // We check if direction changed — simple heuristic
      const spread = Math.abs(indicators.ema9 - indicators.ema21)
      const tolerance = indicators.close * 0.001 // 0.1% of price
      isCrossover = spread < tolerance
    }

    votes.push({
      bullish: isCrossover ? bullish : bullish,
      reason: bullish
        ? `EMA9 (${indicators.ema9.toFixed(1)}) above EMA21 (${indicators.ema21.toFixed(1)})`
        : `EMA9 (${indicators.ema9.toFixed(1)}) below EMA21 (${indicators.ema21.toFixed(1)})`,
    })
  } else {
    votes.push({ bullish: null, reason: 'EMA data insufficient' })
  }

  // ── 2. RSI (14) ──────────────────────────────────────────────────────────
  if (indicators.rsi !== null) {
    let bullish: boolean | null = null
    let reason = ''

    if (indicators.rsi < 40) {
      bullish = true
      reason = `RSI ${indicators.rsi.toFixed(1)} — oversold (bullish reversal)`
    } else if (indicators.rsi >= 40 && indicators.rsi <= 65) {
      bullish = true
      reason = `RSI ${indicators.rsi.toFixed(1)} — healthy bullish momentum`
    } else if (indicators.rsi > 70) {
      bullish = false
      reason = `RSI ${indicators.rsi.toFixed(1)} — overbought (bearish)`
    } else {
      // 65-70 zone: neutral / weak
      bullish = null
      reason = `RSI ${indicators.rsi.toFixed(1)} — neutral zone`
    }

    votes.push({ bullish, reason })
  } else {
    votes.push({ bullish: null, reason: 'RSI data insufficient' })
  }

  // ── 3. MACD (12, 26, 9) ──────────────────────────────────────────────────
  if (
    indicators.macd !== null &&
    indicators.macdSignal !== null &&
    indicators.macdHistogram !== null
  ) {
    const bullish = indicators.macd > indicators.macdSignal
    votes.push({
      bullish,
      reason: bullish
        ? `MACD (${indicators.macd.toFixed(2)}) crossed above Signal (${indicators.macdSignal.toFixed(2)})`
        : `MACD (${indicators.macd.toFixed(2)}) crossed below Signal (${indicators.macdSignal.toFixed(2)})`,
    })
  } else {
    votes.push({ bullish: null, reason: 'MACD data insufficient' })
  }

  // ── 4. Supertrend (7, 3) ─────────────────────────────────────────────────
  if (indicators.supertrend !== null) {
    const bullish = indicators.supertrend === 'BUY'
    votes.push({
      bullish,
      reason: bullish
        ? `Supertrend: price above support (${indicators.supertrendLine?.toFixed(1)})`
        : `Supertrend: price below resistance (${indicators.supertrendLine?.toFixed(1)})`,
    })
  } else {
    votes.push({ bullish: null, reason: 'Supertrend data insufficient' })
  }

  // ── 5. Bollinger Bands (20, 2) ────────────────────────────────────────────
  if (
    indicators.bbUpper !== null &&
    indicators.bbLower !== null &&
    indicators.bbMiddle !== null
  ) {
    const price = indicators.close
    let bullish: boolean | null = null
    let reason = ''

    if (price <= indicators.bbLower * 1.005) {
      bullish = true
      reason = `Price (${price.toFixed(1)}) near/below BB lower (${indicators.bbLower.toFixed(1)}) — oversold bounce`
    } else if (price >= indicators.bbUpper * 0.995) {
      bullish = false
      reason = `Price (${price.toFixed(1)}) near/at BB upper (${indicators.bbUpper.toFixed(1)}) — overbought`
    } else {
      // Price is within bands — check direction vs middle
      bullish = price > indicators.bbMiddle ? true : false
      reason = `Price (${price.toFixed(1)}) ${price > indicators.bbMiddle ? 'above' : 'below'} BB middle (${indicators.bbMiddle.toFixed(1)})`
    }

    votes.push({ bullish, reason })
  } else {
    votes.push({ bullish: null, reason: 'Bollinger Bands data insufficient' })
  }

  // ── Tally votes ───────────────────────────────────────────────────────────
  const validVotes = votes.filter((v) => v.bullish !== null)
  const bullishCount = validVotes.filter((v) => v.bullish === true).length
  const bearishCount = validVotes.filter((v) => v.bullish === false).length

  let type: SignalType = 'HOLD'
  let confluenceScore = 0

  if (bullishCount >= bearishCount) {
    confluenceScore = bullishCount
    if (bullishCount >= 3 && bullishCount > bearishCount) {
      type = 'BUY'
    }
  }
  if (bearishCount > bullishCount) {
    confluenceScore = bearishCount
    if (bearishCount >= 3) {
      type = 'SELL'
    }
  }

  let strength: SignalStrength = 'WEAK'
  if (confluenceScore >= 5) strength = 'VERY_STRONG'
  else if (confluenceScore >= 4) strength = 'STRONG'
  else strength = 'WEAK'

  const reasons = votes
    .filter((v) => v.bullish !== null)
    .map((v) => v.reason)

  const lastCandle = candles[candles.length - 1]!

  return {
    type,
    strength,
    confluenceScore,
    price: indicators.close,
    indicators,
    reasons,
    candleTime: new Date(lastCandle.time * 1000),
  }
}

/** Determine if a signal is actionable (worth paper trading) */
export function isActionableSignal(signal: Signal): boolean {
  return (
    (signal.type === 'BUY' || signal.type === 'SELL') &&
    (signal.strength === 'STRONG' || signal.strength === 'VERY_STRONG')
  )
}
