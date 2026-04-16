'use client'

import { TrendingUp, TrendingDown, CheckCircle2, StopCircle } from 'lucide-react'
import { cn } from '@planningo/ui'

interface PaperTrade {
  id: string
  symbol: string
  trade_type: string
  quantity: number
  entry_price: number
  exit_price: number | null
  pnl: number | null
  status: string
  entry_time: string
  exit_time: string | null
}

interface TradeHistoryProps {
  trades: PaperTrade[]
}

function formatINR(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function TradeHistory({ trades }: TradeHistoryProps) {
  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
          Trade History
        </h2>
        <p className="text-sm text-muted-foreground text-center py-4">
          No closed trades yet. Paper trades are auto-executed on STRONG signals.
        </p>
      </div>
    )
  }

  const totalPnl = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  const winners = trades.filter((t) => (t.pnl ?? 0) > 0).length

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Trade History <span className="ml-1 text-foreground">({trades.length})</span>
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground text-xs">
            {winners}W / {trades.length - winners}L
          </span>
          <span
            className={cn(
              'font-semibold tabular-nums text-sm',
              totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'
            )}
          >
            {totalPnl >= 0 ? '+' : '-'}{formatINR(totalPnl)}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Symbol</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Entry</th>
              <th className="px-4 py-2 text-right font-medium">Exit</th>
              <th className="px-4 py-2 text-right font-medium">P&L</th>
              <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Status</th>
              <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {trades.map((trade) => {
              const pnl = trade.pnl ?? 0
              const isWin = pnl > 0
              const isStopped = trade.status === 'STOPPED_OUT'

              return (
                <tr key={trade.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'h-6 w-6 rounded flex items-center justify-center',
                          trade.trade_type === 'BUY' ? 'bg-emerald-500/15' : 'bg-red-500/15'
                        )}
                      >
                        {trade.trade_type === 'BUY' ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </div>
                      <span className="font-semibold">
                        {trade.symbol.replace('.NS', '').replace('.BO', '')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {trade.quantity}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatINR(trade.entry_price)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {trade.exit_price ? formatINR(trade.exit_price) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    <span className={isWin ? 'text-emerald-500' : 'text-red-500'}>
                      {pnl >= 0 ? '+' : '-'}{formatINR(pnl)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right hidden md:table-cell">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                        isWin
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          : isStopped
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                      )}
                    >
                      {isStopped ? (
                        <StopCircle className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {isStopped ? 'Stopped' : isWin ? 'Win' : 'Loss'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">
                    {trade.exit_time
                      ? new Date(trade.exit_time).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                        })
                      : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
