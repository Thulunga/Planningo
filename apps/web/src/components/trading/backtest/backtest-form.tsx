'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Play, AlertTriangle, ShieldCheck, Settings2 } from 'lucide-react'
import { runBacktestAction } from '@/lib/actions/backtest'
import type { RunBacktestParams } from '@/lib/actions/backtest'
import type { BacktestResult } from '@planningo/trading-core'
import { useTradingConfig } from '@/stores/trading-config-store'

export interface WatchlistItem {
  id: string
  symbol: string
  display_name: string
}

interface Props {
  onResult: (result: {
    result: BacktestResult
    interval: string
    warning?: string
    candleCount: number
    runId: string
  }) => void
  watchlist?: WatchlistItem[]
}

const CUSTOM = '__CUSTOM__'

function dateStr(d: Date) {
  return d.toISOString().substring(0, 10)
}

export function BacktestForm({ onResult, watchlist = [] }: Props) {
  const today     = new Date()
  const thirtyAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const { config: botConfig } = useTradingConfig()

  const [selected,    setSelected]    = useState(watchlist.length ? watchlist[0].symbol : CUSTOM)
  const [customSym,   setCustomSym]   = useState(watchlist.length ? '' : 'RELIANCE.NS')
  const [fromDate,    setFromDate]    = useState(dateStr(thirtyAgo))
  const [toDate,      setToDate]      = useState(dateStr(today))
  const [capital,     setCapital]     = useState(100_000)
  const [error,       setError]       = useState<string | null>(null)
  const [isPending,   startTransition] = useTransition()

  const symbol = selected === CUSTOM ? customSym.toUpperCase() : selected

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const params: RunBacktestParams = {
      symbol,
      fromDate,
      toDate,
      initialCapital: capital,
      botConfig,             // full config from Bot Manager
      allowShorts:    botConfig.allowShorts,
    }

    startTransition(async () => {
      const res = await runBacktestAction(params)
      if (res.error || !res.data) {
        setError(res.error ?? 'Unknown error')
        return
      }
      onResult(res.data)
    })
  }

  const daysDiff     = Math.round((new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86_400_000)
  const willUseDaily = daysDiff > 58

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Bot Manager badge */}
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
        Uses the same 6-indicator strategy &amp; risk rules as the live paper trading engine
        </div>
        <Link
          href="/trading/manage"
          className="inline-flex items-center gap-1 text-primary hover:underline"
        >
          <Settings2 className="h-3 w-3" />
          Edit in Bot Manager
        </Link>
      </div>

      {/* Symbol + dates */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Symbol</label>
          {watchlist.length > 0 ? (
            <div className="space-y-2">
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {watchlist.map((w) => (
                  <option key={w.id} value={w.symbol}>
                    {w.display_name} ({w.symbol})
                  </option>
                ))}
                <option value={CUSTOM}>Customâ€¦</option>
              </select>
              {selected === CUSTOM && (
                <input
                  value={customSym}
                  onChange={(e) => setCustomSym(e.target.value.toUpperCase())}
                  placeholder="e.g. INFY.NS"
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                  autoFocus
                />
              )}
            </div>
          ) : (
            <input
              value={customSym}
              onChange={(e) => setCustomSym(e.target.value.toUpperCase())}
              placeholder="e.g. RELIANCE.NS"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              required
            />
          )}
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            max={toDate}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            min={fromDate}
            max={dateStr(today)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            required
          />
        </div>
      </div>

      {/* Capital */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Starting Capital (â‚¹)</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            min={10000}
            step={10000}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            required
          />
        </div>
        <div className="flex items-end pb-2 gap-4 text-xs text-muted-foreground">
          <span>Confluence: <strong className="text-foreground">{botConfig.confluenceThreshold}</strong></span>
          <span>Stop: <strong className="text-foreground">{botConfig.atrMultiplierStop}Ã— ATR</strong></span>
          <span>Target: <strong className="text-foreground">{botConfig.atrMultiplierTarget}Ã— ATR</strong></span>
          <span>Shorts: <strong className="text-foreground">{botConfig.allowShorts ? 'Yes' : 'No'}</strong></span>
        </div>
      </div>

      {willUseDaily && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Date range &gt; 58 days - will use daily candles. Strategy is tuned for 5-min intraday; results are indicative only.
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Play className="h-4 w-4" />
        {isPending ? 'Running backtest...' : 'Run Backtest'}
      </button>
    </form>
  )
}
