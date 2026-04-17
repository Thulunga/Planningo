/**
 * Paper trading engine for the Railway service.
 * Uses service-role Supabase client (bypasses RLS).
 *
 * Rules:
 * - 20% of available cash per BUY, max 5 concurrent positions
 * - Stop loss = entry − 1.5 × ATR
 * - Target   = entry + 2.5 × ATR
 */

import { db } from './supabase'
import { isEODCloseTime } from './config'
import type { Signal } from './signal-engine'

const ALLOCATION_PERCENT = 0.20
const STOP_MULTIPLIER    = 1.5
const TARGET_MULTIPLIER  = 2.5

export interface TradeResult {
  action: 'OPENED' | 'CLOSED' | 'SKIPPED'
  reason: string
  tradeId?: string
  pnl?: number
}

/**
 * Execute a paper trade for the admin user based on a generated signal.
 */
export async function executePaperTrade(
  userId: string,
  signal: { id: string; symbol: string; signal_type: string; price: number; indicators: { atr?: number } }
): Promise<TradeResult> {
  // Load portfolio
  const { data: portfolio, error: portErr } = await db('paper_portfolio')
    .select('*').eq('user_id', userId).single()

  if (portErr || !portfolio) return { action: 'SKIPPED', reason: 'Portfolio not found' }

  // ── BUY ──────────────────────────────────────────────────────────────────
  if (signal.signal_type === 'BUY') {
    if (isEODCloseTime()) {
      return { action: 'SKIPPED', reason: 'EOD window (2:45 PM+) — no new BUY positions' }
    }

    // Already holding?
    const { data: existing } = await db('paper_trades')
      .select('id').eq('user_id', userId).eq('symbol', signal.symbol).eq('status', 'OPEN').limit(1)
    if (existing && existing.length > 0)
      return { action: 'SKIPPED', reason: `Already holding ${signal.symbol}` }

    // Max 5 positions
    const { count } = await db('paper_trades')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'OPEN')
    if ((count ?? 0) >= 5)
      return { action: 'SKIPPED', reason: 'Max 5 concurrent positions reached' }

    const allocationAmount = portfolio.available_cash * ALLOCATION_PERCENT
    if (allocationAmount < signal.price)
      return { action: 'SKIPPED', reason: 'Insufficient capital for this position' }

    const quantity = Math.floor(allocationAmount / signal.price)
    if (quantity === 0)
      return { action: 'SKIPPED', reason: 'Position size rounds to 0 shares' }

    const atr       = signal.indicators.atr ?? signal.price * 0.005
    const stopLoss  = parseFloat((signal.price - STOP_MULTIPLIER * atr).toFixed(2))
    const target    = parseFloat((signal.price + TARGET_MULTIPLIER * atr).toFixed(2))
    const tradeAmt  = quantity * signal.price

    const { data: trade, error: tradeErr } = await db('paper_trades').insert({
      user_id:     userId,
      signal_id:   signal.id,
      symbol:      signal.symbol,
      trade_type:  'BUY',
      quantity,
      entry_price: signal.price,
      entry_time:  new Date().toISOString(),
      status:      'OPEN',
      stop_loss:   stopLoss,
      target,
    }).select('id').single()

    if (tradeErr || !trade)
      return { action: 'SKIPPED', reason: `DB error: ${tradeErr?.message}` }

    await db('paper_portfolio').update({
      available_cash: portfolio.available_cash - tradeAmt,
      total_trades:   portfolio.total_trades + 1,
      updated_at:     new Date().toISOString(),
    }).eq('user_id', userId)

    return {
      action: 'OPENED',
      reason: `BUY ${quantity} × ${signal.symbol} @ ₹${signal.price} | SL: ₹${stopLoss} | Target: ₹${target}`,
      tradeId: trade.id,
    }
  }

  // ── SELL ─────────────────────────────────────────────────────────────────
  if (signal.signal_type === 'SELL') {
    const { data: openTrade } = await db('paper_trades')
      .select('*').eq('user_id', userId).eq('symbol', signal.symbol)
      .eq('status', 'OPEN').eq('trade_type', 'BUY')
      .order('entry_time', { ascending: false }).limit(1).single()

    if (!openTrade)
      return { action: 'SKIPPED', reason: `No open position for ${signal.symbol} to close` }

    return await closeTrade(userId, openTrade, signal.price, 'CLOSED')
  }

  return { action: 'SKIPPED', reason: 'HOLD signal — no action' }
}

/**
 * Close an open trade and update portfolio P&L.
 */
export async function closeTrade(
  userId: string,
  trade: { id: string; quantity: number; entry_price: number; symbol: string },
  exitPrice: number,
  status: 'CLOSED' | 'STOPPED_OUT'
): Promise<TradeResult> {
  const pnl         = parseFloat(((exitPrice - trade.entry_price) * trade.quantity).toFixed(2))
  const tradeAmount = trade.entry_price * trade.quantity
  const returnedCash = tradeAmount + pnl

  await db('paper_trades').update({
    exit_price: exitPrice,
    exit_time:  new Date().toISOString(),
    pnl,
    status,
  }).eq('id', trade.id).eq('user_id', userId)

  const { data: portfolio } = await db('paper_portfolio')
    .select('*').eq('user_id', userId).single()

  if (portfolio) {
    await db('paper_portfolio').update({
      available_cash: portfolio.available_cash + returnedCash,
      total_pnl:      portfolio.total_pnl + pnl,
      winning_trades: pnl > 0 ? portfolio.winning_trades + 1 : portfolio.winning_trades,
      updated_at:     new Date().toISOString(),
    }).eq('user_id', userId)
  }

  return {
    action: 'CLOSED',
    reason: `${status}: ${trade.symbol} @ ₹${exitPrice} | P&L: ${pnl >= 0 ? '+' : ''}₹${pnl}`,
    tradeId: trade.id,
    pnl,
  }
}

/**
 * Force-close every open position at current market price.
 * Called once at 3:15 PM IST to guarantee all intraday trades are
 * flat before NSE closes at 3:30 PM.
 * Falls back to entry price if the quote API is unavailable.
 */
export async function forceCloseAllPositions(userId: string): Promise<number> {
  const { data: openTrades } = await db('paper_trades')
    .select('*').eq('user_id', userId).eq('status', 'OPEN')

  if (!openTrades || openTrades.length === 0) return 0

  let closed = 0
  for (const trade of openTrades) {
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(trade.symbol)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = (res.ok ? await res.json() : {}) as any
      const marketPrice: number = json?.quoteResponse?.result?.[0]?.regularMarketPrice ?? 0
      const exitPrice = marketPrice > 0 ? marketPrice : trade.entry_price

      await closeTrade(userId, trade, exitPrice, 'CLOSED')
      console.log(
        `[paper-trader] EOD close: ${trade.symbol} @ ₹${exitPrice}` +
        (marketPrice === 0 ? ' (fallback to entry — no quote)' : '')
      )
      closed++
    } catch (err) {
      console.error(`[paper-trader] EOD close error for ${trade.symbol}:`, err)
    }
  }
  return closed
}

/**
 * Check all open positions for stop loss or target hits.
 * Called after each price scan.
 */
export async function checkStopLossAndTargets(userId: string): Promise<void> {
  const { data: openTrades } = await db('paper_trades')
    .select('*').eq('user_id', userId).eq('status', 'OPEN')

  if (!openTrades || openTrades.length === 0) return

  for (const trade of openTrades) {
    // We need current price — skip if no stop/target set
    if (!trade.stop_loss && !trade.target) continue

    // Fetch current price from Yahoo Finance quote API
    try {
      const res = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(trade.symbol)}`,
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
