/**
 * Re-exports from @planningo/trading-core — single source of truth.
 *
 * Previously this file had a 5-indicator engine (3/5 confluence threshold).
 * The unified engine uses 6 indicators with a configurable threshold (default 4/6).
 * UI score denominators updated accordingly (X/6 not X/5).
 */
export type {
  Signal, SignalType, SignalStrength, IndicatorVoteDetail,
} from '@planningo/trading-core'
export { generateSignal, isActionableSignal } from '@planningo/trading-core'
