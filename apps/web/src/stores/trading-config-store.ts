/**
 * Bot Configuration Store — persisted to localStorage.
 *
 * Stores every tunable setting for the 6-indicator confluence strategy.
 * Both the Backtest and the live signal scan read from this store so that
 * "what you configure is what actually runs".
 */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Default values (mirrors packages/trading-core/src/config.ts) ─────────────

export interface BotConfig {
  // ── Confluence Engine ──────────────────────────────────────────────────────
  confluenceThreshold: number   // Min weighted score to generate a signal (default 4)
  minCandlesRequired: number    // Guard against thin history (default 35)

  // ── EMA Cross ─────────────────────────────────────────────────────────────
  enableEMA: boolean
  emaFast: number               // Fast EMA period (default 9)
  emaSlow: number               // Slow EMA period (default 21)

  // ── RSI ───────────────────────────────────────────────────────────────────
  enableRSI: boolean
  rsiPeriod: number             // default 14
  rsiOversold: number           // BUY signal below this (default 35)
  rsiNeutralZone: number        // BUY up to here (default 45)
  rsiBullishZone: number        // BUY up to here (default 60)
  rsiNeutralHigh: number        // NEUTRAL above rsiBullishZone (default 70)
  rsiOverbought: number         // SELL above this (default 70)

  // ── MACD ──────────────────────────────────────────────────────────────────
  enableMACD: boolean
  macdFast: number              // default 12
  macdSlow: number              // default 26
  macdSignalPeriod: number      // default 9

  // ── Supertrend ────────────────────────────────────────────────────────────
  enableSupertrend: boolean
  supertrendPeriod: number      // default 7
  supertrendMultiplier: number  // default 3

  // ── Bollinger Bands ───────────────────────────────────────────────────────
  enableBB: boolean
  bbPeriod: number              // default 20
  bbStdDev: number              // default 2

  // ── VWAP ──────────────────────────────────────────────────────────────────
  enableVWAP: boolean
  vwapHours: number             // Rolling window in hours (default 8)

  // ── ATR ───────────────────────────────────────────────────────────────────
  atrPeriod: number             // default 14

  // ── Structure Analysis ────────────────────────────────────────────────────
  enableStructure: boolean
  swingPeriod: number           // Candles to look back for swing high/low (default 10)
  pullbackEmaThresholdPct: number  // % proximity to EMA for pullback (default 0.01)
  strongCandleAtrMultiplier: number // Candle range > ATR × this = strong (default 1.0)
  vwapThresholdPct: number      // Price near VWAP if within this % (default 0.005)

  // ── Volume Confirmation ────────────────────────────────────────────────────
  enableVolume: boolean
  volumeMaPeriod: number        // Volume MA lookback period (default 20)
  volumeMultiplier: number      // Volume must be > MA × this (default 1.1)

  // ── MA Boundary Filter ────────────────────────────────────────────────────
  enableMABoundaryFilter: boolean
  ma1Length: number             // Fast MA (default 9)
  ma2Length: number             // Mid MA — price must be near this (default 21)
  ma3Length: number             // Slow MA (default 50)
  noTradeSpreadThreshold: number // MAs too tight = no trade (default 0.002)
  slopeThreshold: number        // MA slope must exceed this (default 0.05)
  maxDistanceFromMA2: number    // Max price distance from MA2 (default 0.02 = 2%)
  pullbackAtrMultiplier: number // nearMA2 = price within ATR × this (default 0.5)

  // ── Trend Filter (HTF) ────────────────────────────────────────────────────
  enableTrendFilter: boolean
  htfPeriodSec: number          // Higher timeframe in seconds (default 1800 = 30min)
  htfEmaTrendPeriod: number     // Slow EMA on HTF (default 20)
  htfFastEmaPeriod: number      // Fast EMA on HTF (default 9)
  htfRsiBullishThreshold: number // Min RSI for BULLISH (default 52)
  htfRsiBearishThreshold: number // Max RSI for BEARISH (default 48)

  // ── Risk Management ───────────────────────────────────────────────────────
  riskPerTradePct: number       // % equity risked per trade (default 0.01 = 1%)
  dailyLossLimitPct: number     // Block entries if daily loss > this (default 0.03 = 3%)
  minRewardRiskRatio: number    // Min R:R to allow trade (default 2.0)
  cooldownMinutesAfterLoss: number // Wait after stop-out (default 30)
  atrMultiplierStop: number     // Stop = entry ± ATR × this (default 1.5)
  atrMultiplierTarget: number   // Target = entry ± ATR × this (default 3.0)
  maxConcurrentPositions: number // Max open trades at once (default 5)
  maxTradesPerDay: number       // Max new trades per day (default 3)
  allowShorts: boolean          // Enable short (SELL) trades (default false)
}

