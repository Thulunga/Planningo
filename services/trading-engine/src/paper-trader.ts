/**
 * Paper trading engine - service runtime.
 *
 * Key changes vs. original:
 *   - All portfolio mutations go through atomic Postgres RPCs (open_paper_trade /
 *     close_paper_trade) to prevent balance inconsistency on crash.
 *   - Risk manager (from @planningo/trading-core) validates every entry:
 *     1% risk-per-trade, daily loss limit, cooldown after stop-outs.
 *   - Idempotency: duplicate open/close calls raise a DB exception (caught here).
 *   - Daily risk state persisted to `engine_state` table so Railway restarts
 *     mid-session don't silently reset the daily loss counter/cooldown.
 */

import { db, supabase } from './supabase'
import { config, isEODCloseTime } from './config'
import { normalizeTradingSymbol } from './symbol'
import {
  validateEntry, DEFAULT_RISK_CONFIG,
} from '@planningo/trading-core'
import type { Signal } from './signal-engine'

export interface TradeResult {
  action: 'OPENED' | 'CLOSED' | 'SKIPPED'
  reason: string
  tradeId?: string
  pnl?: number
}

// ── Daily risk state (persisted to engine_state for cross-restart continuity) ─
let startOfDayEquity: number | null = null
let lastLossTime: Date | null       = null

function todayIST(): string {
  const now = new Date()
  // IST = UTC + 5:30
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() * 60_000) + 5.5 * 3_600_000)
  return ist.toISOString().substring(0, 10)  // "YYYY-MM-DD"
}

/** Load today's risk state from DB. Called on engine startup to restore after restarts. */
export async function loadEngineState(userId: string): Promise<void> {
  const today = todayIST()
  const { data } = await db('engine_state')
    .select('start_of_day_equity, last_loss_time')
    .eq('admin_user_id', userId)
    .eq('trading_day', today)
    .single()

  if (data) {
    startOfDayEquity = data.start_of_day_equity as number
    lastLossTime     = data.last_loss_time ? new Date(data.last_loss_time as string) : null
    console.log(
      `[paper-trader] Restored engine state: equity=₹${startOfDayEquity?.toFixed(0)}` +
      (lastLossTime ? ` lastLoss=${lastLossTime.toISOString()}` : '')
    )
  }
}

/** Persist current risk state to DB (upsert). */
async function persistEngineState(userId: string): Promise<void> {
  const today = todayIST()
  await db('engine_state').upsert({
    admin_user_id:        userId,
    trading_day:          today,
    start_of_day_equity:  startOfDayEquity ?? 0,
    last_loss_time:       lastLossTime?.toISOString() ?? null,
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'admin_user_id,trading_day' })
}

export async function resetDailyRiskState(equity: number): Promise<void> {
  startOfDayEquity = equity
  lastLossTime     = null
  await persistEngineState(config.adminUserId)
}

export async function recordLoss(time: Date): Promise<void> {
  lastLossTime = time
  await persistEngineState(config.adminUserId)
}

// ── Trade execution ───────────────────────────────────────────────────────────

export async function executePaperTrade(
  userId: string,
  signal: { id: string; symbol: string; signal_type: string; price: number; indicators: { atr?: number | null } }
): Promise<TradeResult> {
  // Load portfolio
  const { data: portfolio, error: portErr } = await db('paper_portfolio')
    .select('*').eq('user_id', userId).single()

  if (portErr || !portfolio) return { action: 'SKIPPED', reason: 'Portfolio not found' }

  // ── BUY ──────────────────────────────────────────────────────────────────
  if (signal.signal_type === 'BUY') {
    if (isEODCloseTime()) {
      return { action: 'SKIPPED', reason: 'EOD window (2:45 PM+) - no new BUY positions' }
    }

    // Check for existing position (idempotency guard)
    const { data: existing } = await db('paper_trades')
      .select('id').eq('user_id', userId).eq('symbol', signal.symbol).eq('status', 'OPEN').limit(1)
    if (existing && existing.length > 0)
      return { action: 'SKIPPED', reason: `Already holding ${signal.symbol}` }

    // Max concurrent positions
    const { count } = await db('paper_trades')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'OPEN')
    if ((count ?? 0) >= DEFAULT_RISK_CONFIG.maxConcurrentPositions)
      return { action: 'SKIPPED', reason: `Max ${DEFAULT_RISK_CONFIG.maxConcurrentPositions} concurrent positions reached` }

    // Risk validation
    const equity = portfolio.available_cash + await getLockedCapital(userId)
    const dayEquity = startOfDayEquity ?? equity  // fallback if not explicitly reset
    const riskCheck = validateEntry(
      signal.price,
      signal.indicators.atr ?? null,
      'BUY',
      equity,
      dayEquity,
      lastLossTime,
      DEFAULT_RISK_CONFIG
    )

    if (!riskCheck.approved) {
      return { action: 'SKIPPED', reason: `Risk check failed: ${riskCheck.reason}` }
    }

    // Atomic open via RPC
    const { data, error } = await supabase.rpc('open_paper_trade', {
      p_user_id:     userId,
      p_signal_id:   signal.id,
      p_symbol:      signal.symbol,
      p_quantity:    riskCheck.quantity,
      p_entry_price: signal.price,
      p_stop_loss:   riskCheck.stopPrice,
      p_target:      riskCheck.targetPrice,
    })

    if (error || !data) {
      return { action: 'SKIPPED', reason: `RPC error: ${error?.message ?? 'unknown'}` }
    }

    return {
      action:  'OPENED',
      reason:  `BUY ${riskCheck.quantity} × ${signal.symbol} @ ₹${signal.price} | SL: ₹${riskCheck.stopPrice} | Target: ₹${riskCheck.targetPrice} | Risk: ₹${riskCheck.riskAmount.toFixed(0)}`,
      tradeId: data as string,
    }
  }

  // ── SELL ─────────────────────────────────────────────────────────────────
  if (signal.signal_type === 'SELL') {
    const { data: openTrade } = await db('paper_trades')
      .select('*').eq('user_id', userId).eq('symbol', signal.symbol)
      .eq('status', 'OPEN').eq('trade_type', 'BUY')
      .order('entry_time', { ascending: false }).limit(1).single()

    if (!openTrade)
      return { action: 'SKIPPED', reason: `No open position for ${signal.symbol}` }

    return await closeTrade(userId, openTrade, signal.price, 'CLOSED')
  }

  return { action: 'SKIPPED', reason: 'HOLD signal - no action' }
}

