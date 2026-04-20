/**
 * Risk Manager - position sizing, daily loss limit, and trade cooldown.
 *
 * Design rules (all configurable via RiskConfig):
 *   - Risk per trade = 1% of current equity (default)
 *   - Position size = riskAmount / stopDistance (rupees, rounded down)
 *   - Stop is ATR-based: entry ± atrMultiplierStop × ATR
 *   - Target must achieve minRewardRiskRatio (default 2:1)
 *   - Daily loss limit = 3% of start-of-day equity → block new entries for rest of day
 *   - Cooldown = 30 min after a stopped-out trade → block new entries
 */

import type { RiskCheckResult, RiskConfig, SignalType } from './types'
import { DEFAULT_RISK_CONFIG } from './config'

// ── Stop / Target calculation ─────────────────────────────────────────────────

export interface StopTarget {
  stopPrice: number
  targetPrice: number
  stopDistance: number   // rupees distance from entry to stop
  rewardDistance: number // rupees distance from entry to target
  rewardRiskRatio: number
}

/**
 * Compute stop and target prices from entry price + ATR.
 * Falls back to 0.5% of price if ATR is unavailable.
 */
export function computeStopTarget(
  entryPrice: number,
  atr: number | null,
  signalType: SignalType,
  config: RiskConfig = DEFAULT_RISK_CONFIG
): StopTarget {
  const effectiveATR = atr !== null && atr > 0 ? atr : entryPrice * 0.005

  const stopDistance   = config.atrMultiplierStop   * effectiveATR
  const targetDistance = config.atrMultiplierTarget * effectiveATR
  const rewardRiskRatio = parseFloat((targetDistance / stopDistance).toFixed(2))

  if (signalType === 'BUY') {
    return {
      stopPrice:      parseFloat((entryPrice - stopDistance).toFixed(2)),
      targetPrice:    parseFloat((entryPrice + targetDistance).toFixed(2)),
      stopDistance:   parseFloat(stopDistance.toFixed(2)),
      rewardDistance: parseFloat(targetDistance.toFixed(2)),
      rewardRiskRatio,
    }
  }

  // SELL (short)
  return {
    stopPrice:      parseFloat((entryPrice + stopDistance).toFixed(2)),
    targetPrice:    parseFloat((entryPrice - targetDistance).toFixed(2)),
    stopDistance:   parseFloat(stopDistance.toFixed(2)),
    rewardDistance: parseFloat(targetDistance.toFixed(2)),
    rewardRiskRatio,
  }
}

// ── Position sizing ───────────────────────────────────────────────────────────

/**
 * Calculate position size using 1%-risk model.
 *
 *   riskAmount   = equity × riskPerTradePct
 *   quantity     = floor(riskAmount / stopDistance)
 *
 * Returns quantity 0 if stop distance rounds to zero or capital insufficient.
 */
export function calculatePositionSize(
  equity: number,
  entryPrice: number,
  stopPrice: number,
  config: RiskConfig = DEFAULT_RISK_CONFIG
): { quantity: number; riskAmount: number } {
  const stopDistance = Math.abs(entryPrice - stopPrice)
  if (stopDistance <= 0) return { quantity: 0, riskAmount: 0 }

  const riskAmount = equity * config.riskPerTradePct
  const quantity   = Math.floor(riskAmount / stopDistance)

  return { quantity, riskAmount: parseFloat(riskAmount.toFixed(2)) }
}

// ── Daily loss guard ──────────────────────────────────────────────────────────

export interface DailyLossCheck {
  blocked: boolean
  lossAmount: number   // Rs (negative if losing)
  lossPct: number      // % (negative if losing)
  reason: string
}

/**
 * Returns blocked=true when today's loss has exceeded the daily limit.
 * Call with startOfDayEquity = equity at 9:15 AM IST.
 */
export function checkDailyLoss(
  currentEquity: number,
  startOfDayEquity: number,
  config: RiskConfig = DEFAULT_RISK_CONFIG
): DailyLossCheck {
  const lossAmount = currentEquity - startOfDayEquity
  const lossPct    = startOfDayEquity > 0 ? lossAmount / startOfDayEquity : 0

  if (lossPct <= -config.dailyLossLimitPct) {
    return {
      blocked:    true,
      lossAmount: parseFloat(lossAmount.toFixed(2)),
      lossPct:    parseFloat((lossPct * 100).toFixed(2)),
      reason:     `Daily loss limit reached: ${(lossPct * 100).toFixed(2)}% (limit: ${(config.dailyLossLimitPct * 100).toFixed(0)}%)`,
    }
  }

  return {
    blocked:    false,
    lossAmount: parseFloat(lossAmount.toFixed(2)),
    lossPct:    parseFloat((lossPct * 100).toFixed(2)),
    reason:     'Within daily loss limit',
  }
}

