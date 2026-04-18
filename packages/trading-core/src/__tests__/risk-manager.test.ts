import { describe, it, expect } from 'vitest'
import {
  computeStopTarget, calculatePositionSize,
  checkDailyLoss, checkCooldown, validateEntry,
} from '../risk-manager'
import { DEFAULT_RISK_CONFIG } from '../config'

describe('computeStopTarget', () => {
  const config = { ...DEFAULT_RISK_CONFIG, atrMultiplierStop: 1.5, atrMultiplierTarget: 3.0 }

  it('computes BUY stop below entry', () => {
    const st = computeStopTarget(100, 2, 'BUY', config)
    expect(st.stopPrice).toBe(97)     // 100 - 1.5×2
    expect(st.targetPrice).toBe(106)  // 100 + 3.0×2
    expect(st.rewardRiskRatio).toBe(2)
  })

  it('falls back to 0.5% ATR if atr is null', () => {
    const st = computeStopTarget(1000, null, 'BUY', config)
    const fallbackATR = 1000 * 0.005  // 5
    expect(st.stopDistance).toBe(parseFloat((1.5 * fallbackATR).toFixed(2)))
  })

  it('computes SELL stop above entry', () => {
    const st = computeStopTarget(100, 2, 'SELL', config)
    expect(st.stopPrice).toBe(103)   // 100 + 1.5×2
    expect(st.targetPrice).toBe(94) // 100 - 3.0×2
  })
})

describe('calculatePositionSize', () => {
  it('risks 1% of equity', () => {
    const { quantity, riskAmount } = calculatePositionSize(100_000, 100, 97, DEFAULT_RISK_CONFIG)
    // risk = 100_000 × 0.01 = 1000, stop dist = 3
    // qty = floor(1000/3) = 333
    expect(riskAmount).toBe(1000)
    expect(quantity).toBe(333)
  })

  it('returns 0 if stop distance is 0', () => {
    const { quantity } = calculatePositionSize(100_000, 100, 100, DEFAULT_RISK_CONFIG)
    expect(quantity).toBe(0)
  })
})

describe('checkDailyLoss', () => {
  it('blocks when loss exceeds daily limit', () => {
    const result = checkDailyLoss(94_000, 100_000, DEFAULT_RISK_CONFIG)
    expect(result.blocked).toBe(true)  // -6% > 3% limit
  })

  it('allows when within daily limit', () => {
    const result = checkDailyLoss(98_000, 100_000, DEFAULT_RISK_CONFIG)
    expect(result.blocked).toBe(false)  // -2% < 3% limit
  })

  it('allows when even (no loss)', () => {
    const result = checkDailyLoss(100_000, 100_000, DEFAULT_RISK_CONFIG)
    expect(result.blocked).toBe(false)
  })
})

describe('checkCooldown', () => {
  it('blocks within cooldown window', () => {
    const now       = new Date('2024-01-15T10:30:00Z')
    const lossTime  = new Date('2024-01-15T10:10:00Z')  // 20 min ago
    const result    = checkCooldown(lossTime, now, DEFAULT_RISK_CONFIG)  // 30 min cooldown
    expect(result.blocked).toBe(true)
    expect(result.minutesRemaining).toBe(10)
  })

  it('allows after cooldown expires', () => {
    const now       = new Date('2024-01-15T11:00:00Z')
    const lossTime  = new Date('2024-01-15T10:15:00Z')  // 45 min ago
    const result    = checkCooldown(lossTime, now, DEFAULT_RISK_CONFIG)
    expect(result.blocked).toBe(false)
  })

  it('allows with no prior loss', () => {
    const result = checkCooldown(null, new Date(), DEFAULT_RISK_CONFIG)
    expect(result.blocked).toBe(false)
  })
})

describe('validateEntry', () => {
  it('approves valid entry', () => {
    const result = validateEntry(
      100, 2, 'BUY',
      100_000, 100_000, null,
      DEFAULT_RISK_CONFIG
    )
    expect(result.approved).toBe(true)
    expect(result.quantity).toBeGreaterThan(0)
    expect(result.rewardRiskRatio).toBeGreaterThanOrEqual(2)
  })

  it('rejects when daily loss limit reached', () => {
    const result = validateEntry(
      100, 2, 'BUY',
      94_000, 100_000, null,  // -6% loss
      DEFAULT_RISK_CONFIG
    )
    expect(result.approved).toBe(false)
    expect(result.reason).toMatch(/daily loss/i)
  })

  it('rejects during cooldown', () => {
    const now      = new Date('2024-01-15T10:30:00Z')
    const lossTime = new Date('2024-01-15T10:10:00Z')
    const result   = validateEntry(
      100, 2, 'BUY',
      100_000, 100_000, lossTime,
      DEFAULT_RISK_CONFIG, now
    )
    expect(result.approved).toBe(false)
    expect(result.reason).toMatch(/cooldown/i)
  })
})
