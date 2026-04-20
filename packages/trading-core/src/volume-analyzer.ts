/**
 * Volume-Based Entry Confirmation
 *
 * Volume analysis ensures entries happen with sufficient liquidity and
 * institutional participation. Entries on declining volume are often false.
 *
 * Simple rule: Only allow entries when current volume > threshold × MA(volume).
 */

import type { Candle } from './types'

export interface VolumeAnalysis {
  currentVolume: number
  volumeMa: number | null
  volumeRatio: number | null
  isConfirmed: boolean
  reason: string
}

/**
 * Configuration for volume confirmation.
 */
export interface VolumeConfig {
  /**
   * Period for moving average of volume.
   * Default 20 (about 1.5 hours in 5-min bars).
   */
  maPeriod: number

  /**
   * Multiplier for volume confirmation threshold.
   * Entry is confirmed if: currentVolume > volumeMa × this multiplier.
   * Default 1.2 (20% above average).
   */
  multiplier: number
}

export const DEFAULT_VOLUME_CONFIG: VolumeConfig = {
  maPeriod: 20,
  multiplier: 1.2,
}

/**
 * Calculate simple moving average of volume.
 *
 * @param candles   Array of candles
 * @param period    MA period (e.g., 20)
 * @returns         Moving average or null if insufficient data
 */
export function calculateVolumeMA(candles: Candle[], period: number): number | null {
  if (candles.length < period) return null

  const volumes = candles.slice(-period).map((c) => c.volume)
  const sum = volumes.reduce((a, b) => a + b, 0)

  return sum / period
}

/**
 * Analyze volume confirmation for current candle.
 *
 * @param candles   Array of historical candles (latest at end)
 * @param config    Volume configuration
 * @returns         VolumeAnalysis with confirmation status
 */
export function analyzeVolume(
  candles: Candle[],
  config: VolumeConfig = DEFAULT_VOLUME_CONFIG
): VolumeAnalysis {
  if (candles.length === 0) {
    return {
      currentVolume: 0,
      volumeMa: null,
      volumeRatio: null,
      isConfirmed: false,
      reason: 'No candle data',
    }
  }

  const lastCandle = candles[candles.length - 1]!
  const currentVolume = lastCandle.volume
  const volumeMa = calculateVolumeMA(candles, config.maPeriod)

  if (!volumeMa || volumeMa === 0) {
    return {
      currentVolume,
      volumeMa,
      volumeRatio: null,
      isConfirmed: false,
      reason: `Insufficient history (need ${config.maPeriod} candles for MA)`,
    }
  }

  const volumeRatio = currentVolume / volumeMa
  const threshold = config.multiplier
  const isConfirmed = volumeRatio >= threshold

  const reason = isConfirmed
    ? `✅ Volume confirmed: ${volumeRatio.toFixed(2)}x MA (threshold: ${threshold}x)`
    : `❌ Volume too low: ${volumeRatio.toFixed(2)}x MA (need ${threshold}x)`

  return {
    currentVolume,
    volumeMa,
    volumeRatio,
    isConfirmed,
    reason,
  }
}

/**
 * Check if entry is allowed based on volume.
 *
 * @param candles   Historical candles
 * @param config    Volume configuration
 * @returns         true if volume is confirmed
 */
export function isVolumeConfirmed(
  candles: Candle[],
  config: VolumeConfig = DEFAULT_VOLUME_CONFIG
): boolean {
  return analyzeVolume(candles, config).isConfirmed
}
