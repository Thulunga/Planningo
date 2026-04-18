import type { StrategyConfig, RiskConfig, BacktestConfig } from './types'

export const DEFAULT_STRATEGY_CONFIG: StrategyConfig = {
  emaFast: 9,
  emaSlow: 21,
  rsiPeriod: 14,
  rsiOversold: 35,
  rsiNeutralZone: 45,
  rsiBullishZone: 60,
  rsiNeutralHigh: 70,
  rsiOverbought: 70,
  macdFast: 12,
  macdSlow: 26,
  macdSignalPeriod: 9,
  supertrendPeriod: 7,
  supertrendMultiplier: 3,
  bbPeriod: 20,
  bbStdDev: 2,
  vwapHours: 8,
  atrPeriod: 14,
  confluenceThreshold: 4,
  minCandlesRequired: 35,
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  riskPerTradePct: 0.01,           // 1% of equity per trade
  dailyLossLimitPct: 0.03,         // Block new entries if daily loss > 3%
  minRewardRiskRatio: 2.0,
  cooldownMinutesAfterLoss: 30,    // Wait 30 min after a stopped-out trade
  stopMethod: 'ATR',
  atrMultiplierStop: 1.5,          // SL = entry − 1.5×ATR
  atrMultiplierTarget: 3.0,        // Target = entry + 3.0×ATR → 2:1 R:R
  maxConcurrentPositions: 5,
}

export const DEFAULT_BACKTEST_CONFIG: Pick<
  BacktestConfig,
  'initialCapital' | 'slippagePct' | 'brokeragePct' | 'sttPct' | 'stampDutyPct' | 'allowShorts'
> = {
  initialCapital: 100_000,
  slippagePct: 0.0005,    // 0.05% per side (market order mid-spread approximation)
  brokeragePct: 0.0003,   // Zerodha intraday MIS: 0.03% or ₹20 flat — use pct as proxy
  sttPct: 0.00025,        // 0.025% STT on sell-side turnover (NSE equity intraday)
  stampDutyPct: 0.00003,  // 0.003% stamp duty on buy-side (Maharashtra)
  allowShorts: false,     // long-only by default; set true to enable short selling in backtests
}