// ── Cooldown guard ────────────────────────────────────────────────────────────

export interface CooldownCheck {
  blocked: boolean
  minutesRemaining: number
  reason: string
}

/**
 * Returns blocked=true when we're still in cooldown after a losing trade.
 * Pass null for lastLossTime if no losing trade has occurred today.
 */
export function checkCooldown(
  lastLossTime: Date | null,
  now: Date = new Date(),
  config: RiskConfig = DEFAULT_RISK_CONFIG
): CooldownCheck {
  if (lastLossTime === null) {
    return { blocked: false, minutesRemaining: 0, reason: 'No recent loss' }
  }

  const elapsedMs       = now.getTime() - lastLossTime.getTime()
  const elapsedMinutes  = elapsedMs / 60_000
  const cooldownMinutes = config.cooldownMinutesAfterLoss

  if (elapsedMinutes < cooldownMinutes) {
    const remaining = Math.ceil(cooldownMinutes - elapsedMinutes)
    return {
      blocked:          true,
      minutesRemaining: remaining,
      reason:           `Cooldown active: ${remaining}m remaining after stop-out`,
    }
  }

  return { blocked: false, minutesRemaining: 0, reason: 'Cooldown expired' }
}

// ── Full entry validation ─────────────────────────────────────────────────────

/**
 * Run all pre-entry risk checks in sequence and return a single result.
 * Call this before every paper/live trade entry.
 */
export function validateEntry(
  entryPrice: number,
  atr: number | null,
  signalType: SignalType,
  equity: number,
  startOfDayEquity: number,
  lastLossTime: Date | null,
  config: RiskConfig = DEFAULT_RISK_CONFIG,
  now: Date = new Date()
): RiskCheckResult {
  // 1. Daily loss limit
  const dailyCheck = checkDailyLoss(equity, startOfDayEquity, config)
  if (dailyCheck.blocked) {
    return {
      approved: false, reason: dailyCheck.reason,
      quantity: 0, stopPrice: 0, targetPrice: 0, riskAmount: 0, rewardRiskRatio: 0,
    }
  }

  // 2. Cooldown
  const cooldown = checkCooldown(lastLossTime, now, config)
  if (cooldown.blocked) {
    return {
      approved: false, reason: cooldown.reason,
      quantity: 0, stopPrice: 0, targetPrice: 0, riskAmount: 0, rewardRiskRatio: 0,
    }
  }

  // 3. Stop / target
  const st = computeStopTarget(entryPrice, atr, signalType, config)

  // 4. R:R guard
  if (st.rewardRiskRatio < config.minRewardRiskRatio) {
    return {
      approved: false,
      reason: `Reward:Risk ${st.rewardRiskRatio.toFixed(2)} below minimum ${config.minRewardRiskRatio}`,
      quantity: 0, stopPrice: st.stopPrice, targetPrice: st.targetPrice,
      riskAmount: 0, rewardRiskRatio: st.rewardRiskRatio,
    }
  }

  // 5. Position size
  const { quantity, riskAmount } = calculatePositionSize(equity, entryPrice, st.stopPrice, config)
  if (quantity === 0) {
    return {
      approved: false,
      reason:   `Position size rounds to 0 shares (equity ₹${equity.toFixed(0)}, stopDist ₹${st.stopDistance.toFixed(2)})`,
      quantity: 0, stopPrice: st.stopPrice, targetPrice: st.targetPrice,
      riskAmount, rewardRiskRatio: st.rewardRiskRatio,
    }
  }

  // 6. Sanity: cost of trade must not exceed equity
  const tradeCost = quantity * entryPrice
  if (tradeCost > equity) {
    const capped = Math.floor(equity / entryPrice)
    if (capped === 0) {
      return {
        approved: false, reason: `Insufficient equity for even 1 share at ₹${entryPrice}`,
        quantity: 0, stopPrice: st.stopPrice, targetPrice: st.targetPrice,
        riskAmount, rewardRiskRatio: st.rewardRiskRatio,
      }
    }
    return {
      approved: true, reason: 'Approved (capped to fit equity)',
      quantity: capped, stopPrice: st.stopPrice, targetPrice: st.targetPrice,
      riskAmount, rewardRiskRatio: st.rewardRiskRatio,
    }
  }

  return {
    approved: true,
    reason:   `Approved: ${quantity} shares, risk ₹${riskAmount.toFixed(0)}, R:R ${st.rewardRiskRatio}`,
    quantity, stopPrice: st.stopPrice, targetPrice: st.targetPrice,
    riskAmount, rewardRiskRatio: st.rewardRiskRatio,
  }
}
