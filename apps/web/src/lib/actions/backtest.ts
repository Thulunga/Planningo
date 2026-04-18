'use server'

import { createClient } from '@/lib/supabase/server'
import { fetchHistoricalCandles } from '@/lib/trading/historical-data'
import {
  runBacktest,
  DEFAULT_STRATEGY_CONFIG,
  DEFAULT_RISK_CONFIG,
  DEFAULT_BACKTEST_CONFIG,
} from '@planningo/trading-core'
import type { StrategyConfig, RiskConfig } from '@planningo/trading-core'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: any, table: string) { return supabase.from(table) }

function isAdmin(email: string | undefined): boolean {
  return !!(email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL)
}

// ── Input types ───────────────────────────────────────────────────────────────

export interface RunBacktestParams {
  symbol: string          // e.g. "RELIANCE.NS"
  fromDate: string        // "YYYY-MM-DD"
  toDate: string          // "YYYY-MM-DD"
  initialCapital: number  // default 100000
  // Strategy overrides (optional — defaults to DEFAULT_STRATEGY_CONFIG)
  confluenceThreshold?: number
  rsiOversold?: number
  rsiOverbought?: number
  emaFast?: number
  emaSlow?: number
  // Risk overrides
  atrMultiplierStop?: number
  atrMultiplierTarget?: number
  allowShorts?: boolean
}

// ── Run a backtest ────────────────────────────────────────────────────────────

export async function runBacktestAction(params: RunBacktestParams) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const from = new Date(params.fromDate + 'T00:00:00+05:30')
  const to   = new Date(params.toDate   + 'T23:59:59+05:30')

  if (from >= to) return { error: 'Start date must be before end date', data: null }

  // Build configs with any overrides
  const strategyConfig: StrategyConfig = {
    ...DEFAULT_STRATEGY_CONFIG,
    ...(params.confluenceThreshold !== undefined && { confluenceThreshold: params.confluenceThreshold }),
    ...(params.rsiOversold         !== undefined && { rsiOversold:         params.rsiOversold }),
    ...(params.rsiOverbought       !== undefined && { rsiOverbought:       params.rsiOverbought }),
    ...(params.emaFast             !== undefined && { emaFast:             params.emaFast }),
    ...(params.emaSlow             !== undefined && { emaSlow:             params.emaSlow }),
  }
  const riskConfig: RiskConfig = {
    ...DEFAULT_RISK_CONFIG,
    ...(params.atrMultiplierStop   !== undefined && { atrMultiplierStop:   params.atrMultiplierStop }),
    ...(params.atrMultiplierTarget !== undefined && { atrMultiplierTarget: params.atrMultiplierTarget }),
  }

  // Create a placeholder run row
  const { data: runRow, error: insertErr } = await db(supabase, 'backtest_runs').insert({
    user_id:         user.id,
    symbol:          params.symbol.toUpperCase(),
    start_date:      params.fromDate,
    end_date:        params.toDate,
    initial_capital: params.initialCapital,
    config:          { strategyConfig, riskConfig, ...DEFAULT_BACKTEST_CONFIG },
    status:          'RUNNING',
  }).select('id').single()

  if (insertErr || !runRow) {
    return { error: `DB error: ${insertErr?.message ?? 'unknown'}`, data: null }
  }
  const runId: string = runRow.id

  try {
    // Fetch candles
    const { candles, interval, warning } = await fetchHistoricalCandles(
      params.symbol.toUpperCase(), from, to
    )

    if (candles.length === 0) {
      await db(supabase, 'backtest_runs').update({
        status: 'FAILED', error_message: 'No candle data returned for this symbol/range',
      }).eq('id', runId)
      return { error: 'No candle data returned for this symbol/date range', data: null }
    }

    // Run backtest
    const result = await runBacktest(candles, {
      ...DEFAULT_BACKTEST_CONFIG,
      symbol:         params.symbol.toUpperCase(),
      startDate:      from,
      endDate:        to,
      initialCapital: params.initialCapital,
      strategyConfig,
      riskConfig,
      allowShorts: params.allowShorts ?? false,
    })

    // Save individual trades
    if (result.trades.length > 0) {
      const tradeRows = result.trades.map((t) => ({
        run_id:          runId,
        symbol:          result.config.symbol,
        entry_time:      t.entryTime.toISOString(),
        entry_price:     t.entryPrice,
        exit_time:       t.exitTime?.toISOString() ?? null,
        exit_price:      t.exitPrice ?? null,
        quantity:        t.quantity,
        stop_loss:       t.stopLoss,
        target:          t.target,
        pnl:             t.pnl ?? null,
        pnl_pct:         t.pnlPct ?? null,
        r_multiple:      t.rMultiple ?? null,
        status:          t.status,
        exit_reason:     t.exitReason ?? null,
        mae:             t.mae ?? null,
        mfe:             t.mfe ?? null,
        duration_minutes: t.durationMinutes ?? null,
        confluence_score: t.confluenceScore ?? null,
        signal_strength:  t.signalStrength ?? null,
        risk_amount:      t.riskAmount ?? null,
        charges_total:    t.chargesTotal ?? null,
      }))
      await db(supabase, 'backtest_trades').insert(tradeRows)
    }

    // Update run with results
    await db(supabase, 'backtest_runs').update({
      status:       'COMPLETED',
      metrics:      result.metrics,
      equity_curve: result.equityCurve.map((p) => ({
        ...p, time: p.time.toISOString(),
      })),
      total_candles: result.totalCandles,
      completed_at:  new Date().toISOString(),
    }).eq('id', runId)

    return {
      data: {
        runId,
        result,
        interval,
        warning,
        candleCount: candles.length,
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    await db(supabase, 'backtest_runs').update({
      status: 'FAILED', error_message: msg,
    }).eq('id', runId)
    return { error: msg, data: null }
  }
}

// ── Delete a run ─────────────────────────────────────────────────────────────

export async function deleteBacktestRun(runId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized' }

  const { error } = await db(supabase, 'backtest_runs')
    .delete()
    .eq('id', runId)
    .eq('user_id', user.id)

  return { error: error?.message ?? null }
}

// ── List past runs ────────────────────────────────────────────────────────────

export async function getBacktestHistory(limit = 20) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const { data, error } = await db(supabase, 'backtest_runs')
    .select('id, symbol, start_date, end_date, initial_capital, status, metrics, total_candles, created_at, completed_at, error_message')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error: error?.message }
}

// ── Get a single run with its trades ─────────────────────────────────────────

export async function getBacktestRun(runId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', data: null }

  const { data: run, error: runErr } = await db(supabase, 'backtest_runs')
    .select('*')
    .eq('id', runId)
    .eq('user_id', user.id)
    .single()

  if (runErr || !run) return { error: 'Run not found', data: null }

  const { data: trades } = await db(supabase, 'backtest_trades')
    .select('*')
    .eq('run_id', runId)
    .order('entry_time', { ascending: true })

  return { data: { run, trades: trades ?? [] } }
}
