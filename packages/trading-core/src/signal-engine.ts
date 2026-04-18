/**
 * Signal engine — 6-indicator confluence strategy for NSE intraday (5-min).
 *
 * Indicators: EMA cross, RSI, MACD, Supertrend, Bollinger Bands, VWAP
 * Signal fires when `config.confluenceThreshold` (default 4) of 6 indicators agree.
 * Strength: threshold/6 = WEAK, threshold+1/6 = STRONG, 6/6 = VERY_STRONG
 */

import type {
  Candle, IndicatorValues, IndicatorVoteDetail,
  Signal, SignalType, SignalStrength, StrategyConfig,
} from './types'
import { DEFAULT_STRATEGY_CONFIG } from './config'
import { evaluateThreeMABoundary } from './ma-boundary'

export function generateSignal(
  indicators: IndicatorValues,
  candles: Candle[],
  config: StrategyConfig = DEFAULT_STRATEGY_CONFIG
): Signal {
  const preTradeFilter = evaluateThreeMABoundary(candles, indicators.atr)
  const votes: IndicatorVoteDetail[] = []

  // ── 1. EMA Fast / Slow Cross ─────────────────────────────────────────────
  if (indicators.ema9 !== null && indicators.ema21 !== null) {
    const bullish = indicators.ema9 > indicators.ema21
    const spread  = Math.abs(indicators.ema9 - indicators.ema21)
    const pct     = ((spread / indicators.close) * 100).toFixed(2)
    votes.push({
      name: 'EMA Cross',
      vote: bullish ? 'BUY' : 'SELL',
      value: `EMA${config.emaFast}: ₹${indicators.ema9.toFixed(1)}  EMA${config.emaSlow}: ₹${indicators.ema21.toFixed(1)}`,
      reason: bullish
        ? `EMA${config.emaFast} above EMA${config.emaSlow} by ${pct}% — uptrend momentum`
        : `EMA${config.emaFast} below EMA${config.emaSlow} by ${pct}% — downtrend momentum`,
    })
  } else {
    votes.push({ name: 'EMA Cross', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 2. RSI ────────────────────────────────────────────────────────────────
  if (indicators.rsi !== null) {
    const r = indicators.rsi
    let vote: 'BUY' | 'SELL' | 'NEUTRAL'
    let reason: string

    if (r < config.rsiOversold) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} — deeply oversold, expect bounce`
    } else if (r < config.rsiNeutralZone) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} — oversold territory, bullish bias`
    } else if (r <= config.rsiBullishZone) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} — healthy bullish momentum zone`
    } else if (r <= config.rsiNeutralHigh) {
      vote = 'NEUTRAL'; reason = `RSI ${r.toFixed(1)} — elevated, watch for reversal`
    } else {
      vote = 'SELL'; reason = `RSI ${r.toFixed(1)} — overbought, expect pullback`
    }
    votes.push({ name: 'RSI(14)', vote, value: `${r.toFixed(1)}`, reason })
  } else {
    votes.push({ name: 'RSI(14)', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 3. MACD ───────────────────────────────────────────────────────────────
  if (indicators.macd !== null && indicators.macdSignal !== null && indicators.macdHistogram !== null) {
    const bullish = indicators.macd > indicators.macdSignal
    const hist    = indicators.macdHistogram.toFixed(3)
    const trend   = indicators.macdHistogram > 0 ? 'expanding' : 'contracting'
    votes.push({
      name: 'MACD',
      vote: bullish ? 'BUY' : 'SELL',
      value: `MACD: ${indicators.macd.toFixed(3)}  Sig: ${indicators.macdSignal.toFixed(3)}  Hist: ${hist}`,
      reason: bullish
        ? `MACD above signal (histogram ${hist} ${trend}) — bullish crossover`
        : `MACD below signal (histogram ${hist} ${trend}) — bearish crossover`,
    })
  } else {
    votes.push({ name: 'MACD', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 4. Supertrend ─────────────────────────────────────────────────────────
  if (indicators.supertrend !== null) {
    const bullish = indicators.supertrend === 'BUY'
    const line    = indicators.supertrendLine?.toFixed(1) ?? 'n/a'
    votes.push({
      name: 'Supertrend',
      vote: bullish ? 'BUY' : 'SELL',
      value: `Line: ₹${line}  Trend: ${bullish ? 'UP' : 'DOWN'}`,
      reason: bullish
        ? `Price above Supertrend support at ₹${line} — uptrend intact`
        : `Price below Supertrend resistance at ₹${line} — downtrend active`,
    })
  } else {
    votes.push({ name: 'Supertrend', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 5. Bollinger Bands ────────────────────────────────────────────────────
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
      reason = `Price ₹${price.toFixed(1)} at/above BB upper ₹${indicators.bbUpper.toFixed(1)} — overbought (BW: ${bw}%)`
    } else if (price > indicators.bbMiddle) {
      vote = 'BUY'
      reason = `Price ₹${price.toFixed(1)} above BB midline ₹${indicators.bbMiddle.toFixed(1)} — bullish bias (BW: ${bw}%)`
    } else {
      vote = 'SELL'
      reason = `Price ₹${price.toFixed(1)} below BB midline ₹${indicators.bbMiddle.toFixed(1)} — bearish bias (BW: ${bw}%)`
    }
    votes.push({
      name: 'BB Bands',
      vote,
      value: `U: ₹${indicators.bbUpper.toFixed(1)}  M: ₹${indicators.bbMiddle.toFixed(1)}  L: ₹${indicators.bbLower.toFixed(1)}`,
      reason,
    })
  } else {
    votes.push({ name: 'BB Bands', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data' })
  }

  // ── 6. VWAP ───────────────────────────────────────────────────────────────
  if (indicators.vwap !== null) {
    const price   = indicators.close
    const diff    = ((price - indicators.vwap) / indicators.vwap * 100).toFixed(2)
    const bullish = price > indicators.vwap
    votes.push({
      name: 'VWAP',
      vote: bullish ? 'BUY' : 'SELL',
      value: `VWAP: ₹${indicators.vwap.toFixed(1)}  Price: ₹${price.toFixed(1)}`,
      reason: bullish
        ? `Price ${diff}% above VWAP ₹${indicators.vwap.toFixed(1)} — institutional buying zone`
        : `Price ${diff}% below VWAP ₹${indicators.vwap.toFixed(1)} — distribution pressure`,
    })
  } else {
    votes.push({ name: 'VWAP', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient volume data for VWAP' })
  }

  // ── Tally ─────────────────────────────────────────────────────────────────
  const buyCount  = votes.filter((v) => v.vote === 'BUY').length
  const sellCount = votes.filter((v) => v.vote === 'SELL').length

  let type: SignalType = 'HOLD'
  let confluenceScore  = 0

  if (buyCount >= config.confluenceThreshold && buyCount > sellCount) {
    type           = 'BUY'
    confluenceScore = buyCount
  } else if (sellCount >= config.confluenceThreshold && sellCount > buyCount) {
    type           = 'SELL'
    confluenceScore = sellCount
  } else {
    confluenceScore = Math.max(buyCount, sellCount)
  }

  // Build reasons map
  const reasons: Record<string, string> = {}
  const KEY_MAP: Record<string, string> = {
    'EMA Cross': 'ema_cross', 'RSI(14)': 'rsi', 'MACD': 'macd',
    'Supertrend': 'supertrend', 'BB Bands': 'bb', 'VWAP': 'vwap',
  }
  for (const v of votes) {
    const key = KEY_MAP[v.name] ?? v.name.toLowerCase()
    reasons[key] = `${v.vote === 'BUY' ? '✅' : v.vote === 'SELL' ? '❌' : '⚪'} ${v.reason}`
  }

  // Apply pre-trade filter
  if (type !== 'HOLD') {
    if (preTradeFilter.signal === 'NO_TRADE') {
      type = 'HOLD'
      reasons.pre_trade_filter = `⛔ MA boundary rejected trade (${preTradeFilter.reason ?? 'filter_failed'})`
    } else if (preTradeFilter.signal === 'WAIT') {
      type = 'HOLD'
      reasons.pre_trade_filter = `⚪ MA boundary says WAIT (${preTradeFilter.reason ?? 'entry_conditions_not_met'})`
    } else if (preTradeFilter.signal !== type) {
      type = 'HOLD'
      reasons.pre_trade_filter = `⚠ MA boundary direction mismatch (${preTradeFilter.signal} vs confluence ${type})`
    } else {
      reasons.pre_trade_filter = `✅ MA boundary validated ${preTradeFilter.signal} (confidence ${preTradeFilter.confidence})`
    }
  } else {
    reasons.pre_trade_filter = `⚪ Confluence is HOLD; MA boundary: ${preTradeFilter.signal}`
  }

  // Strength: VERY_STRONG = 6/6, STRONG = 5/6, WEAK = 4/6
  let strength: SignalStrength = 'WEAK'
  if (confluenceScore >= 6)      strength = 'VERY_STRONG'
  else if (confluenceScore >= 5) strength = 'STRONG'

  const lastCandle = candles[candles.length - 1]!

  return {
    type, strength, confluenceScore,
    price: indicators.close,
    indicators,
    votes,
    reasons,
    preTradeFilter,
    candleTime: new Date(lastCandle.time * 1000),
  }
}

/** True only for STRONG or VERY_STRONG BUY/SELL signals. */
export function isActionableSignal(signal: Signal): boolean {
  return (
    (signal.type === 'BUY' || signal.type === 'SELL') &&
    (signal.strength === 'STRONG' || signal.strength === 'VERY_STRONG')
  )
}
