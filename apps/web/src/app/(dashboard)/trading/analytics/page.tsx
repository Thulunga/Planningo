import Link from 'next/link'
import { ArrowLeft, TrendingUp, TrendingDown, Activity, BarChart2 } from 'lucide-react'
import { getTradeAnalytics } from '@/lib/actions/trading'
import { EquityCurveChart } from '@/components/trading/analytics/equity-curve-chart'
import { WinRateBreakdown } from '@/components/trading/analytics/win-rate-breakdown'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Trading Analytics - Planningo',
}

function StatCard({
  label, value, sub, positive,
}: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${
        positive === true  ? 'text-green-500'
        : positive === false ? 'text-red-500'
        : ''
      }`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function TradingAnalyticsPage() {
  const result = await getTradeAnalytics()

  if (result.error) {
    return (
      <div className="space-y-4">
        <BackLink />
        <p className="text-sm text-destructive">Error loading analytics: {result.error}</p>
      </div>
    )
  }

  const { metrics, equityCurve, breakdowns, sessionBreakdown, tradeCount } = result.data!

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BackLink />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trading Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Paper trading performance · {tradeCount} closed trade{tradeCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {!metrics || tradeCount === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Activity className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No closed trades yet - analytics will appear here once trades complete.</p>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Total Return"
              value={`${metrics.totalReturn >= 0 ? '+' : ''}${metrics.totalReturn.toFixed(2)}%`}
              sub={`₹${metrics.totalReturnAbs >= 0 ? '+' : ''}${metrics.totalReturnAbs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              positive={metrics.totalReturn >= 0}
            />
            <StatCard
              label="Win Rate"
              value={`${metrics.winRate.toFixed(1)}%`}
              sub={`${metrics.winningTrades}W / ${metrics.losingTrades}L`}
              positive={metrics.winRate >= 50}
            />
            <StatCard
              label="Profit Factor"
              value={metrics.profitFactor === Infinity ? '∞' : metrics.profitFactor.toFixed(2)}
              sub="gross profit / gross loss"
              positive={metrics.profitFactor > 1}
            />
            <StatCard
              label="Max Drawdown"
              value={`${metrics.maxDrawdown.toFixed(2)}%`}
              sub={`₹${metrics.maxDrawdownAbs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              positive={metrics.maxDrawdown > -10}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Avg Win"  value={`+₹${metrics.averageWin.toFixed(0)}`}  positive={true} />
            <StatCard label="Avg Loss" value={`₹${metrics.averageLoss.toFixed(0)}`}   positive={false} />
            <StatCard
              label="Sharpe Ratio"
              value={metrics.sharpeRatio !== null ? metrics.sharpeRatio.toFixed(2) : 'N/A'}
              sub={metrics.sharpeRatio === null ? 'Need ≥10 trades' : undefined}
            />
            <StatCard
              label="Avg Duration"
              value={`${metrics.averageDurationMinutes}m`}
              sub="per trade"
            />
          </div>

          {/* Equity curve */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-4">
              {metrics.totalReturn >= 0
                ? <TrendingUp className="h-4 w-4 text-green-500" />
                : <TrendingDown className="h-4 w-4 text-red-500" />
              }
              <h2 className="font-semibold text-sm">Equity Curve</h2>
              <span className="text-xs text-muted-foreground">₹1,00,000 starting capital</span>
            </div>
            <EquityCurveChart data={equityCurve} initialCapital={100_000} />
          </div>

          {/* Win-rate breakdowns */}
          {breakdowns && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">Win Rate by Setup Quality</h2>
              </div>
              <WinRateBreakdown breakdowns={breakdowns} sessionBreakdown={sessionBreakdown ?? {}} />
            </div>
          )}

          {/* Best / worst trade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <StatCard label="Best Trade"  value={`+₹${metrics.bestTrade.toFixed(0)}`}   positive={true} />
            <StatCard label="Worst Trade" value={`₹${metrics.worstTrade.toFixed(0)}`}  positive={false} />
          </div>
        </>
      )}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/trading"
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to Trading
    </Link>
  )
}