export const BOT_CONFIG_DEFAULTS: BotConfig = {
  confluenceThreshold:      4,
  minCandlesRequired:       35,

  enableEMA:                true,
  emaFast:                  9,
  emaSlow:                  21,

  enableRSI:                true,
  rsiPeriod:                14,
  rsiOversold:              35,
  rsiNeutralZone:           45,
  rsiBullishZone:           60,
  rsiNeutralHigh:           70,
  rsiOverbought:            70,

  enableMACD:               true,
  macdFast:                 12,
  macdSlow:                 26,
  macdSignalPeriod:         9,

  enableSupertrend:         true,
  supertrendPeriod:         7,
  supertrendMultiplier:     3,

  enableBB:                 true,
  bbPeriod:                 20,
  bbStdDev:                 2,

  enableVWAP:               true,
  vwapHours:                8,

  atrPeriod:                14,

  enableStructure:          true,
  swingPeriod:              10,
  pullbackEmaThresholdPct:  0.01,
  strongCandleAtrMultiplier: 1.0,
  vwapThresholdPct:         0.005,

  enableVolume:             true,
  volumeMaPeriod:           20,
  volumeMultiplier:         1.1,

  enableMABoundaryFilter:   true,
  ma1Length:                9,
  ma2Length:                21,
  ma3Length:                50,
  noTradeSpreadThreshold:   0.002,
  slopeThreshold:           0.05,
  maxDistanceFromMA2:       0.02,
  pullbackAtrMultiplier:    0.5,

  enableTrendFilter:        true,
  htfPeriodSec:             1800,
  htfEmaTrendPeriod:        20,
  htfFastEmaPeriod:         9,
  htfRsiBullishThreshold:   52,
  htfRsiBearishThreshold:   48,

  riskPerTradePct:          0.01,
  dailyLossLimitPct:        0.03,
  minRewardRiskRatio:       2.0,
  cooldownMinutesAfterLoss: 30,
  atrMultiplierStop:        1.5,
  atrMultiplierTarget:      3.0,
  maxConcurrentPositions:   5,
  maxTradesPerDay:          3,
  allowShorts:              false,
}

// ── Store ─────────────────────────────────────────────────────────────────────

interface TradingConfigState {
  config: BotConfig
  isSaving: boolean
  isLoading: boolean
  lastSavedAt: string | null   // ISO string from DB row
  setField: <K extends keyof BotConfig>(key: K, value: BotConfig[K]) => void
  setConfig: (partial: Partial<BotConfig>) => void
  resetToDefaults: () => void
  /** Persist current config to DB. Returns error string or undefined. */
  saveToDb: () => Promise<string | undefined>
  /** Load config from DB, overwriting local store. */
  loadFromDb: () => Promise<void>
}

export const useTradingConfig = create<TradingConfigState>()(
  persist(
    (set, get) => ({
      config: BOT_CONFIG_DEFAULTS,
      isSaving: false,
      isLoading: false,
      lastSavedAt: null,

      setField: (key, value) =>
        set((state) => ({ config: { ...state.config, [key]: value } })),

      setConfig: (partial) =>
        set((state) => ({ config: { ...state.config, ...partial } })),

      resetToDefaults: () => set({ config: BOT_CONFIG_DEFAULTS }),

      saveToDb: async () => {
        set({ isSaving: true })
        try {
          // Dynamic import keeps server action out of initial bundle
          const { saveBotConfigAction } = await import('@/lib/actions/bot-config')
          const result = await saveBotConfigAction(get().config)
          if (result.error) return result.error
          set({ lastSavedAt: new Date().toISOString() })
          return undefined
        } finally {
          set({ isSaving: false })
        }
      },

      loadFromDb: async () => {
        set({ isLoading: true })
        try {
          const { loadBotConfigAction } = await import('@/lib/actions/bot-config')
          const { config } = await loadBotConfigAction()
          set({ config, lastSavedAt: new Date().toISOString() })
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'planningo-bot-config',
      // Only persist the config itself; status flags are transient
      partialize: (state) => ({ config: state.config, lastSavedAt: state.lastSavedAt }),
    }
  )
)
