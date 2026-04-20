/**
 * Signal engine - Weighted confluence strategy for NSE intraday (5-min).
 *
 * PHASE 7 REFACTOR: Weighted scoring replaces equal-vote mechanism.
 * 
 * Weights (points per indicator):
 *   Structure (swing break / pullback):  2 points (confidence-based)
 *   VWAP + Volume Confirmation:         2 points each
 *   EMA, RSI, MACD, Supertrend:         1 point each
 *   Bollinger Bands:                    0.5 points (lowest confidence)
 * 
 * Threshold: 6+ points to generate a signal (up from 4/6 equal votes)
 * 
 * TREND FILTER (MANDATORY):
 * Only BUY signals are allowed in BULLISH trend (HTF price > EMA50, RSI > 40).
 * Only SELL signals are allowed in BEARISH trend (HTF price < EMA50, RSI < 60).
 * NEUTRAL trend blocks all signals.
 */

import type {
  Candle, IndicatorValues, IndicatorVoteDetail,
  Signal, SignalType, SignalStrength, StrategyConfig, TrendContext,
} from './types'
import { DEFAULT_STRATEGY_CONFIG } from './config'
import { evaluateThreeMABoundary } from './ma-boundary'
import { analyzeBullishStructure, analyzeBearishStructure, DEFAULT_STRUCTURE_CONFIG } from './structure-analyzer'
import { analyzeVolume, DEFAULT_VOLUME_CONFIG } from './volume-analyzer'

