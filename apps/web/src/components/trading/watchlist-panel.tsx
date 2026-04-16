'use client'

import { useState, useTransition, useCallback, useEffect } from 'react'
import { TrendingUp, TrendingDown, Plus, Trash2, RefreshCw, BarChart2 } from 'lucide-react'
import { Button } from '@planningo/ui'
import { cn } from '@planningo/ui'
import { toast } from 'sonner'
import { removeFromWatchlist } from '@/lib/actions/trading'
import { AddToWatchlistDialog } from './add-to-watchlist-dialog'

interface WatchlistItem {
  id: string
  symbol: string
  display_name: string
  is_active: boolean
}

interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  name: string
}

interface IndicatorState {
  rsi?: number | null
  ema9?: number | null
  ema21?: number | null
  supertrend?: string | null
  bbUpper?: number | null
  bbLower?: number | null
  macd?: number | null
  macdSignal?: number | null
}

interface WatchlistPanelProps {
  watchlist: WatchlistItem[]
  onRefresh: () => void
  onSymbolSelect: (symbol: string) => void
  selectedSymbol: string | null
}

export function WatchlistPanel({
  watchlist,
  onRefresh,
  onSymbolSelect,
  selectedSymbol,
}: WatchlistPanelProps) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [indicators, setIndicators] = useState<Record<string, IndicatorState>>({})
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  const activeSymbols = watchlist.filter((w) => w.is_active).map((w) => w.symbol)

  const fetchQuotes = useCallback(async () => {
    if (activeSymbols.length === 0) return
    setIsLoadingQuotes(true)
    try {
      const res = await fetch('/api/trading/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols: activeSymbols }),
      })
      const data = await res.json()
      const map: Record<string, Quote> = {}
      for (const q of data.quotes ?? []) {
        map[q.symbol] = q
      }
      setQuotes(map)
    } catch {
      // silently fail — will retry on next interval
    } finally {
      setIsLoadingQuotes(false)
    }
  }, [activeSymbols.join(',')])

  useEffect(() => {
    fetchQuotes()
    const interval = setInterval(fetchQuotes, 60_000) // refresh every 1 min
    return () => clearInterval(interval)
  }, [fetchQuotes])

  async function handleRemove(id: string, symbol: string) {
    startTransition(async () => {
      const result = await removeFromWatchlist(id)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`Removed ${symbol}`)
        onRefresh()
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Watchlist</h2>
          <span className="text-xs text-muted-foreground">({watchlist.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchQuotes}
            disabled={isLoadingQuotes}
            title="Refresh quotes"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isLoadingQuotes && 'animate-spin')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowAddDialog(true)}
            title="Add stock"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Table header */}
      {watchlist.length > 0 && (
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-1.5 text-xs text-muted-foreground border-b border-border/50">
          <span>Symbol</span>
          <span className="text-right">Price</span>
          <span className="text-right hidden sm:block">Chg%</span>
          <span className="text-center hidden md:block">Indicators</span>
          <span />
        </div>
      )}

      {/* Rows */}
      <div className="divide-y divide-border/40">
        {watchlist.length === 0 ? (
          <div className="py-10 text-center">
            <BarChart2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Watchlist is empty</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => setShowAddDialog(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add first stock
            </Button>
          </div>
        ) : (
          watchlist.map((item) => {
            const quote = quotes[item.symbol]
            const indic = indicators[item.symbol]
            const isUp = (quote?.change ?? 0) >= 0
            const isSelected = selectedSymbol === item.symbol

            return (
              <div
                key={item.id}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2.5 items-center cursor-pointer transition-colors',
                  isSelected ? 'bg-primary/10' : 'hover:bg-muted/30'
                )}
                onClick={() => onSymbolSelect(item.symbol)}
              >
                {/* Symbol + name */}
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    {item.symbol.replace('.NS', '').replace('.BO', '')}
                  </div>
                  <div className="text-xs text-muted-foreground truncate max-w-[120px]">
                    {item.display_name}
                  </div>
                </div>

                {/* Price */}
                <div className="text-right">
                  <div className="font-mono text-sm font-medium">
                    {quote ? `₹${quote.price.toLocaleString('en-IN')}` : '—'}
                  </div>
                </div>

                {/* Change % */}
                <div className={cn('text-right text-xs font-medium hidden sm:block', isUp ? 'text-emerald-500' : 'text-red-500')}>
                  {quote ? (
                    <>
                      {isUp ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : <TrendingDown className="inline h-3 w-3 mr-0.5" />}
                      {isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%
                    </>
                  ) : '—'}
                </div>

                {/* Indicator pills */}
                <div className="hidden md:flex items-center gap-1">
                  {indic?.rsi != null && (
                    <IndicPill label={`RSI:${indic.rsi.toFixed(0)}`} variant={indic.rsi > 70 ? 'bearish' : indic.rsi < 40 ? 'bullish' : 'neutral'} />
                  )}
                  {indic?.supertrend && (
                    <IndicPill label={`ST:${indic.supertrend === 'BUY' ? '▲' : '▼'}`} variant={indic.supertrend === 'BUY' ? 'bullish' : 'bearish'} />
                  )}
                </div>

                {/* Remove button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRemove(item.id, item.symbol)
                  }}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )
          })
        )}
      </div>

      <AddToWatchlistDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdded={() => {
          onRefresh()
          setShowAddDialog(false)
        }}
      />
    </div>
  )
}

function IndicPill({ label, variant }: { label: string; variant: 'bullish' | 'bearish' | 'neutral' }) {
  return (
    <span
      className={cn(
        'text-[10px] font-medium px-1 py-0.5 rounded',
        variant === 'bullish' && 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        variant === 'bearish' && 'bg-red-500/15 text-red-600 dark:text-red-400',
        variant === 'neutral' && 'bg-muted text-muted-foreground'
      )}
    >
      {label}
    </span>
  )
}
