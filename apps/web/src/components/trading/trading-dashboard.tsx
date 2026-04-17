'use client'

import { useState, useTransition } from 'react'
import { BarChart2 } from 'lucide-react'
import { MarketStatusBanner } from './market-status-banner'
import { PortfolioSummary } from './portfolio-summary'
import { SignalFeed } from './signal-feed'
import { WatchlistPanel } from './watchlist-panel'
import { CandlestickChart } from './candlestick-chart'
import { OpenPositions } from './open-positions'
import { TradeHistory } from './trade-history'
import { EngineStatus } from './engine-status'
import { ActivityLog } from './activity-log'

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
  portfolio: initialPortfolio,
  watchlist: initialWatchlist,
  signals,
  openTrades: initialOpenTrades,
  closedTrades,
}: TradingDashboardProps) {
  const [portfolio, setPortfolio] = useState(initialPortfolio)
  const [watchlist, setWatchlist] = useState(initialWatchlist)
  const [openTrades, setOpenTrades] = useState(initialOpenTrades)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(
    initialWatchlist[0]?.symbol ?? null
  )
  const [, startTransition] = useTransition()

  function refreshAll() {
    window.location.reload()
  }

  void startTransition
  void setPortfolio
  void setWatchlist
  void setOpenTrades

  return (
    <div className="space-y-4">
      {/* Market status banner */}
      <MarketStatusBanner />

      {/* Engine status + top stats row */}
      <EngineStatus />

      {/* Portfolio + Signal Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        <PortfolioSummary portfolio={portfolio} onRefresh={refreshAll} />
        <div className="min-h-[320px]">
          <SignalFeed userId={userId} initialSignals={signals} />
        </div>
      </div>

      {/* Watchlist */}
      <WatchlistPanel
        watchlist={watchlist}
        onRefresh={refreshAll}
        onSymbolSelect={setSelectedSymbol}
        selectedSymbol={selectedSymbol}
      />

      {/* Chart */}
      {selectedSymbol && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold text-sm">
              {selectedSymbol.replace('.NS', '').replace('.BO', '')} — 5-min Candlestick
            </h2>
            <span className="text-xs text-muted-foreground">NSE · Intraday</span>
          </div>
          <CandlestickChart symbol={selectedSymbol} />
        </div>
      )}

      {/* Open Positions */}
      <OpenPositions trades={openTrades} onClose={refreshAll} />

      {/* Activity Log — live per-stock scan breakdown */}
      <ActivityLog userId={userId} />

      {/* Trade History */}
      <TradeHistory trades={closedTrades} />
    </div>
  )
}
