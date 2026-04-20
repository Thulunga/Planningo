'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { AlertTriangle, BarChart2, Clock3, PlayCircle, ShieldAlert, Sparkles } from 'lucide-react'
import { MarketStatusBanner } from './market-status-banner'
import { PortfolioSummary } from './portfolio-summary'
import { SignalFeed } from './signal-feed'
import { WatchlistPanel } from './watchlist-panel'
import { CandlestickChart } from './candlestick-chart'
import { OpenPositions } from './open-positions'
import { TradeHistory } from './trade-history'
import { EngineStatus } from './engine-status'
import { ActivityLog } from './activity-log'
import { getMarketInfo, formatDuration } from '@/lib/trading/market-hours'
import { cn } from '@planningo/ui'

interface Portfolio {
  virtual_capital: number
  available_cash: number
  total_pnl: number
  total_trades: number
  winning_trades: number
}

interface WatchlistItem {
  id: string
  symbol: string
  display_name: string
  is_active: boolean
}

interface TradingSignal {
  id: string
  symbol: string
  signal_type: 'BUY' | 'SELL' | 'HOLD'
  strength: 'WEAK' | 'STRONG' | 'VERY_STRONG'
  price: number
  confluence_score: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  indicators: Record<string, any>
  candle_time: string
  created_at: string
}

interface PaperTrade {
  id: string
  symbol: string
  trade_type: string
  quantity: number
  entry_price: number
  exit_price: number | null
  stop_loss: number | null
  target: number | null
  pnl: number | null
  status: string
  entry_time: string
  exit_time: string | null
}

interface TradingDashboardProps {
  userId: string
  portfolio: Portfolio
  watchlist: WatchlistItem[]
  signals: TradingSignal[]
  openTrades: PaperTrade[]
  closedTrades: PaperTrade[]
  initialScanLogs?: unknown[]
}

