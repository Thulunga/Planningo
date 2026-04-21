/**
 * Paper trading engine - web app runtime.
 *
 * Trade open/close operations now go through atomic Postgres RPCs
 * (open_paper_trade / close_paper_trade) to prevent portfolio balance
 * inconsistency if the server action crashes between the two writes.
 */

import { createClient } from '@/lib/supabase/server'
import { DEFAULT_RISK_CONFIG, validateEntry } from '@planningo/trading-core'
import { isEODCloseTime } from '@/lib/trading/market-hours'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: any, table: string) {
  return supabase.from(table)
}

export interface PaperTradeResult {
  action: 'OPENED' | 'CLOSED' | 'SKIPPED'
  reason: string
  tradeId?: string
  pnl?: number
}

export async function executePaperTrade(
  userId: string,
  signal: {
    id: string
    symbol: string
    signal_type: string
    price: number
    indicators: { atr?: number | null }
  }
): Promise<PaperTradeResult> {
  const supabase = await createClient()

  const { data: portfolio, error: portErr } = await db(supabase, 'paper_portfolio')
    .select('*').eq('user_id', userId).single()

  if (portErr || !portfolio) return { action: 'SKIPPED', reason: 'Portfolio not found' }

  // ── BUY ──────────────────────────────────────────────────────────────────
  if (signal.signal_type === 'BUY') {
    if (isEODCloseTime()) {
      return { action: 'SKIPPED', reason: 'EOD window (2:45 PM+) - no new BUY positions' }
    }

    const { data: existing } = await db(supabase, 'paper_trades')
      .select('id').eq('user_id', userId).eq('symbol', signal.symbol).eq('status', 'OPEN').limit(1)
    if (existing && existing.length > 0)
      return { action: 'SKIPPED', reason: `Already holding ${signal.symbol}` }

    const { count } = await db(supabase, 'paper_trades')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'OPEN')
    if ((count ?? 0) >= DEFAULT_RISK_CONFIG.maxConcurrentPositions)
      return { action: 'SKIPPED', reason: `Max ${DEFAULT_RISK_CONFIG.maxConcurrentPositions} concurrent positions reached` }

    const riskCheck = validateEntry(
      signal.price,
      signal.indicators.atr ?? null,
      'BUY',
      portfolio.available_cash,
      portfolio.available_cash,   // web app doesn't track intraday loss separately
      null,
      DEFAULT_RISK_CONFIG
    )

    if (!riskCheck.approved)
      return { action: 'SKIPPED', reason: `Risk check failed: ${riskCheck.reason}` }

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

    if (error || !data)
      return { action: 'SKIPPED', reason: `RPC error: ${error?.message ?? 'unknown'}` }

    return {
      action:  'OPENED',
      reason:  `BUY ${riskCheck.quantity} × ${signal.symbol} @ ₹${signal.price} | SL: ₹${riskCheck.stopPrice} | Target: ₹${riskCheck.targetPrice}`,
      tradeId: data as string,
    }
  }

  // ── SELL ─────────────────────────────────────────────────────────────────
  if (signal.signal_type === 'SELL') {
    const { data: openTrade } = await db(supabase, 'paper_trades')
      .select('*').eq('user_id', userId).eq('symbol', signal.symbol)
      .eq('status', 'OPEN').eq('trade_type', 'BUY')
      .order('entry_time', { ascending: false }).limit(1).single()

    if (!openTrade)
      return { action: 'SKIPPED', reason: `No open position for ${signal.symbol}` }

    return await closeTrade(userId, openTrade, signal.price, 'CLOSED')
  }

  return { action: 'SKIPPED', reason: 'HOLD signal - no action needed' }
}

export async function closeTrade(
  userId: string,
  trade: { id: string; quantity: number; entry_price: number; symbol: string },
  exitPrice: number,
  status: 'CLOSED' | 'STOPPED_OUT'
): Promise<PaperTradeResult> {
  const supabase = await createClient()

  const { data: pnl, error } = await supabase.rpc('close_paper_trade', {
    p_user_id:    userId,
    p_trade_id:   trade.id,
    p_exit_price: exitPrice,
    p_status:     status,
  })

  if (error) return { action: 'SKIPPED', reason: `RPC close error: ${error.message}` }

  const netPnl = pnl as number
  return {
    action:  'CLOSED',
    reason:  `${status}: ${trade.symbol} @ ₹${exitPrice} | P&L: ${netPnl >= 0 ? '+' : ''}₹${netPnl}`,
    tradeId: trade.id,
    pnl:     netPnl,
  }
}

export async function initializePortfolio(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase.rpc('reset_paper_portfolio', {
    p_user_id:         userId,
    p_initial_capital: 100_000,
  })
}
