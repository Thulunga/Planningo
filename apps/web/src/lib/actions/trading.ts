'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { initializePortfolio } from '@/lib/trading/paper-trader'
import { searchStocks } from '@/lib/trading/market-data'
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

// ── Stock search ──────────────────────────────────────────────────────────

export async function searchNSEStocks(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: [] }

  const results = await searchStocks(query)
  return { data: results }
}