export function TradingDashboard({
  userId,
  portfolio,
  watchlist,
  signals,
  openTrades: initialOpenTrades,
  closedTrades,
}: TradingDashboardProps) {
  type FocusMode = 'execution' | 'analysis'

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(
    watchlist[0]?.symbol ?? null
  )
  const [focusMode, setFocusMode] = useState<FocusMode>('execution')
  const watchlistContainerRef = useRef<HTMLDivElement>(null)
  const [chartHeight, setChartHeight] = useState<number>(300)
  const [, startTransition] = useTransition()

  function refreshAll() {
    window.location.reload()
  }

  void startTransition

  const activeWatchlistCount = watchlist.filter((w) => w.is_active).length
  const openTradesCount = initialOpenTrades.length
  const latestSignalsCount = signals.length

  const market = getMarketInfo()
  const marketStateLabel =
    market.status === 'OPEN'
      ? 'Market Open'
      : market.status === 'PRE_OPEN'
        ? 'Pre-Open'
        : 'Market Closed'

  const lastSignalAt = signals[0]?.created_at
  const lastScanLabel = lastSignalAt
    ? new Date(lastSignalAt).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    : 'No scans yet'

  const riskLevel: 'low' | 'medium' | 'high' =
    openTradesCount >= 5 ? 'high' : openTradesCount >= 3 ? 'medium' : 'low'

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const todayClosed = useMemo(() => {
    return closedTrades.filter((t) => {
      if (!t.exit_time) return false
      const exit = new Date(t.exit_time)
      return !Number.isNaN(exit.getTime()) && exit >= todayStart
    })
  }, [closedTrades, todayStart])

  const todaysRealizedPnl = todayClosed.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const todaysWinCount = todayClosed.filter((t) => (t.pnl ?? 0) > 0).length
  const todaysWinRate = todayClosed.length > 0 ? Math.round((todaysWinCount / todayClosed.length) * 100) : 0
  const avgHoldMins = useMemo(() => {
    const mins = todayClosed
      .map((t) => {
        if (!t.exit_time || !t.entry_time) return null
        const diff = (new Date(t.exit_time).getTime() - new Date(t.entry_time).getTime()) / 60000
        return Number.isFinite(diff) && diff > 0 ? diff : null
      })
      .filter((v): v is number => v != null)
    if (mins.length === 0) return null
    return Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)
  }, [todayClosed])

  const alerts = useMemo(() => {
    const rows: Array<{ id: string; level: 'info' | 'warn' | 'critical'; text: string }> = []

    if (market.status !== 'OPEN') {
      rows.push({
        id: 'market-state',
        level: 'warn',
        text:
          market.status === 'PRE_OPEN'
            ? `Market is in pre-open. Opens in ${formatDuration(market.msUntilChange)}.`
            : `Market closed. Next session in ${formatDuration(market.msUntilChange)}.`,
      })
    }

    if (openTradesCount >= 5) {
      rows.push({
        id: 'risk-high',
        level: 'critical',
        text: 'Position load is high (5+ open trades). Tighten risk and review exposure.',
      })
    } else if (openTradesCount >= 3) {
      rows.push({
        id: 'risk-medium',
        level: 'warn',
        text: 'Position load is elevated (3+ open trades). Monitor stops closely.',
      })
    }

    const strongSignals = signals.filter((s) => s.strength === 'STRONG' || s.strength === 'VERY_STRONG').length
    if (strongSignals > 0) {
      rows.push({
        id: 'strong-signals',
        level: 'info',
        text: `${strongSignals} strong/very-strong signal(s) in feed.`,
      })
    }

    if (signals.length === 0) {
      rows.push({
        id: 'no-signals',
        level: 'warn',
        text: 'No recent signals detected. Use refresh in Signal Feed if needed.',
      })
    }

    return rows.slice(0, 4)
  }, [market.msUntilChange, market.status, openTradesCount, signals])

  useEffect(() => {
    const el = watchlistContainerRef.current
    if (!el) return

    const updateHeight = () => {
      // Keep chart at current minimum, but on desktop let it track watchlist height.
      if (window.innerWidth < 1280) {
        setChartHeight(300)
        return
      }

      const watchlistHeight = el.getBoundingClientRect().height
      // Account for chart card paddings/header so the canvas area stays balanced.
      const target = Math.max(300, Math.min(900, Math.round(watchlistHeight - 64)))
      setChartHeight(target)
    }

    updateHeight()
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    window.addEventListener('resize', updateHeight)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateHeight)
    }
  }, [watchlist.length, focusMode])

  return (
    <div className="space-y-4">
      {/* Sticky command bar */}
      <section className="sticky top-2 z-20 rounded-xl border border-border/70 bg-background/90 backdrop-blur px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={cn(
              'rounded-md px-2 py-1 font-medium',
              market.status === 'OPEN'
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                : market.status === 'PRE_OPEN'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-muted text-muted-foreground'
            )}>
              {marketStateLabel}
            </span>
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">Last scan: {lastScanLabel}</span>
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">Open: {openTradesCount}</span>
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground">Signals: {latestSignalsCount}</span>
            <span className="rounded-md bg-muted px-2 py-1 text-muted-foreground hidden md:inline">{market.currentIST} IST</span>
          </div>

          <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
            <button
              className={cn(
                'px-2.5 py-1.5 rounded-md transition-colors',
                focusMode === 'execution'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              onClick={() => setFocusMode('execution')}
            >
              Execution
            </button>
            <button
              className={cn(
                'px-2.5 py-1.5 rounded-md transition-colors',
                focusMode === 'analysis'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
              onClick={() => setFocusMode('analysis')}
            >
              Analysis
            </button>
          </div>
        </div>
      </section>

      {/* Control deck: aligned status + portfolio + pulse tiles */}
      <section className="rounded-2xl border border-border/80 bg-card/80 p-3 md:p-4 shadow-sm">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
          <div className="xl:col-span-8 space-y-4">
            <MarketStatusBanner />
            <EngineStatus />
          </div>

          <div className="xl:col-span-4">
            <div className="h-full rounded-xl border border-border/60 bg-gradient-to-br from-muted/30 via-card to-card p-0">
              <PortfolioSummary portfolio={portfolio} onRefresh={refreshAll} />
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-border/60 bg-gradient-to-b from-muted/40 to-muted/20 px-3 py-2.5">
            <div className="text-muted-foreground">Active watchlist</div>
            <div className="font-semibold text-sm mt-0.5">{activeWatchlistCount} symbols</div>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5">
            <div className="text-emerald-700 dark:text-emerald-300/90">Open positions</div>
            <div className="font-semibold text-sm mt-0.5 text-emerald-700 dark:text-emerald-300">{openTradesCount} live</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-gradient-to-b from-muted/40 to-muted/20 px-3 py-2.5">
            <div className="text-muted-foreground">Recent signals</div>
            <div className="font-semibold text-sm mt-0.5">{latestSignalsCount} tracked</div>
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
          <div className="rounded-md border border-border/60 bg-card px-3 py-2">
            <div className="text-muted-foreground">Today realized P&L</div>
            <div className={cn('font-semibold mt-0.5', todaysRealizedPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
              {todaysRealizedPnl >= 0 ? '+' : ''}₹{todaysRealizedPnl.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-card px-3 py-2">
            <div className="text-muted-foreground">Today win rate</div>
            <div className="font-semibold mt-0.5">{todayClosed.length > 0 ? `${todaysWinRate}%` : '--'}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-card px-3 py-2">
            <div className="text-muted-foreground">Avg hold time</div>
            <div className="font-semibold mt-0.5">{avgHoldMins != null ? `${avgHoldMins} min` : '--'}</div>
          </div>
          <div className="rounded-md border border-border/60 bg-card px-3 py-2">
            <div className="text-muted-foreground">Risk load</div>
            <div className={cn(
              'font-semibold mt-0.5',
              riskLevel === 'high'
                ? 'text-red-600 dark:text-red-400'
                : riskLevel === 'medium'
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400'
            )}>
              {riskLevel.toUpperCase()}
            </div>
          </div>
        </div>
      </section>

      {/* Alert center */}
      <section className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Alert Center</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {alerts.length === 0 ? (
            <div className="text-xs text-muted-foreground rounded-md border border-border/60 bg-muted/20 px-3 py-2">
              No active alerts. Engine and flow look normal.
            </div>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={cn(
                  'rounded-md border px-3 py-2 text-xs flex items-start gap-2',
                  a.level === 'critical'
                    ? 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300'
                    : a.level === 'warn'
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-blue-500/35 bg-blue-500/10 text-blue-700 dark:text-blue-300'
                )}
              >
                {a.level === 'critical' ? <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : a.level === 'warn' ? <Clock3 className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                <span>{a.text}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Primary focus row: large chart + watchlist */}
      <div className={cn(
        'grid grid-cols-1 xl:grid-cols-[1.9fr_1fr] gap-4 items-start',
        focusMode === 'analysis' && 'xl:grid-cols-[1.55fr_1fr]'
      )}>
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col">
          {selectedSymbol ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">
                  {selectedSymbol.replace('.NS', '').replace('.BO', '')} - 5-min Candlestick
                </h2>
                <span className="text-xs text-muted-foreground">NSE · Intraday</span>
              </div>
              <CandlestickChart key={selectedSymbol} symbol={selectedSymbol} className="flex-1" height={chartHeight} />
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-card/40 p-4 text-xs text-muted-foreground">
              Select a symbol in watchlist to view live candlestick context.
            </div>
          )}
        </div>

        <div ref={watchlistContainerRef}>
          <WatchlistPanel
            watchlist={watchlist}
            onRefresh={refreshAll}
            onSymbolSelect={setSelectedSymbol}
            selectedSymbol={selectedSymbol}
          />
        </div>
      </div>

      {/* Priority section: highlight open positions while bot is running */}
      <div className={cn(
        'rounded-xl p-3',
        riskLevel === 'high'
          ? 'border border-red-500/45 bg-red-500/10'
          : riskLevel === 'medium'
            ? 'border border-amber-500/45 bg-amber-500/10'
            : 'border border-emerald-500/40 bg-emerald-500/5'
      )}>
        <div className="flex items-center gap-2 px-1 pb-2">
          <span className={cn(
            'h-2 w-2 rounded-full animate-pulse',
            riskLevel === 'high' ? 'bg-red-500' : riskLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500'
          )} />
          <h3 className={cn(
            'text-sm font-semibold',
            riskLevel === 'high'
              ? 'text-red-700 dark:text-red-300'
              : riskLevel === 'medium'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-emerald-600 dark:text-emerald-400'
          )}>
            Open Positions (Live Priority)
          </h3>
          <span className="text-[11px] text-muted-foreground rounded bg-background/60 px-2 py-0.5 ml-1">
            {openTradesCount} active
          </span>
          <span className="text-[11px] text-muted-foreground rounded bg-background/60 px-2 py-0.5 hidden sm:inline-flex items-center gap-1">
            <PlayCircle className="h-3 w-3" /> {focusMode === 'execution' ? 'Execution mode' : 'Analysis mode'}
          </span>
        </div>

        <OpenPositions
          initialTrades={initialOpenTrades}
          userId={userId}
          onClose={refreshAll}
        />
      </div>

      {/* Monitoring boards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        {focusMode === 'execution' ? (
          <>
            <div className="h-[520px] min-h-0">
              <SignalFeed userId={userId} initialSignals={signals} />
            </div>

            <div className="h-[520px] min-h-0">
              <ActivityLog userId={userId} />
            </div>
          </>
        ) : (
          <>
            <div className="h-[560px] min-h-0">
              <ActivityLog userId={userId} />
            </div>

            <TradeHistory trades={closedTrades} />
          </>
        )}
      </div>

      {focusMode === 'execution' && <TradeHistory trades={closedTrades} />}
    </div>
  )
}
