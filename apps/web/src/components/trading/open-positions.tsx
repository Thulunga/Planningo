'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, X, Loader2 } from 'lucide-react'
import { Button } from '@planningo/ui'
import { cn } from '@planningo/ui'
import { toast } from 'sonner'

interface PaperTrade {
  id: string
  symbol: string
  trade_type: string
  quantity: number
  entry_price: number
  stop_loss: number | null
  target: number | null
  entry_time: string
  status: string
}

interface OpenPositionsProps {
  trades: PaperTrade[]
  onClose: () => void
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

export function OpenPositions({ trades, onClose }: OpenPositionsProps) {
  const [closingId, setClosingId] = useState<string | null>(null)

  async function handleManualClose(trade: PaperTrade) {
    const priceStr = window.prompt(`Enter exit price for ${trade.symbol}:`, String(trade.entry_price))
    if (!priceStr) return
    const exitPrice = parseFloat(priceStr)
    if (isNaN(exitPrice) || exitPrice <= 0) {
      toast.error('Invalid price')
      return
    }

    setClosingId(trade.id)
    try {
      const res = await fetch('/api/trading/paper-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tradeId: trade.id, exitPrice }),
      })
      const data = await res.json()
      if (data.error) {
        toast.error(data.error)
      } else {
        const pnl = data.pnl ?? 0
        toast.success(`Closed ${trade.symbol} | P&L: ${pnl >= 0 ? '+' : ''}${formatINR(pnl)}`)
        onClose()
      }
    } catch {
      toast.error('Failed to close trade')
    } finally {
      setClosingId(null)
    }
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide mb-4">
          Open Positions
        </h2>
        <p className="text-sm text-muted-foreground text-center py-4">
          No open positions. Signals with STRONG/VERY_STRONG strength auto-open trades.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Open Positions <span className="ml-1 text-foreground">({trades.length})</span>
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="px-4 py-2 text-left font-medium">Symbol</th>
              <th className="px-4 py-2 text-right font-medium">Qty</th>
              <th className="px-4 py-2 text-right font-medium">Entry</th>
              <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Stop Loss</th>
              <th className="px-4 py-2 text-right font-medium hidden sm:table-cell">Target</th>
              <th className="px-4 py-2 text-right font-medium">Invested</th>
              <th className="px-4 py-2 text-right font-medium hidden md:table-cell">Time</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {trades.map((trade) => {
              const invested = trade.quantity * trade.entry_price

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
                      <div>
                        <div className="font-semibold">
                          {trade.symbol.replace('.NS', '').replace('.BO', '')}
                        </div>
                        <div className="text-xs text-muted-foreground">{trade.trade_type}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{trade.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {formatINR(trade.entry_price)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-red-500 hidden sm:table-cell">
                    {trade.stop_loss ? formatINR(trade.stop_loss) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-emerald-500 hidden sm:table-cell">
                    {trade.target ? formatINR(trade.target) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                    {formatINR(invested)}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground hidden md:table-cell">
                    {new Date(trade.entry_time).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleManualClose(trade)}
                      disabled={closingId === trade.id}
                      title="Close position"
                    >
                      {closingId === trade.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                    </Button>
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
