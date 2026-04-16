/**
 * Paper trading engine.
 * Simulates trade execution using real market prices.
 *
 * Rules:
 * - Allocate 20% of available cash per BUY trade (max 5 concurrent positions)
 * - Stop loss = entry price - (1.5 × ATR)
 * - Target = entry price + (2.5 × ATR)  [reward:risk ~1.67:1]
 * - Auto-close position on SELL signal or stop loss hit
 */

import { createClient } from '@/lib/supabase/server'
import type { Signal } from './signal-engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: any, table: string) {
  return supabase.from(table)
}

const ALLOCATION_PERCENT = 0.20  // 20% of available cash per trade
const STOP_MULTIPLIER = 1.5
const TARGET_MULTIPLIER = 2.5

export interface PaperTradeResult {
  action: 'OPENED' | 'CLOSED' | 'SKIPPED'
  reason: string
  tradeId?: string
  pnl?: number
}

/**
 * Attempt to auto-execute a paper trade based on a signal.
 * Called after a signal is persisted to the database.
 */
export async function executePaperTrade(
  userId: string,
  signal: {
    id: string
    symbol: string
    signal_type: string
    price: number
    indicators: { atr?: number }
  }
): Promise<PaperTradeResult> {
  const supabase = await createClient()

  // Load portfolio
  const { data: portfolio, error: portErr } = await db(supabase, 'paper_portfolio')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (portErr || !portfolio) {
    return { action: 'SKIPPED', reason: 'Portfolio not found' }
  }

  // ── BUY Signal ────────────────────────────────────────────────────────────
  if (signal.signal_type === 'BUY') {
    // Check if already holding this symbol
    const { data: existing } = await db(supabase, 'paper_trades')
      .select('id')
      .eq('user_id', userId)
      .eq('symbol', signal.symbol)
      .eq('status', 'OPEN')
      .limit(1)

    if (existing && existing.length > 0) {
      return { action: 'SKIPPED', reason: `Already holding ${signal.symbol}` }
    }

    // Check open positions count (max 5)
    const { count } = await db(supabase, 'paper_trades')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'OPEN')

    if ((count ?? 0) >= 5) {
      return { action: 'SKIPPED', reason: 'Max 5 concurrent positions reached' }
    }

    // Calculate position size
    const allocationAmount = portfolio.available_cash * ALLOCATION_PERCENT
    if (allocationAmount < signal.price) {
      return { action: 'SKIPPED', reason: 'Insufficient capital for this position' }
    }

    const quantity = Math.floor(allocationAmount / signal.price)
    if (quantity === 0) {
      return { action: 'SKIPPED', reason: 'Position size rounds to 0 shares' }
    }

    const atr = signal.indicators.atr ?? signal.price * 0.005 // fallback: 0.5% of price
    const stopLoss = parseFloat((signal.price - STOP_MULTIPLIER * atr).toFixed(2))
    const target = parseFloat((signal.price + TARGET_MULTIPLIER * atr).toFixed(2))
    const tradeAmount = quantity * signal.price

    // Open trade
    const { data: trade, error: tradeErr } = await db(supabase, 'paper_trades')
      .insert({
        user_id: userId,
        signal_id: signal.id,
        symbol: signal.symbol,
        trade_type: 'BUY',
        quantity,
        entry_price: signal.price,
        entry_time: new Date().toISOString(),
        status: 'OPEN',
        stop_loss: stopLoss,
        target,
      })
      .select('id')
      .single()

    if (tradeErr || !trade) {
      return { action: 'SKIPPED', reason: `DB error opening trade: ${tradeErr?.message}` }
    }

    // Deduct from available cash
    await db(supabase, 'paper_portfolio')
      .update({
        available_cash: portfolio.available_cash - tradeAmount,
        total_trades: portfolio.total_trades + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    return {
      action: 'OPENED',
      reason: `BUY ${quantity} × ${signal.symbol} @ ₹${signal.price} | SL: ₹${stopLoss} | Target: ₹${target}`,
      tradeId: trade.id,
    }
  }

  // ── SELL Signal ───────────────────────────────────────────────────────────
  if (signal.signal_type === 'SELL') {
    // Find open BUY position for this symbol
    const { data: openTrade } = await db(supabase, 'paper_trades')
      .select('*')
      .eq('user_id', userId)
      .eq('symbol', signal.symbol)
      .eq('status', 'OPEN')
      .eq('trade_type', 'BUY')
      .order('entry_time', { ascending: false })
      .limit(1)
      .single()

    if (!openTrade) {
      return { action: 'SKIPPED', reason: `No open position for ${signal.symbol} to close` }
    }

    return await closeTrade(userId, openTrade, signal.price, 'CLOSED')
  }

  return { action: 'SKIPPED', reason: 'HOLD signal — no action needed' }
}

/**
 * Close an open paper trade and update portfolio P&L.
 */
export async function closeTrade(
  userId: string,
  trade: {
    id: string
    quantity: number
    entry_price: number
    symbol: string
  },
  exitPrice: number,
  status: 'CLOSED' | 'STOPPED_OUT'
): Promise<PaperTradeResult> {
  const supabase = await createClient()

  const pnl = parseFloat(
    ((exitPrice - trade.entry_price) * trade.quantity).toFixed(2)
  )
  const tradeAmount = trade.entry_price * trade.quantity
  const returnedCash = tradeAmount + pnl

  // Close trade
  await db(supabase, 'paper_trades')
    .update({
      exit_price: exitPrice,
      exit_time: new Date().toISOString(),
      pnl,
      status,
    })
    .eq('id', trade.id)
    .eq('user_id', userId)

  // Update portfolio
  const { data: portfolio } = await db(supabase, 'paper_portfolio')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (portfolio) {
    await db(supabase, 'paper_portfolio')
      .update({
        available_cash: portfolio.available_cash + returnedCash,
        total_pnl: portfolio.total_pnl + pnl,
        winning_trades: pnl > 0 ? portfolio.winning_trades + 1 : portfolio.winning_trades,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
  }

  return {
    action: 'CLOSED',
    reason: `${status}: ${trade.symbol} @ ₹${exitPrice} | P&L: ${pnl >= 0 ? '+' : ''}₹${pnl}`,
    tradeId: trade.id,
    pnl,
  }
}

/**
 * Initialize the portfolio for a new admin user (₹1,00,000 virtual capital).
 * Safe to call multiple times — uses upsert.
 */
export async function initializePortfolio(userId: string): Promise<void> {
  const supabase = await createClient()
  await db(supabase, 'paper_portfolio')
    .upsert(
      {
        user_id: userId,
        virtual_capital: 100000,
        available_cash: 100000,
        total_pnl: 0,
        total_trades: 0,
        winning_trades: 0,
      },
      { onConflict: 'user_id', ignoreDuplicates: true }
    )
}