export function generateSignal(
  indicators: IndicatorValues,
  candles: Candle[],
  config: StrategyConfig = DEFAULT_STRATEGY_CONFIG,
  trendContext: TrendContext | null = null
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
        ? `EMA${config.emaFast} above EMA${config.emaSlow} by ${pct}% - uptrend momentum`
        : `EMA${config.emaFast} below EMA${config.emaSlow} by ${pct}% - downtrend momentum`,
      weight: 1,
    })
  } else {
    votes.push({ name: 'EMA Cross', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data', weight: 1 })
  }

  // ── 2. RSI ────────────────────────────────────────────────────────────────
  if (indicators.rsi !== null) {
    const r = indicators.rsi
    let vote: 'BUY' | 'SELL' | 'NEUTRAL'
    let reason: string

    if (r < config.rsiOversold) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} - deeply oversold, expect bounce`
    } else if (r < config.rsiNeutralZone) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} - oversold territory, bullish bias`
    } else if (r <= config.rsiBullishZone) {
      vote = 'BUY'; reason = `RSI ${r.toFixed(1)} - healthy bullish momentum zone`
    } else if (r <= config.rsiNeutralHigh) {
      vote = 'NEUTRAL'; reason = `RSI ${r.toFixed(1)} - elevated, watch for reversal`
    } else {
      vote = 'SELL'; reason = `RSI ${r.toFixed(1)} - overbought, expect pullback`
    }
    votes.push({ name: 'RSI(14)', vote, value: `${r.toFixed(1)}`, reason, weight: 1 })
  } else {
    votes.push({ name: 'RSI(14)', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data', weight: 1 })
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
        ? `MACD above signal (histogram ${hist} ${trend}) - bullish crossover`
        : `MACD below signal (histogram ${hist} ${trend}) - bearish crossover`,
      weight: 1,
    })
  } else {
    votes.push({ name: 'MACD', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data', weight: 1 })
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
        ? `Price above Supertrend support at ₹${line} - uptrend intact`
        : `Price below Supertrend resistance at ₹${line} - downtrend active`,
      weight: 1,
    })
  } else {
    votes.push({ name: 'Supertrend', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data', weight: 1 })
  }

  // ── 5. Bollinger Bands ────────────────────────────────────────────────────
  if (indicators.bbUpper !== null && indicators.bbLower !== null && indicators.bbMiddle !== null) {
    const price = indicators.close
    const bw    = ((indicators.bbUpper - indicators.bbLower) / indicators.bbMiddle * 100).toFixed(1)
    let vote: 'BUY' | 'SELL' | 'NEUTRAL'
    let reason: string

    if (price <= indicators.bbLower * 1.005) {
      vote = 'BUY'
      reason = `Price ₹${price.toFixed(1)} at/below BB lower ₹${indicators.bbLower.toFixed(1)} - oversold bounce expected (BW: ${bw}%)`
    } else if (price >= indicators.bbUpper * 0.995) {
      vote = 'SELL'
      reason = `Price ₹${price.toFixed(1)} at/above BB upper ₹${indicators.bbUpper.toFixed(1)} - overbought (BW: ${bw}%)`
    } else if (price > indicators.bbMiddle) {
      vote = 'BUY'
      reason = `Price ₹${price.toFixed(1)} above BB midline ₹${indicators.bbMiddle.toFixed(1)} - bullish bias (BW: ${bw}%)`
    } else {
      vote = 'SELL'
      reason = `Price ₹${price.toFixed(1)} below BB midline ₹${indicators.bbMiddle.toFixed(1)} - bearish bias (BW: ${bw}%)`
    }
    votes.push({
      name: 'BB Bands',
      vote,
      value: `U: ₹${indicators.bbUpper.toFixed(1)}  M: ₹${indicators.bbMiddle.toFixed(1)}  L: ₹${indicators.bbLower.toFixed(1)}`,
      reason,
      weight: 0.5,  // Lowest weight - rely on structure/volume instead
    })
  } else {
    votes.push({ name: 'BB Bands', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient data', weight: 0.5 })
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
        ? `Price ${diff}% above VWAP ₹${indicators.vwap.toFixed(1)} - institutional buying zone`
        : `Price ${diff}% below VWAP ₹${indicators.vwap.toFixed(1)} - distribution pressure`,
      weight: 2,  // Increased weight - high institutional confirmation value
    })
  } else {
    votes.push({ name: 'VWAP', vote: 'NEUTRAL', value: 'n/a', reason: 'Insufficient volume data for VWAP', weight: 2 })
  }

  // ── 7. Structure Analysis (NEW) ──────────────────────────────────────────
  // Analyze bullish structures (swing breaks, pullbacks, strong candles)
  const bullishStructure = analyzeBullishStructure(
    candles.slice(Math.max(0, candles.length - 20)),
    indicators.close,
    indicators.ema9,
    indicators.ema21,
    indicators.atr,
    indicators.vwap,
    DEFAULT_STRUCTURE_CONFIG
  )
  const bearishStructure = analyzeBearishStructure(
    candles.slice(Math.max(0, candles.length - 20)),
    indicators.close,
    indicators.ema9,
    indicators.ema21,
    indicators.atr,
    indicators.vwap,
    DEFAULT_STRUCTURE_CONFIG
  )

  const structureVote = bullishStructure.confidence > bearishStructure.confidence ? 'BUY' : 'SELL'
  const structureConfidence = Math.max(bullishStructure.confidence, bearishStructure.confidence)
  const structureWeight = structureConfidence * 2  // Max 2 points
  const structureDetail = structureVote === 'BUY'
    ? `${bullishStructure.pattern} (conf: ${structureConfidence.toFixed(2)})`
    : `${bearishStructure.pattern} (conf: ${structureConfidence.toFixed(2)})`

  votes.push({
    name: 'Structure',
    vote: structureVote,
    value: structureDetail,
    reason: structureVote === 'BUY'
      ? `Bullish ${bullishStructure.pattern}: swing high/pullback/strong candle detected`
      : `Bearish ${bearishStructure.pattern}: swing low/pullback/strong candle detected`,
    weight: structureWeight,
  })

  // ── 8. Volume Analysis (NEW) ─────────────────────────────────────────────
  const volumeAnalysis = analyzeVolume(
    candles.slice(0, candles.length),
    DEFAULT_VOLUME_CONFIG
  )
  const volumeVote = volumeAnalysis.isConfirmed ? 'BUY' : 'SELL'  // SELL = no volume
  const volumeWeight = volumeAnalysis.isConfirmed ? 1 : 0  // Only 1 point if confirmed
  const volumeReason = volumeAnalysis.isConfirmed
    ? `Volume ratio ${volumeAnalysis.volumeRatio?.toFixed(2)}x exceeds threshold`
    : `Volume ratio ${volumeAnalysis.volumeRatio?.toFixed(2)}x below ${DEFAULT_VOLUME_CONFIG.multiplier}x threshold`

  votes.push({
    name: 'Volume',
    vote: volumeVote,
    value: `Current: ${(candles[candles.length - 1]?.volume ?? 0).toFixed(0)}  MA: ${volumeAnalysis.volumeMa?.toFixed(0) ?? 'n/a'}`,
    reason: volumeReason,
    weight: volumeWeight,
  })

  // ── Weighted Tally ──────────────────────────────────────────────────────────
  // Calculate weighted score: sum of (vote_weight × indicator_weight) for matching votes
  let buyScore  = 0
  let sellScore = 0

  for (const vote of votes) {
    const weight = vote.weight ?? 1
    if (vote.vote === 'BUY')  buyScore += weight
    if (vote.vote === 'SELL') sellScore += weight
  }

  let type: SignalType = 'HOLD'
  let confluenceScore  = 0

  // Threshold: 5+ weighted points
  // Traditional indicators alone max out at ~6.5pts; structure adds 0-2 more
  // 5pts is achievable with VWAP(2) + 3 agreeing indicators
  if (buyScore >= 5 && buyScore > sellScore) {
    type           = 'BUY'
    confluenceScore = buyScore
  } else if (sellScore >= 5 && sellScore > buyScore) {
    type           = 'SELL'
    confluenceScore = sellScore
  } else {
    confluenceScore = Math.max(buyScore, sellScore)
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

  // Strength: WEAK = 5-6, STRONG = 6-7.5, VERY_STRONG = 7.5+
  let strength: SignalStrength = 'WEAK'
  if (confluenceScore >= 7.5)    strength = 'VERY_STRONG'
  else if (confluenceScore >= 6) strength = 'STRONG'

  const lastCandle = candles[candles.length - 1]!

  // Default trend context if not provided (backward compatibility)
  const trend: TrendContext = trendContext ?? {
    direction: 'NEUTRAL',
    strength: 'WEAK',
    htfEma50: null,
    htfRsi: null,
    candleTime: lastCandle.time,
  }

  // ── Apply Trend Filter (MANDATORY) ────────────────────────────────────────
  // Only allow BUY in BULLISH trend, SELL in BEARISH trend, reject NEUTRAL
  let finalType = type
  let trendReason = ''

  if (type !== 'HOLD') {
    if (trend.direction === 'NEUTRAL') {
      finalType = 'HOLD'
      trendReason = `⚪ HTF trend is NEUTRAL (EMA50: ${trend.htfEma50?.toFixed(1) ?? 'n/a'}, RSI: ${trend.htfRsi?.toFixed(1) ?? 'n/a'}) - no entry allowed`
    } else if (type === 'BUY' && trend.direction === 'BEARISH') {
      finalType = 'HOLD'
      trendReason = `❌ HTF trend is BEARISH (EMA50: ${trend.htfEma50?.toFixed(1) ?? 'n/a'}, RSI: ${trend.htfRsi?.toFixed(1) ?? 'n/a'}) - rejecting BUY signal`
    } else if (type === 'SELL' && trend.direction === 'BULLISH') {
      finalType = 'HOLD'
      trendReason = `❌ HTF trend is BULLISH (EMA50: ${trend.htfEma50?.toFixed(1) ?? 'n/a'}, RSI: ${trend.htfRsi?.toFixed(1) ?? 'n/a'}) - rejecting SELL signal`
    } else {
      // Signal aligns with trend
      const trendStrengthLabel = trend.strength === 'STRONG' ? '💪 STRONG' : '⚖️ WEAK'
      trendReason = `✅ ${trendStrengthLabel} HTF ${trend.direction} trend (EMA50: ${trend.htfEma50?.toFixed(1) ?? 'n/a'}, RSI: ${trend.htfRsi?.toFixed(1) ?? 'n/a'}) - ${type} allowed`
    }
  } else {
    trendReason = `⚪ Confluence is HOLD; HTF trend: ${trend.direction}`
  }

  reasons.trend_filter = trendReason

  return {
    type: finalType,
    strength,
    confluenceScore,
    price: indicators.close,
    indicators,
    votes,
    reasons,
    preTradeFilter,
    trendContext: trend,
    candleTime: new Date(lastCandle.time * 1000),
  }
}

/** True only for STRONG or VERY_STRONG BUY/SELL signals that pass trend filter. */
export function isActionableSignal(signal: Signal): boolean {
  return (
    (signal.type === 'BUY' || signal.type === 'SELL') &&
    (signal.strength === 'STRONG' || signal.strength === 'VERY_STRONG')
  )
}
