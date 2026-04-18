'use client'

import type { BacktestResult } from '@planningo/trading-core'
import { EquityCurveChart } from '@/components/trading/analytics/equity-curve-chart'
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react'

interface Props {
  result: BacktestResult
  interval: string
  warning?: string
  candleCount: number
  runId: string
}

function Stat({
  label, value, sub, positive,
}: { label: string; value: string; sub?: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${
        positive === true ? 'text-green-500' : positive === false ? 'text-red-500' : ''
      }`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

export function BacktestResults({ result, interval, warning, candleCount }: Props) {
  const m = result.metrics
  const isProfit = m.totalReturn >= 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        {isProfit
          ? <TrendingUp className="h-5 w-5 text-green-500" />
          : <TrendingDown className="h-5 w-5 text-red-500" />
        }
        <div>
          <p className="font-semibold">
            {result.config.symbol} ·{' '}
            {result.config.startDate.toLocaleDateString('en-IN')} –{' '}
            {result.config.endDate.toLocaleDateString('en-IN')}
          </p>
          <p className="text-xs text-muted-foreground">
            {candleCount.toLocaleString()} {interval} candles · {m.totalTrades} trades ·
            ₹{result.config.initialCapital.toLocaleString('en-IN')} starting capital
          </p>
        </div>
      </div>

      {warning && (
        <div className="flex items-start gap-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-600 dark:text-yellow-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {warning}
        </div>
      )}

      {m.totalTrades === 0 ? (
        <div className="rounded-lg border border-border p-8 text-center text-sm text-muted-foreground">
          No trades were generated in this period. Try lowering the confluence threshold or widening the date range.
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat
              label="Total Return"
              value={`${m.totalReturn >= 0 ? '+' : ''}${m.totalReturn.toFixed(2)}%`}
              sub={`₹${m.totalReturnAbs >= 0 ? '+' : ''}${m.totalReturnAbs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
              positive={m.totalReturn >= 0}
            />
            <Stat
              label="Win Rate"
              value={`${m.winRate.toFixed(1)}%`}
              sub={`${m.winningTrades}W / ${m.losingTrades}L`}
              positive={m.winRate >= 50}
            />
            <Stat
              label="Profit Factor"
              value={m.profitFactor === Infinity ? '∞' : m.profitFactor.toFixed(2)}
              positive={m.profitFactor > 1}
            />
            <Stat
              label="Max Drawdown"
              value={`${m.maxDrawdown.toFixed(2)}%`}
              positive={m.maxDrawdown > -15}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Avg Win"  value={`+₹${m.averageWin.toFixed(0)}`}  positive={true}  />
            <Stat label="Avg Loss" value={`₹${m.averageLoss.toFixed(0)}`}  positive={false} />
            <Stat
              label="Sharpe"
              value={m.sharpeRatio !== null ? m.sharpeRatio.toFixed(2) : 'N/A'}
              sub={m.sharpeRatio === null ? 'need ≥10 trades' : undefined}
            />
            <Stat label="Avg Duration" value={`${m.averageDurationMinutes}m`} />
          </div>

          {/* Equity curve */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Equity Curve</p>
            <EquityCurveChart data={result.equityCurve} initialCapital={result.config.initialCapital} />
          </div>

          {/* Trades table */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Trades ({result.trades.length})
            </p>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Entry', 'Exit', 'Qty', 'Entry ₹', 'Exit ₹', 'P&L', 'R', 'Status'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.trades.map((t) => {
                    const pnlPos = (t.pnl ?? 0) >= 0
                    return (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap text-muted-foreground">
                          {t.entryTime.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}{' '}
                          {t.entryTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums whitespace-nowrap text-muted-foreground">
                          {t.exitTime
                            ? `${t.exitTime.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} ${t.exitTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}`
                            : '—'}
                        </td>
                        <td className="px-3 py-1.5 tabular-nums">{t.quantity}</td>
                        <td className="px-3 py-1.5 tabular-nums">₹{t.entryPrice.toFixed(2)}</td>
                        <td className="px-3 py-1.5 tabular-nums">{t.exitPrice != null ? `₹${t.exitPrice.toFixed(2)}` : '—'}</td>
                        <td className={`px-3 py-1.5 tabular-nums font-medium ${pnlPos ? 'text-green-500' : 'text-red-500'}`}>
                          {t.pnl != null ? `${pnlPos ? '+' : ''}₹${t.pnl.toFixed(0)}` : '—'}
                        </td>
                        <td className={`px-3 py-1.5 tabular-nums ${(t.rMultiple ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {t.rMultiple != null ? `${t.rMultiple.toFixed(2)}R` : '—'}
                        </td>
                        <td className="px-3 py-1.5">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${
                            t.status === 'TARGET_HIT'  ? 'bg-green-500/15 text-green-500'
                            : t.status === 'STOPPED_OUT' ? 'bg-red-500/15 text-red-500'
                            : t.status === 'EOD_CLOSED'  ? 'bg-yellow-500/15 text-yellow-600'
                            : 'bg-muted text-muted-foreground'
                          }`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