// ── Close via atomic RPC ──────────────────────────────────────────────────────

export async function closeTrade(
  userId: string,
  trade: { id: string; quantity: number; entry_price: number; symbol: string },
  exitPrice: number,
  status: 'CLOSED' | 'STOPPED_OUT'
): Promise<TradeResult> {
  const { data: pnl, error } = await supabase.rpc('close_paper_trade', {
    p_user_id:    userId,
    p_trade_id:   trade.id,
    p_exit_price: exitPrice,
    p_status:     status,
  })

  if (error) {
    return { action: 'SKIPPED', reason: `RPC close error: ${error.message}` }
  }

  const netPnl = pnl as number

  if (status === 'STOPPED_OUT' && netPnl < 0) {
    await recordLoss(new Date())
  }

  return {
    action:  'CLOSED',
    reason:  `${status}: ${trade.symbol} @ ₹${exitPrice} | P&L: ${netPnl >= 0 ? '+' : ''}₹${netPnl}`,
    tradeId: trade.id,
    pnl:     netPnl,
  }
}

// ── Force-close all positions (EOD) ──────────────────────────────────────────

export async function forceCloseAllPositions(userId: string): Promise<number> {
  const { data: openTrades } = await db('paper_trades')
    .select('*').eq('user_id', userId).eq('status', 'OPEN')

  if (!openTrades || openTrades.length === 0) return 0

  let closed = 0
  for (const trade of openTrades) {
    try {
      const quoteSymbol = normalizeTradingSymbol(trade.symbol)
      const res = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(quoteSymbol)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (res.ok ? await res.json() : {}) as any
      const marketPrice: number = json?.quoteResponse?.result?.[0]?.regularMarketPrice ?? 0
      const exitPrice = marketPrice > 0 ? marketPrice : trade.entry_price

      await closeTrade(userId, trade, exitPrice, 'CLOSED')
      console.log(
        `[paper-trader] EOD close: ${trade.symbol} @ ₹${exitPrice}` +
        (marketPrice === 0 ? ' (fallback to entry - no quote)' : '')
      )
      closed++
    } catch (err) {
      console.error(`[paper-trader] EOD close error for ${trade.symbol}:`, err)
    }
  }
  return closed
}

// ── Stop-loss / target check ──────────────────────────────────────────────────

export async function checkStopLossAndTargets(userId: string): Promise<void> {
  const { data: openTrades } = await db('paper_trades')
    .select('*').eq('user_id', userId).eq('status', 'OPEN')

  if (!openTrades || openTrades.length === 0) return

  for (const trade of openTrades) {
    if (!trade.stop_loss && !trade.target) continue

    try {
      const quoteSymbol = normalizeTradingSymbol(trade.symbol)
      const res = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(quoteSymbol)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (res.ok ? await res.json() : {}) as any
      const currentPrice: number = json?.quoteResponse?.result?.[0]?.regularMarketPrice ?? 0
      if (currentPrice === 0) continue

      if (trade.stop_loss && currentPrice <= trade.stop_loss) {
        console.log(`[paper-trader] Stop loss hit for ${trade.symbol} @ ₹${currentPrice}`)
        await closeTrade(userId, trade, currentPrice, 'STOPPED_OUT')
      } else if (trade.target && currentPrice >= trade.target) {
        console.log(`[paper-trader] Target hit for ${trade.symbol} @ ₹${currentPrice}`)
        await closeTrade(userId, trade, currentPrice, 'CLOSED')
      }
    } catch (err) {
      console.error(`[paper-trader] Stop/target check error for ${trade.symbol}:`, err)
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Sum of capital locked in open positions (entry_price × quantity). */
async function getLockedCapital(userId: string): Promise<number> {
  const { data } = await db('paper_trades')
    .select('entry_price, quantity').eq('user_id', userId).eq('status', 'OPEN')
  if (!data) return 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.reduce((s: number, t: any) => s + t.entry_price * t.quantity, 0)
}
