// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Candle,
  IndicatorValues,
  SignalType, SignalStrength, IndicatorVote, IndicatorVoteDetail, Signal,
  TrendDirection, TrendContext,
  MAType, MABoundarySignal, MABoundaryConfig, MABoundaryDecision,
  StrategyConfig, RiskConfig, RiskCheckResult,
  TradeStatus, TradeSide, SimulatedTrade,
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

// ─── Multi-Timeframe Trend Analysis ──────────────────────────────────────────
export {
  getTrendContext, aggregateToHTF, analyzeTrend,
  DEFAULT_HTF_CONFIG,
} from './multi-timeframe-analyzer'
export type { HTFConfig } from './multi-timeframe-analyzer'

// ─── Structure-Based Price Action ───────────────────────────────────────────
export {
  analyzeBullishStructure, analyzeBearishStructure,
  getSwingHigh, getSwingLow, isPullbackToEMA, isStrongCandle,
  DEFAULT_STRUCTURE_CONFIG,
} from './structure-analyzer'
export type { StructureSignal, StructureConfig } from './structure-analyzer'

// ─── Volume Analysis ────────────────────────────────────────────────────────
export {
  analyzeVolume, isVolumeConfirmed,
  calculateVolumeMA,
  DEFAULT_VOLUME_CONFIG,
} from './volume-analyzer'
export type { VolumeAnalysis, VolumeConfig } from './volume-analyzer'

// ─── Time Filters ────────────────────────────────────────────────────────────
export {
  isTradeAllowedByTime, getTimeFilterReason,
  DEFAULT_TIME_FILTER_CONFIG,
} from './time-filter'
export type { TimeRange, TimeFilterConfig } from './time-filter'

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
  openTrade, openShortTrade, closeTrade, checkStopTarget, updateMAEMFE,  checkPartialBooking1R, executePartialBooking, updateTrailingStop, checkTrailingStopHit,  resetTradeSeq,
} from './trade-simulator'

// ─── Backtester ─────────────────────────────────────────��─────────────────────
export { runBacktest } from './backtester'

// ─── Analytics Engine ─────────────────────────────────────────────────────────
export { computeMetrics, buildEquityCurve, computeBreakdowns } from './analytics-engine'
export type { TradeBreakdown } from './analytics-engine'

// ─── Optimizer ────────────────────────────────────────────────────────────────
export { runOptimizer, expandGrid } from './optimizer'
