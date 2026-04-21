/**
 * bot-config-utils.ts — pure conversion helpers.
 * Used server-side (route.ts, backtest action) and client-side.
 * No Zustand dependency — safe to import anywhere.
 */
import type { StrategyConfig, RiskConfig, SignalEngineExtConfig } from '@planningo/trading-core'
import type { BotConfig } from '@/stores/trading-config-store'

export function buildStrategyConfig(c: BotConfig): StrategyConfig {
  return {
    emaFast:            c.emaFast,
    emaSlow:            c.emaSlow,
    rsiPeriod:          c.rsiPeriod,
    rsiOversold:        c.rsiOversold,
    rsiNeutralZone:     c.rsiNeutralZone,
    rsiBullishZone:     c.rsiBullishZone,
    rsiNeutralHigh:     c.rsiNeutralHigh,
    rsiOverbought:      c.rsiOverbought,
    macdFast:           c.macdFast,
    macdSlow:           c.macdSlow,
    macdSignalPeriod:   c.macdSignalPeriod,
    supertrendPeriod:   c.supertrendPeriod,
    supertrendMultiplier: c.supertrendMultiplier,
    bbPeriod:           c.bbPeriod,
    bbStdDev:           c.bbStdDev,
    vwapHours:          c.vwapHours,
    atrPeriod:          c.atrPeriod,
    confluenceThreshold: c.confluenceThreshold,
    minCandlesRequired: c.minCandlesRequired,
  }
}

export function buildRiskConfig(c: BotConfig): RiskConfig {
  return {
    riskPerTradePct:          c.riskPerTradePct,
    dailyLossLimitPct:        c.dailyLossLimitPct,
    minRewardRiskRatio:       c.minRewardRiskRatio,
    cooldownMinutesAfterLoss: c.cooldownMinutesAfterLoss,
    stopMethod:               'ATR',
    atrMultiplierStop:        c.atrMultiplierStop,
    atrMultiplierTarget:      c.atrMultiplierTarget,
    maxConcurrentPositions:   c.maxConcurrentPositions,
    maxTradesPerDay:          c.maxTradesPerDay,
  }
}

export function buildExtConfig(c: BotConfig): SignalEngineExtConfig {
  return {
    enableEMA:              c.enableEMA,
    enableRSI:              c.enableRSI,
    enableMACD:             c.enableMACD,
    enableSupertrend:       c.enableSupertrend,
    enableBB:               c.enableBB,
    enableVWAP:             c.enableVWAP,
    enableStructure:        c.enableStructure,
    enableVolume:           c.enableVolume,
    enableMABoundaryFilter: c.enableMABoundaryFilter,
    enableTrendFilter:      c.enableTrendFilter,
    maBoundary: {
      ma1Length:               c.ma1Length,
      ma2Length:               c.ma2Length,
      ma3Length:               c.ma3Length,
      noTradeSpreadThreshold:  c.noTradeSpreadThreshold,
      slopeThreshold:          c.slopeThreshold,
      maxDistanceFromMA2:      c.maxDistanceFromMA2,
      pullbackAtrMultiplier:   c.pullbackAtrMultiplier,
    },
    volume: {
      maPeriod:   c.volumeMaPeriod,
      multiplier: c.volumeMultiplier,
    },
    structure: {
      swingPeriod:              c.swingPeriod,
      pullbackEmaThresholdPct:  c.pullbackEmaThresholdPct,
      strongCandleAtrMultiplier: c.strongCandleAtrMultiplier,
      vwapThresholdPct:         c.vwapThresholdPct,
    },
    htfConfig: {
      htfPeriodSec:            c.htfPeriodSec,
      htfEmaTrendPeriod:       c.htfEmaTrendPeriod,
      htfFastEmaPeriod:        c.htfFastEmaPeriod,
      htfRsiBullishThreshold:  c.htfRsiBullishThreshold,
      htfRsiBearishThreshold:  c.htfRsiBearishThreshold,
    },
  }
}

/** Build all three configs in one call (convenience) */
export function buildAllConfigs(c: BotConfig) {
  return {
    strategyConfig: buildStrategyConfig(c),
    riskConfig:     buildRiskConfig(c),
    extConfig:      buildExtConfig(c),
  }
}
