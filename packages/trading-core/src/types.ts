// ─── Candle ──────────────────────────────────────────────────────────────────

export interface Candle {
  time: number   // Unix timestamp (seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

// ─── Indicators ──────────────────────────────────────────────────────────────

export interface IndicatorValues {
  rsi: number | null
  macd: number | null
  macdSignal: number | null
  macdHistogram: number | null
  ema9: number | null
  ema21: number | null
  bbUpper: number | null
  bbMiddle: number | null
  bbLower: number | null
  supertrend: 'BUY' | 'SELL' | null
  supertrendLine: number | null
  atr: number | null
  vwap: number | null
  close: number
  high: number
  low: number
  volume: number
}

// ─── Signals ─────────────────────────────────────────────────────────────────

export type SignalType     = 'BUY' | 'SELL' | 'HOLD'
export type SignalStrength = 'WEAK' | 'STRONG' | 'VERY_STRONG'
export type IndicatorVote  = 'BUY' | 'SELL' | 'NEUTRAL'

export interface IndicatorVoteDetail {
  name: string
  vote: IndicatorVote
  value: string
  reason: string
  weight?: number  // Weight for weighted scoring system (default 1.0)
}

export interface Signal {
  type: SignalType
  strength: SignalStrength
  confluenceScore: number   // 0–6
  price: number
  indicators: IndicatorValues
  votes: IndicatorVoteDetail[]
  reasons: Record<string, string>
  preTradeFilter: MABoundaryDecision
  trendContext: TrendContext
  candleTime: Date
}

// ─── Multi-Timeframe Trend ──────────────────────────────────────────────────

export type TrendDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL'

export interface TrendContext {
  direction: TrendDirection
  strength: 'STRONG' | 'WEAK'
  htfEma50: number | null
  htfRsi: number | null
  candleTime: number
}

// ─── MA Boundary ─────────────────────────────────────────────────────────────

export type MAType           = 'SMA' | 'EMA' | 'WMA' | 'VWMA' | 'DEMA' | 'TEMA' | 'HMA'
export type MABoundarySignal = 'NO_TRADE' | 'BUY' | 'SELL' | 'WAIT'

export interface MABoundaryConfig {
  ma1Length?: number
  ma2Length?: number
  ma3Length?: number
  maType?: MAType
  noTradeSpreadThreshold?: number
  slopeThreshold?: number
  maxDistanceFromMA2?: number
  pullbackAtrMultiplier?: number
}

export interface MABoundaryDecision {
  signal: MABoundarySignal
  reason?: string
  confidence: number
  ma1: number | null
  ma2: number | null
  ma3: number | null
  slope: number | null
  maSpread: number | null
  distanceFromMA2: number | null
  nearMA2: boolean
}

// ─── Strategy Config ─────────────────────────────────────────────────────────

export interface StrategyConfig {
  emaFast: number              // default 9
  emaSlow: number              // default 21
  rsiPeriod: number            // default 14
  rsiOversold: number          // default 35 - BUY below this
  rsiNeutralZone: number       // default 45 - BUY up to here (oversold territory)
  rsiBullishZone: number       // default 60 - BUY up to here (healthy bullish)
  rsiNeutralHigh: number       // default 70 - NEUTRAL above rsiBullishZone, below this
  rsiOverbought: number        // default 70 - SELL above this
  macdFast: number             // default 12
  macdSlow: number             // default 26
  macdSignalPeriod: number     // default 9
  supertrendPeriod: number     // default 7
  supertrendMultiplier: number // default 3
  bbPeriod: number             // default 20
  bbStdDev: number             // default 2
  vwapHours: number            // default 8 - rolling window for intraday VWAP
  atrPeriod: number            // default 14
  confluenceThreshold: number  // default 4 - minimum votes needed to generate signal
  minCandlesRequired: number   // default 35 - guard against thin history
}

// ─── Risk Config ─────────────────────────────────────────────────────────────

export interface RiskConfig {
  riskPerTradePct: number            // default 0.01  (1%)
  dailyLossLimitPct: number          // default 0.03  (3%)
  minRewardRiskRatio: number         // default 2.0
  cooldownMinutesAfterLoss: number   // default 30
  stopMethod: 'ATR' | 'SWING'       // default 'ATR'
  atrMultiplierStop: number          // default 1.5
  atrMultiplierTarget: number        // default 3.0   → gives R:R = 3/1.5 = 2:1
  maxConcurrentPositions: number     // default 5
  maxTradesPerDay?: number           // default 3 (new: limit trades per day)
}

// ─── Risk Check ──────────────────────────────────────────────────────────────

export interface RiskCheckResult {
  approved: boolean
  reason: string
  quantity: number        // shares to buy/sell
  stopPrice: number
  targetPrice: number
  riskAmount: number      // rupees at risk for this trade
  rewardRiskRatio: number
}

// ─── Simulated Trade (backtesting) ───────────────────────────────────────────

export type TradeStatus = 'OPEN' | 'CLOSED' | 'STOPPED_OUT' | 'TARGET_HIT' | 'EOD_CLOSED'
export type TradeSide   = 'LONG' | 'SHORT'

export interface SimulatedTrade {
  id: string
  symbol: string
  side: TradeSide              // LONG (buy first) or SHORT (sell first)
  entryTime: Date
  entryPrice: number           // after slippage
  exitTime?: Date
  exitPrice?: number           // after slippage
  quantity: number
  remainingQuantity?: number   // qty left after partial exit (for trailing portion)
  stopLoss: number
  target: number
  pnl?: number                 // net after charges
  pnlPct?: number
  rMultiple?: number           // pnl / initial risk (in rupees)
  status: TradeStatus
  exitReason?: string
  mae?: number                 // Maximum Adverse Excursion (max unrealised loss during trade)
  mfe?: number                 // Maximum Favourable Excursion (max unrealised gain during trade)
  durationMinutes?: number
  confluenceScore?: number
  signalStrength?: SignalStrength
  chargesTotal?: number        // total brokerage + STT + stamp duty
  riskAmount?: number          // rupees risked at entry
  partialExitPrice?: number    // price at which 50% was exited (1R level)
  partialExitTime?: Date       // time of partial exit
  trailingStopPrice?: number   // current trailing stop for remaining position
}

// ─── Performance Metrics ─────────────────────────────────────────────────────

export interface PerformanceMetrics {
  totalReturn: number            // %
  totalReturnAbs: number         // Rs
  winRate: number                // % (0-100)
  profitFactor: number           // gross profit / |gross loss|; Infinity if no losses
  maxDrawdown: number            // % (negative, e.g. -18.5)
  maxDrawdownAbs: number         // Rs (negative)
  sharpeRatio: number | null     // annualised; null if < 10 trades
  totalTrades: number
  winningTrades: number
  losingTrades: number
  averageWin: number             // Rs
  averageLoss: number            // Rs (negative)
  averageTrade: number           // Rs
  averageDurationMinutes: number
  bestTrade: number              // Rs
  worstTrade: number             // Rs (negative)
}

// ─── Equity Curve ────────────────────────────────────────────────────────────

export interface EquityPoint {
  time: Date
  equity: number
  drawdown: number     // % from peak (0 or negative)
  drawdownAbs: number  // Rs from peak (0 or negative)
}

// ─── Backtest Config / Result ─────────────────────────────────────────────────

export interface BacktestConfig {
  symbol: string
  startDate: Date
  endDate: Date
  initialCapital: number
  strategyConfig: StrategyConfig
  riskConfig: RiskConfig
  slippagePct: number
  brokeragePct: number
  sttPct: number
  stampDutyPct: number
  allowShorts: boolean
  extConfig?: SignalEngineExtConfig   // optional per-run filter/indicator overrides
}

export interface BacktestResult {
  runId: string
  config: BacktestConfig
  trades: SimulatedTrade[]
  metrics: PerformanceMetrics
  equityCurve: EquityPoint[]
  totalCandles: number
  startedAt: Date
  completedAt: Date
}

// ─── Optimizer ───────────────────────────────────────────────────────────────

export interface ParameterGrid {
  rsiOversold?: number[]          // e.g. [30, 35, 40]
  rsiOverbought?: number[]        // e.g. [60, 65, 70]
  emaFast?: number[]              // e.g. [9, 10]
  emaSlow?: number[]              // e.g. [21, 26]
  atrMultiplierStop?: number[]    // e.g. [1.0, 1.5, 2.0]
  atrMultiplierTarget?: number[]  // e.g. [2.0, 2.5, 3.0]
  confluenceThreshold?: number[]  // e.g. [3, 4, 5]
}

export interface OptimizerConfig {
  symbol: string
  startDate: Date
  endDate: Date
  initialCapital: number
  baseStrategyConfig: StrategyConfig
  baseRiskConfig: RiskConfig
  paramGrid: ParameterGrid
  minTrades: number               // anti-overfit: skip configs with fewer trades
  maxDrawdownCap: number          // e.g. -25 → filter out configs worse than -25% DD
  rankBy: 'composite' | 'sharpe' | 'profitFactor' | 'totalReturn'
}

export interface ExperimentResult {
  params: Partial<StrategyConfig & RiskConfig>
  metrics: PerformanceMetrics
  tradeCount: number
  compositeScore: number
  rank: number
  meetsGuardrails: boolean
}

// ─── Signal Engine Extended Config ───────────────────────────────────────────
// Controls per-indicator enable/disable and sub-module config overrides.
// Passed as 5th arg to generateSignal(); missing flags default to enabled.

export interface SignalEngineExtConfig {
  // ── Per-indicator on/off (weight→0 when disabled, still appears in log) ──
  enableEMA?: boolean
  enableRSI?: boolean
  enableMACD?: boolean
  enableSupertrend?: boolean
  enableBB?: boolean
  enableVWAP?: boolean
  enableStructure?: boolean
  enableVolume?: boolean

  // ── Filter on/off ─────────────────────────────────────────────────────────
  enableMABoundaryFilter?: boolean  // skip 3-MA trend-boundary gating
  enableTrendFilter?: boolean       // skip HTF trend direction gating

  // ── Sub-module config overrides ───────────────────────────────────────────
  maBoundary?: MABoundaryConfig
  volume?: { maPeriod?: number; multiplier?: number }
  structure?: {
    swingPeriod?: number
    pullbackEmaThresholdPct?: number
    strongCandleAtrMultiplier?: number
    vwapThresholdPct?: number
  }
  htfConfig?: {
    htfPeriodSec?: number
    htfEmaTrendPeriod?: number
    htfFastEmaPeriod?: number
    htfRsiBullishThreshold?: number
    htfRsiBearishThreshold?: number
  }
}
