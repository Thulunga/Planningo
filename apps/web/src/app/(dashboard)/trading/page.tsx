import { getUser } from '@/lib/supabase/server'
import {
  getPortfolio,
  getWatchlist,
  getRecentSignals,
  getOpenPositions,
  getTradeHistory,
} from '@/lib/actions/trading'
import { TradingDashboard } from '@/components/trading/trading-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Trading Bot — Planningo',
}

export default async function TradingPage() {
  const user = await getUser()

  const [portfolioResult, watchlistResult, signalsResult, openResult, historyResult] =
    await Promise.all([
      getPortfolio(),
      getWatchlist(),
      getRecentSignals(50),
      getOpenPositions(),
      getTradeHistory(30),
    ])

  const portfolio = portfolioResult.data ?? {
    virtual_capital: 100000,
    available_cash: 100000,
    total_pnl: 0,
    total_trades: 0,
    winning_trades: 0,
  }

  return (
    <div className="space-y-2">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Trading Bot</h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          NSE intraday · 5-min signals · Paper trading · ₹1,00,000 virtual capital
        </p>
      </div>

      <TradingDashboard
        userId={user!.id}
        portfolio={portfolio}
        watchlist={watchlistResult.data ?? []}
        signals={(signalsResult.data ?? []) as any}
        openTrades={(openResult.data ?? []) as any}
        closedTrades={(historyResult.data ?? []) as any}
      />
    </div>
  )
}
