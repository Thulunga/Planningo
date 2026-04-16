'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, TrendingDown, Zap, RefreshCw, Wifi } from 'lucide-react'
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
    macd?: number
    atr?: number
  }
  candle_time: string
  created_at: string
}

interface SignalFeedProps {
  userId: string
  initialSignals: TradingSignal[]
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export function SignalFeed({ userId, initialSignals }: SignalFeedProps) {
  const [signals, setSignals] = useState<TradingSignal[]>(initialSignals)
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
          const icon = newSignal.signal_type === 'BUY' ? '🟢' : '🔴'
          toast(`${icon} ${newSignal.signal_type} ${newSignal.symbol}`, {
            description: `₹${newSignal.price} · ${newSignal.strength} · Score ${newSignal.confluence_score}/5`,
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
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
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
        <div className="px-4 py-1.5 text-xs text-muted-foreground border-b border-border/50">
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
          signals.map((signal) => (
            <SignalRow key={signal.id} signal={signal} />
          ))
        )}
      </div>
    </div>
  )
}

function SignalRow({ signal }: { signal: TradingSignal }) {
  const isBuy = signal.signal_type === 'BUY'
  const strengthColor =
    signal.strength === 'VERY_STRONG'
      ? 'text-yellow-500'
      : signal.strength === 'STRONG'
        ? 'text-primary'
        : 'text-muted-foreground'

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      {/* Signal badge */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-xs font-bold',
          isBuy ? 'bg-emerald-500' : 'bg-red-500'
        )}
      >
        {isBuy ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm truncate">
            {signal.symbol.replace('.NS', '').replace('.BO', '')}
          </span>
          <span
            className={cn(
              'text-xs font-medium px-1.5 py-0.5 rounded',
              isBuy ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/15 text-red-600 dark:text-red-400'
            )}
          >
            {signal.signal_type}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">₹{signal.price.toLocaleString('en-IN')}</span>
          {signal.indicators.rsi != null && (
            <span className="text-xs text-muted-foreground">RSI:{signal.indicators.rsi.toFixed(0)}</span>
          )}
          <span className={cn('text-xs font-medium', strengthColor)}>
            {signal.strength === 'VERY_STRONG' ? '⚡ V.STRONG' : signal.strength}
          </span>
        </div>
      </div>

      {/* Score + time */}
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-muted-foreground">{signal.confluence_score}/5</div>
        <div className="text-xs text-muted-foreground/60">
          {new Date(signal.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}
