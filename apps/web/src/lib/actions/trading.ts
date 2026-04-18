'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { initializePortfolio } from '@/lib/trading/paper-trader'
import { searchStocks } from '@/lib/trading/market-data'
import { computeMetrics, buildEquityCurve, computeBreakdowns } from '@planningo/trading-core'
import type { SimulatedTrade, TradeSide } from '@planningo/trading-core'

function isAdmin(email: string | undefined): boolean {
  return !!(email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: any, table: string) {
  return supabase.from(table)
}

// ── Watchlist ──────────────────────────────────────────────────────────────

export async function getWatchlist() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const { data, error } = await db(supabase, 'trading_watchlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  return { data: data ?? [], error: error?.message }
}

export async function addToWatchlist(symbol: string, displayName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized' }

  const { error } = await db(supabase, 'trading_watchlist').insert({
    user_id: user.id,
    symbol: symbol.toUpperCase(),
    display_name: displayName,
    is_active: true,
  })

  if (error) return { error: error.message }
  revalidatePath('/trading')
  return { success: true }
}

export async function removeFromWatchlist(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized' }

  const { error } = await db(supabase, 'trading_watchlist')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/trading')
  return { success: true }
}

export async function toggleWatchlistItem(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized' }

  const { error } = await db(supabase, 'trading_watchlist')
    .update({ is_active: isActive })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/trading')
  return { success: true }
}

// ── Portfolio ──────────────────────────────────────────────────────────────

export async function getPortfolio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  // Ensure portfolio row exists
  await initializePortfolio(user.id)

  const { data, error } = await db(supabase, 'paper_portfolio')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return { data, error: error?.message }
}

export async function resetPortfolio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized' }

  // Close all open trades
  await db(supabase, 'paper_trades')
    .update({ status: 'CLOSED', exit_time: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('status', 'OPEN')

  // Reset portfolio
  await db(supabase, 'paper_portfolio')
    .update({
      virtual_capital: 100000,
      available_cash: 100000,
      total_pnl: 0,
      total_trades: 0,
      winning_trades: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  revalidatePath('/trading')
  return { success: true }
}

// ── Signals ───────────────────────────────────────────────────────────────

export async function getRecentSignals(limit = 50) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const { data, error } = await db(supabase, 'trading_signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error: error?.message }
}

// ── Trades ────────────────────────────────────────────────────────────────

export async function getOpenPositions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const { data, error } = await db(supabase, 'paper_trades')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'OPEN')
    .order('entry_time', { ascending: false })

  return { data: data ?? [], error: error?.message }
}

export async function getTradeHistory(limit = 30) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const { data, error } = await db(supabase, 'paper_trades')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'OPEN')
    .order('exit_time', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error: error?.message }
}

// ── Scan logs ─────────────────────────────────────────────────────────────

export async function getRecentScanLogs(limit = 60) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const { data, error } = await db(supabase, 'scan_logs')
    .select('*')
    .eq('user_id', user.id)
    .order('scanned_at', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error: error?.message }
}

// ── Analytics ─────────────────────────────────────────────────────────────

export async function getTradeAnalytics() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  // Fetch all closed paper trades with enough fields to compute analytics
  const { data: rows, error } = await db(supabase, 'paper_trades')
    .select('id, symbol, trade_type, quantity, entry_price, exit_price, pnl, status, entry_time, exit_time, stop_loss, target')
    .eq('user_id', user.id)
    .neq('status', 'OPEN')
    .order('exit_time', { ascending: true })

  if (error) return { error: error.message, data: null }

  const portfolio = await db(supabase, 'paper_portfolio')
    .select('virtual_capital')
    .eq('user_id', user.id)
    .single()

  const initialCapital: number = portfolio.data?.virtual_capital ?? 100_000

  // Map DB rows to SimulatedTrade shape expected by analytics engine
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trades: SimulatedTrade[] = (rows ?? []).map((r: any) => ({
    id:            r.id,
    symbol:        r.symbol,
    side:          'LONG' as TradeSide,  // paper trades are long-only
    entryTime:     new Date(r.entry_time),
    entryPrice:    r.entry_price,
    exitTime:      r.exit_time ? new Date(r.exit_time) : undefined,
    exitPrice:     r.exit_price ?? undefined,
    quantity:      r.quantity,
    stopLoss:      r.stop_loss ?? 0,
    target:        r.target ?? 0,
    pnl:           r.pnl ?? 0,
    status:        r.status === 'STOPPED_OUT' ? 'STOPPED_OUT'
                 : r.status === 'TARGET_HIT'  ? 'TARGET_HIT'
                 : r.status === 'EOD_CLOSED'  ? 'EOD_CLOSED'
                 : 'CLOSED',
    exitReason:    r.status,
    durationMinutes: r.entry_time && r.exit_time
      ? Math.round((new Date(r.exit_time).getTime() - new Date(r.entry_time).getTime()) / 60_000)
      : 0,
  }))

  if (trades.length === 0) {
    return { data: { metrics: null, equityCurve: [], breakdowns: null, sessionBreakdown: {}, tradeCount: 0 } }
  }

  const metrics     = computeMetrics(trades, initialCapital)
  const equityCurve = buildEquityCurve(trades, initialCapital)
  const breakdowns  = computeBreakdowns(trades)

  // Derive IST session from entry_time (not available on SimulatedTrade, computed here)
  const IST_OFFSET = (5 * 60 + 30) * 60_000
  const sessionBreakdown: Record<string, { wins: number; total: number; rate: number }> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (rows ?? []) as any[]) {
    if (!r.entry_time) continue
    const ist     = new Date(new Date(r.entry_time).getTime() + IST_OFFSET)
    const h       = ist.getUTCHours()
    const m       = ist.getUTCMinutes()
    const minutes = h * 60 + m
    const session = minutes < 11 * 60 + 30 ? 'Morning (9:15–11:30)'
                  : minutes < 13 * 60 + 30 ? 'Midday (11:30–13:30)'
                  : 'Afternoon (13:30–15:15)'
    if (!sessionBreakdown[session]) sessionBreakdown[session] = { wins: 0, total: 0, rate: 0 }
    sessionBreakdown[session]!.total++
    if ((r.pnl ?? 0) > 0) sessionBreakdown[session]!.wins++
  }
  for (const s of Object.values(sessionBreakdown)) {
    s.rate = s.total > 0 ? parseFloat(((s.wins / s.total) * 100).toFixed(1)) : 0
  }

  return { data: { metrics, equityCurve, breakdowns, sessionBreakdown, tradeCount: trades.length } }
}

// ── Stock search ──────────────────────────────────────────────────────────

export async function searchNSEStocks(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: [] }

  const results = await searchStocks(query)
  return { data: results }
}
