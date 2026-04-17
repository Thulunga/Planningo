'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Zap, RefreshCw, Wifi, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@planningo/ui'
import { cn } from '@planningo/ui'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase/client'
import { isMarketOpen } from '@/lib/trading/market-hours'

interface TradingSignal {
  id: string
  symbol: string
  signal_type: 'BUY' | 'SELL' | 'HOLD'
  strength: 'WEAK' | 'STRONG' | 'VERY_STRONG'
  price: number
  confluence_score: number
  indicators: {
    rsi?: number
    ema9?: number
    ema21?: number
    supertrend?: string
    supertrendLine?: number
    macd?: number
    macdSignal?: number
    macdHistogram?: number
    bbUpper?: number
    bbMiddle?: number
    bbLower?: number
    atr?: number
    vwap?: number
  }
  candle_time: string
  created_at: string
}

interface SignalFeedProps {
  userId: string
  initialSignals: TradingSignal[]
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

const PAGE_SIZE = 10

export function SignalFeed({ userId, initialSignals }: SignalFeedProps) {
  const [signals, setSignals] = useState<TradingSignal[]>(initialSignals)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isRealtime, setIsRealtime] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  // ── Supabase Realtime subscription ────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel('trading_signals_feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trading_signals',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newSignal = payload.new as TradingSignal
          setSignals((prev) => [newSignal, ...prev].slice(0, 50))
          // Always bump visible count so the new signal is visible at top
          setVisibleCount((n) => Math.max(n, PAGE_SIZE))
          const icon = newSignal.signal_type === 'BUY' ? '🟢' : '🔴'
          toast(`${icon} ${newSignal.signal_type} ${newSignal.symbol}`, {
            description: `₹${newSignal.price} · ${newSignal.strength} · Score ${newSignal.confluence_score}/6`,
          })
        }
      )
      .subscribe((status) => {
        setIsRealtime(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // ── Auto-refresh during market hours ─────────────────────────────────────
  const triggerSignalGeneration = useCallback(async (force = false) => {
    if (!force && !isMarketOpen()) return

    setIsRefreshing(true)
    try {
      const res = await fetch('/api/trading/generate-signals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      setLastRefresh(new Date())
      if (data.signals?.length > 0) {
        toast.success(`${data.signals.length} new signal(s) generated`)
      }
    } catch {
      toast.error('Failed to refresh signals')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // Auto-refresh every 5 min during market hours
    const interval = setInterval(() => {
      if (isMarketOpen()) {
        triggerSignalGeneration()
      }
    }, REFRESH_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [triggerSignalGeneration])

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="font-semibold text-sm">Signal Feed</h2>
          <span className="text-xs text-muted-foreground">({signals.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {isRealtime && (
            <div className="flex items-center gap-1 text-xs text-emerald-500">
              <Wifi className="h-3 w-3" />
              <span className="hidden sm:inline">Live</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => triggerSignalGeneration(true)}
            disabled={isRefreshing}
            title="Refresh signals"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {lastRefresh && (
        <div className="px-3 py-1 text-[11px] text-muted-foreground border-b border-border/50">
          Last scan: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      )}

      {/* Signal list */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {signals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <Zap className="h-8 w-8 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No signals yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Click refresh to scan your watchlist
            </p>
          </div>
        ) : (
          <>
            {signals.slice(0, visibleCount).map((signal) => (
              <SignalRow key={signal.id} signal={signal} />
            ))}
            {visibleCount < signals.length && (
              <div className="flex items-center justify-center py-2 border-t border-border/50">
                <button
                  onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded hover:bg-muted/50"
                >
                  Load {Math.min(PAGE_SIZE, signals.length - visibleCount)} more
                  <span className="ml-1 opacity-50">({signals.length - visibleCount} remaining)</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function SignalRow({ signal }: { signal: TradingSignal }) {
  const [expanded, setExpanded] = useState(false)
  const isBuy = signal.signal_type === 'BUY'
  const strengthColor =
    signal.strength === 'VERY_STRONG'
      ? 'text-yellow-500'
      : signal.strength === 'STRONG'
        ? 'text-primary'
        : 'text-muted-foreground'

  const ind = signal.indicators

  // Build quick indicator pills
  const pills: Array<{ label: string; value: string; bullish: boolean | null }> = [
    ind.rsi != null
      ? { label: 'RSI', value: ind.rsi.toFixed(0), bullish: ind.rsi < 65 }
      : null,
    ind.ema9 != null && ind.ema21 != null
      ? { label: 'EMA', value: ind.ema9 > ind.ema21 ? '↑' : '↓', bullish: ind.ema9 > ind.ema21 }
      : null,
    ind.macd != null && ind.macdSignal != null
      ? { label: 'MACD', value: ind.macd > ind.macdSignal ? '↑' : '↓', bullish: ind.macd > ind.macdSignal }
      : null,
    ind.supertrend != null
      ? { label: 'ST', value: ind.supertrend === 'BUY' ? '🟢' : '🔴', bullish: ind.supertrend === 'BUY' }
      : null,
    ind.vwap != null
      ? { label: 'VWAP', value: signal.price > ind.vwap ? '↑' : '↓', bullish: signal.price > ind.vwap }
      : null,
  ].filter(Boolean) as Array<{ label: string; value: string; bullish: boolean | null }>

  return (
    <div className="border-b border-border/50 last:border-0">
      {/* ── Compact row ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Signal badge */}
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white text-xs font-bold',
            isBuy ? 'bg-emerald-500' : 'bg-red-500'
          )}
        >
          {isBuy ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-xs">
              {signal.symbol.replace('.NS', '').replace('.BO', '')}
            </span>
            <span
              className={cn(
                'text-[10px] font-medium px-1.5 py-0.5 rounded',
                isBuy
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-500/15 text-red-600 dark:text-red-400'
              )}
            >
              {signal.signal_type}
            </span>
            <span className={cn('text-[10px] font-medium', strengthColor)}>
              {signal.strength === 'VERY_STRONG' ? '⚡ V.STRONG' : signal.strength}
            </span>
          </div>
          {/* Indicator pills */}
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            <span className="text-[11px] text-muted-foreground mr-1">
              ₹{signal.price.toLocaleString('en-IN')}
            </span>
            {pills.map((p) => (
              <span
                key={p.label}
                className={cn(
                  'text-[9px] font-mono px-1 py-px rounded border',
                  p.bullish === true
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    : p.bullish === false
                      ? 'bg-red-500/10 text-red-500 border-red-500/20'
                      : 'bg-muted text-muted-foreground border-border'
                )}
              >
                {p.label}:{p.value}
              </span>
            ))}
          </div>
        </div>

        {/* Score + time + expand */}
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          <div className="text-xs font-bold font-mono">{signal.confluence_score}/6</div>
          <div className="text-[10px] text-muted-foreground/60">
            {new Date(signal.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <span className="text-muted-foreground/40">
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </span>
        </div>
      </div>

      {/* ── Expanded details ──────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-3 pb-2 bg-muted/20 border-t border-border/40 text-[11px] space-y-1">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1.5">
            {ind.rsi     != null && <DetailRow label="RSI (14)"     value={ind.rsi.toFixed(2)} />}
            {ind.macd    != null && <DetailRow label="MACD"         value={ind.macd.toFixed(4)} />}
            {ind.macdSignal != null && <DetailRow label="MACD Signal" value={ind.macdSignal.toFixed(4)} />}
            {ind.macdHistogram != null && <DetailRow label="Histogram" value={ind.macdHistogram.toFixed(4)} />}
            {ind.ema9    != null && <DetailRow label="EMA 9"        value={`₹${ind.ema9.toFixed(2)}`} />}
            {ind.ema21   != null && <DetailRow label="EMA 21"       value={`₹${ind.ema21.toFixed(2)}`} />}
            {ind.bbUpper != null && <DetailRow label="BB Upper"     value={`₹${ind.bbUpper.toFixed(2)}`} />}
            {ind.bbMiddle!= null && <DetailRow label="BB Middle"    value={`₹${ind.bbMiddle.toFixed(2)}`} />}
            {ind.bbLower != null && <DetailRow label="BB Lower"     value={`₹${ind.bbLower.toFixed(2)}`} />}
            {ind.supertrend != null && (
              <DetailRow
                label="Supertrend"
                value={ind.supertrend}
                colored={ind.supertrend === 'BUY' ? 'buy' : 'sell'}
              />
            )}
            {ind.supertrendLine != null && <DetailRow label="ST Line" value={`₹${ind.supertrendLine.toFixed(2)}`} />}
            {ind.vwap != null && <DetailRow label="VWAP" value={`₹${ind.vwap.toFixed(2)}`} />}
            {ind.atr  != null && <DetailRow label="ATR" value={ind.atr.toFixed(4)} />}
          </div>
          <div className="text-muted-foreground/50 pt-1">
            Candle: {new Date(signal.candle_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, colored }: { label: string; value: string; colored?: 'buy' | 'sell' }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground/70">{label}</span>
      <span className={cn(
        'font-mono font-medium',
        colored === 'buy'  ? 'text-emerald-500'
        : colored === 'sell' ? 'text-red-500'
        : ''
      )}>
        {value}
      </span>
    </div>
  )
}
