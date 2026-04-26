/**
 * POST /api/trading/generate-signals
 * Fetches 5-min candles for all active watchlist symbols,
 * runs indicator calculations, scores confluence, and persists
 * any actionable signals (BUY/SELL with score ≥ 3) to Supabase.
 * Supabase Realtime then broadcasts the insert to the UI.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCandles } from '@/lib/trading/market-data'
import { calculateIndicators } from '@/lib/trading/indicators'
import { generateSignal, isActionableSignal } from '@/lib/trading/signal-engine'
import { executePaperTrade, initializePortfolio } from '@/lib/trading/paper-trader'
import { isMarketOpen } from '@/lib/trading/market-hours'
import { getTrendContext, DEFAULT_HTF_CONFIG, DEFAULT_STRATEGY_CONFIG } from '@planningo/trading-core'
import type { SignalEngineExtConfig } from '@planningo/trading-core'
import { buildAllConfigs } from '@/lib/trading/bot-config-utils'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Allow force-run outside market hours (for testing)
  // Accept optional botConfig from the Bot Manager store (sent by the client scan trigger)
  const body = await request.json().catch(() => ({}))
  const forceRun = body?.force === true

  // Build strategy/risk/ext configs.
  // Priority: body.botConfig (manual trigger) → DB-saved config → defaults
  let strategyConfig = DEFAULT_STRATEGY_CONFIG
  let extConfig: SignalEngineExtConfig = {}

  const rawBotConfig = body?.botConfig ?? null

  if (rawBotConfig) {
    // Client sent config explicitly (manual scan from UI)
    try {
      const built = buildAllConfigs(rawBotConfig)
      strategyConfig = built.strategyConfig
      extConfig      = built.extConfig
    } catch {
      // fall through to DB load
    }
  }

  if (!rawBotConfig) {
    // Cron path - load saved config from DB so the scheduled job honours Bot Manager settings
    try {
      const { data: cfgRow } = await (supabase as any)
        .from('bot_config')
        .select('config')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cfgRow?.config) {
        const { BOT_CONFIG_DEFAULTS } = await import('@/stores/trading-config-store')
        const merged = { ...BOT_CONFIG_DEFAULTS, ...(cfgRow.config as object) }
        const built  = buildAllConfigs(merged as any)
        strategyConfig = built.strategyConfig
        extConfig      = built.extConfig
      }
    } catch {
      // DB read failed - continue with defaults, log for observability
      console.warn('[signals] Could not load bot_config from DB, using defaults')
    }
  }

  if (!isMarketOpen() && !forceRun) {
    return NextResponse.json({ message: 'Market is closed', signals: [] })
  }

  // Ensure portfolio exists
  await initializePortfolio(user.id)

  // Fetch active watchlist
  const { data: watchlist, error: wErr } = await supabase
    .from('trading_watchlist')
    .select('symbol, display_name')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (wErr || !watchlist || watchlist.length === 0) {
    return NextResponse.json({ message: 'No active watchlist symbols', signals: [] })
  }

  const results: Array<{
    symbol: string
    signal: string
    strength: string
    score: number
    price: number
    tradeResult?: string
  }> = []

  // Process each symbol in parallel
  await Promise.all(
    watchlist.map(async ({ symbol }) => {
      try {
        const candles = await fetchCandles(symbol, 100)
        if (candles.length < 35) {
          console.warn(`[signals] Insufficient candles for ${symbol}: ${candles.length}`)
          return
        }

        const indicators = calculateIndicators(candles, strategyConfig)
        const htfCfg = extConfig.htfConfig
          ? { ...DEFAULT_HTF_CONFIG, ...extConfig.htfConfig }
          : DEFAULT_HTF_CONFIG
        const trendContext = getTrendContext(candles, htfCfg)
        const signal = generateSignal(indicators, candles, strategyConfig, trendContext, extConfig)

        // Only persist actionable signals (not HOLD)
        if (signal.type === 'HOLD') return

        // Persist signal to DB (Realtime broadcasts to clients)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const signalResult: { data: { id: string } | null; error: any } = await (supabase as any)
          .from('trading_signals')
          .insert({
            user_id: user.id,
            symbol,
            signal_type: signal.type,
            strength: signal.strength,
            price: signal.price,
            indicators: {
              rsi: signal.indicators.rsi,
              macd: signal.indicators.macd,
              macdSignal: signal.indicators.macdSignal,
              macdHistogram: signal.indicators.macdHistogram,
              ema9: signal.indicators.ema9,
              ema21: signal.indicators.ema21,
              bbUpper: signal.indicators.bbUpper,
              bbMiddle: signal.indicators.bbMiddle,
              bbLower: signal.indicators.bbLower,
              supertrend: signal.indicators.supertrend,
              supertrendLine: signal.indicators.supertrendLine,
              atr: signal.indicators.atr,
            },
            confluence_score: signal.confluenceScore,
            candle_time: signal.candleTime.toISOString(),
          })
          .select('id')
          .single()
        const { data: savedSignal, error: sigErr } = signalResult

        if (sigErr || !savedSignal) {
          console.error(`[signals] Failed to save signal for ${symbol}:`, sigErr)
          return
        }

        // Auto-execute paper trade for STRONG/VERY_STRONG signals
        let tradeResult = 'No trade'
        if (isActionableSignal(signal)) {
          const result = await executePaperTrade(user.id, {
            id: savedSignal.id,
            symbol,
            signal_type: signal.type,
            price: signal.price,
            indicators: { atr: signal.indicators.atr ?? undefined },
          })
          tradeResult = result.reason
        }

        results.push({
          symbol,
          signal: signal.type,
          strength: signal.strength,
          score: signal.confluenceScore,
          price: signal.price,
          tradeResult,
        })
      } catch (err) {
        console.error(`[signals] Error processing ${symbol}:`, err)
      }
    })
  )

  return NextResponse.json({ signals: results, count: results.length })
}
