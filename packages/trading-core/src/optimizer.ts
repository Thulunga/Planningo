/**
 * Strategy Optimizer — runs batch backtests across a parameter grid.
 *
 * Guardrails against overfitting:
 *   - minTrades: skip configs generating too few trades (under-sampled)
 *   - maxDrawdownCap: filter out configs with extreme drawdowns
 *
 * Ranking by composite score (default):
 *   composite = profitFactor×0.30 + normalised(sharpe)×0.25
 *             + winRate%/100×0.20 + normalised(totalReturn)×0.15
 *             + normalised(avgRMultiple)×0.10
 */

import type {
  Candle, ParameterGrid, OptimizerConfig, ExperimentResult,
  StrategyConfig, RiskConfig, PerformanceMetrics,
} from './types'
import { runBacktest } from './backtester'

// ── Parameter grid expansion ──────────────────────────────��───────────────────

type ParamCombination = Partial<StrategyConfig & RiskConfig>

export function expandGrid(grid: ParameterGrid): ParamCombination[] {
  const axes: Array<{ key: keyof ParamCombination; values: number[] }> = []

  if (grid.rsiOversold)         axes.push({ key: 'rsiOversold',         values: grid.rsiOversold })
  if (grid.rsiOverbought)       axes.push({ key: 'rsiOverbought',       values: grid.rsiOverbought })
  if (grid.emaFast)             axes.push({ key: 'emaFast',             values: grid.emaFast })
  if (grid.emaSlow)             axes.push({ key: 'emaSlow',             values: grid.emaSlow })
  if (grid.atrMultiplierStop)   axes.push({ key: 'atrMultiplierStop',   values: grid.atrMultiplierStop })
  if (grid.atrMultiplierTarget) axes.push({ key: 'atrMultiplierTarget', values: grid.atrMultiplierTarget })
  if (grid.confluenceThreshold) axes.push({ key: 'confluenceThreshold', values: grid.confluenceThreshold })

  if (axes.length === 0) return [{}]

  let combos: ParamCombination[] = [{}]
  for (const { key, values } of axes) {
    const next: ParamCombination[] = []
    for (const existing of combos) {
      for (const v of values) {
        next.push({ ...existing, [key]: v })
      }
    }
    combos = next
  }

  // Filter invalid combos (e.g. emaFast >= emaSlow)
  return combos.filter((c) => {
    if (c.emaFast !== undefined && c.emaSlow !== undefined && c.emaFast >= c.emaSlow) return false
    if (c.atrMultiplierTarget !== undefined && c.atrMultiplierStop !== undefined) {
      const ratio = c.atrMultiplierTarget / c.atrMultiplierStop
      if (ratio < 1.5) return false  // minimum 1.5:1 R:R from params
    }
    return true
  })
}

// ── Composite score ───────────────────────────────────────────────────────────

function compositeScore(
  metrics: PerformanceMetrics,
  allMetrics: PerformanceMetrics[]
): number {
  const pf     = Math.min(metrics.profitFactor, 10)   // cap at 10×
  const wr     = metrics.winRate / 100
  const sharpe = metrics.sharpeRatio ?? 0

  // Normalise sharpe and totalReturn across the run
  const sharpes  = allMetrics.map((m) => m.sharpeRatio ?? 0)
  const returns  = allMetrics.map((m) => m.totalReturn)
  const nSharpe  = normalise(sharpe,  Math.min(...sharpes),  Math.max(...sharpes))
  const nReturn  = normalise(metrics.totalReturn, Math.min(...returns), Math.max(...returns))

  return parseFloat((
    pf     * 0.30 +
    nSharpe * 0.25 +
    wr      * 0.20 +
    nReturn * 0.15 +
    Math.min(metrics.winRate / 100, 1) * 0.10
  ).toFixed(6))
}

function normalise(value: number, min: number, max: number): number {
  if (max === min) return 0
  return (value - min) / (max - min)
}

// ── Main optimizer ───────────────────────────��────────────────────────────────

export async function runOptimizer(
  candles: Candle[],
  config: OptimizerConfig,
  onProgress?: (completed: number, total: number) => void
): Promise<ExperimentResult[]> {
  const combinations = expandGrid(config.paramGrid)
  const results: Array<{ params: ParamCombination; metrics: PerformanceMetrics; tradeCount: number; meetsGuardrails: boolean }> = []

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i]!

    const strategyConfig: StrategyConfig = { ...config.baseStrategyConfig, ...combo }
    const riskConfig: RiskConfig         = { ...config.baseRiskConfig,     ...combo }

    const result = await runBacktest(candles, {
      symbol:   config.symbol,
      startDate: config.startDate,
      endDate:   config.endDate,
      initialCapital: config.initialCapital,
      strategyConfig,
      riskConfig,
    })

    const tradeCount      = result.trades.length
    const meetsGuardrails = (
      tradeCount >= config.minTrades &&
      result.metrics.maxDrawdown >= config.maxDrawdownCap
    )

    results.push({ params: combo, metrics: result.metrics, tradeCount, meetsGuardrails })

    if (onProgress) onProgress(i + 1, combinations.length)
  }

  // Compute composite scores using all metrics for normalisation
  const allMetrics = results.map((r) => r.metrics)

  const ranked: ExperimentResult[] = results
    .map((r, idx) => ({
      params:          r.params,
      metrics:         r.metrics,
      tradeCount:      r.tradeCount,
      meetsGuardrails: r.meetsGuardrails,
      compositeScore:  r.meetsGuardrails ? compositeScore(r.metrics, allMetrics) : -1,
      rank:            0,
    }))
    .sort((a, b) => {
      // Sort by: guardrails first, then by chosen metric
      if (a.meetsGuardrails !== b.meetsGuardrails)
        return a.meetsGuardrails ? -1 : 1

      switch (config.rankBy) {
        case 'sharpe':
          return (b.metrics.sharpeRatio ?? -Infinity) - (a.metrics.sharpeRatio ?? -Infinity)
        case 'profitFactor':
          return b.metrics.profitFactor - a.metrics.profitFactor
        case 'totalReturn':
          return b.metrics.totalReturn - a.metrics.totalReturn
        default:
          return b.compositeScore - a.compositeScore
      }
    })
    .map((r, i) => ({ ...r, rank: i + 1 }))

  return ranked
}
