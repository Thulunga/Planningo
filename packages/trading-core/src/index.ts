// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Candle,
  IndicatorValues,
  SignalType, SignalStrength, IndicatorVote, IndicatorVoteDetail, Signal,
  MAType, MABoundarySignal, MABoundaryConfig, MABoundaryDecision,
  StrategyConfig, RiskConfig, RiskCheckResult,
  TradeStatus, SimulatedTrade,
  PerformanceMetrics, EquityPoint,
  BacktestConfig, BacktestResult,
  ParameterGrid, OptimizerConfig, ExperimentResult,
} from './types'

// ─── Config defaults ────────────────────────────────────────────��─────────────
export { DEFAULT_STRATEGY_CONFIG, DEFAULT_RISK_CONFIG, DEFAULT_BACKTEST_CONFIG } from './config'

// ─── Indicators ──────────────────────────────────────────────────────────────
export { calculateIndicators } from './indicators'

// ─── Signal Engine ────────────────────────────────────────────────────────────
export { generateSignal, isActionableSignal } from './signal-engine'

// ─── MA Boundary ─────────────────────────────────────────────────────────────
export { evaluateThreeMABoundary, calcMA } from './ma-boundary'

// ─── Market Hours (IST-correct) ───────────────────────────────────────────────
export {
  getMarketInfo, isMarketOpen,
  getNSETime, isWeekend, isEngineStartTime,
  isScanWindow, isShutdownTime, isEODCloseTime,
  formatISTTime, formatDuration, getSession,
} from './market-hours'
export type { MarketStatus, MarketInfo } from './market-hours'

// ─── Risk Manager ─────────────────────────────────────────────────────────────
export {
  computeStopTarget, calculatePositionSize,
  checkDailyLoss, checkCooldown, validateEntry,
} from './risk-manager'
export type { StopTarget, DailyLossCheck, CooldownCheck } from './risk-manager'

// ─── Trade Simulator ──────────────────────────────────────────────────────��──
export {
  calcCharges, applySlippage,
  openTrade, closeTrade, checkStopTarget, updateMAEMFE,
  resetTradeSeq,
} from './trade-simulator'

// ─── Backtester ─────────────────────────────────────────��─────────────────────
export { runBacktest } from './backtester'

// ─── Analytics Engine ─────────────────────────────────────────────────────────
export { computeMetrics, buildEquityCurve, computeBreakdowns } from './analytics-engine'
export type { TradeBreakdown } from './analytics-engine'

// ─── Optimizer ────────────────────────────────────────────────────────────────
export { runOptimizer, expandGrid } from './optimizer'
