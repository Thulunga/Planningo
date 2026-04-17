'use client'

import { Fragment, useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, X, Loader2, Radio } from 'lucide-react'
import { Button } from '@planningo/ui'
import { cn } from '@planningo/ui'
import { toast } from 'sonner'
import { getSupabaseClient } from '@/lib/supabase/client'

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
  initialTrades: PaperTrade[]
  userId: string
  onClose?: () => void
}

function formatINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
}

function pnl(trade: PaperTrade, ltp: number): number {
  return trade.trade_type === 'BUY'
    ? (ltp - trade.entry_price) * trade.quantity
    : (trade.entry_price - ltp) * trade.quantity
}

export function OpenPositions({ initialTrades, userId, onClose }: OpenPositionsProps) {
  const [trades, setTrades] = useState<PaperTrade[]>(initialTrades)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})
  const [pricesLoading, setPricesLoading] = useState(false)
  const [closingTrade, setClosingTrade] = useState<{ id: string; price: string } | null>(null)
  const [closingId, setClosingId] = useState<string | null>(null)

  // ── Realtime: keep trade list in sync ─────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel('open_positions_rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'paper_trades', filter: `user_id=eq.${userId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const t = payload.new as PaperTrade
            if (t.status === 'OPEN') setTrades((prev) => [t, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const t = payload.new as PaperTrade
            if (t.status === 'OPEN') {
              setTrades((prev) => prev.map((x) => (x.id === t.id ? t : x)))
            } else {
              // Closed / stopped out — remove from open list
              setTrades((prev) => prev.filter((x) => x.id !== t.id))
            }
          } else if (payload.eventType === 'DELETE') {
            setTrades((prev) => prev.filter((x) => x.id !== (payload.old as PaperTrade).id))
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── Live price polling every 30 s ─────────────────────────────────────────
  const fetchLivePrices = useCallback(async () => {
    const symbols = trades.map((t) => t.symbol)
    if (symbols.length === 0) return
    setPricesLoading(true)
    try {
      const res = await fetch('/api/trading/market-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols }),
      })
      const data = await res.json()
      const map: Record<string, number> = {}
      for (const q of data.quotes ?? []) {
        if (q.price) map[q.symbol] = q.price
      }
      setLivePrices(map)
    } catch {
      // silently retry on next interval
    } finally {
      setPricesLoading(false)
    }
  }, [trades.map((t) => t.symbol).join(',')])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchLivePrices()
    const interval = setInterval(fetchLivePrices, 30_000)
    return () => clearInterval(interval)
  }, [fetchLivePrices])

  // ── Close trade ────────────────────────────────────────────────────────────
  function startClose(trade: PaperTrade) {
    const ltp = livePrices[trade.symbol]
    setClosingTrade({ id: trade.id, price: String(ltp ?? trade.entry_price) })
  }

  async function confirmClose() {
    if (!closingTrade) return
    const exitPrice = parseFloat(closingTrade.price)
    if (isNaN(exitPrice) || exitPrice <= 0) {
      toast.error('Invalid price')
      return
    }
    const trade = trades.find((t) => t.id === closingTrade.id)
    if (!trade) return

    setClosingId(closingTrade.id)
    setClosingTrade(null)
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
        const pl = data.pnl ?? 0
        toast.success(`Closed ${trade.symbol} | P&L: ${pl >= 0 ? '+' : ''}${formatINR(pl)}`)
        onClose?.()
      }
    } catch {
      toast.error('Failed to close trade')
    } finally {
      setClosingId(null)
    }
  }

  if (trades.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-4 flex flex-col h-full">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm">Open Positions</h2>
        </div>
        <p className="text-xs text-muted-foreground/70 text-center py-6">
          No open positions.
          <br />
          STRONG / VERY_STRONG signals auto-open trades.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <h2 className="font-semibold text-sm">
            Open Positions
            <span className="ml-1.5 text-muted-foreground font-normal">({trades.length})</span>
          </h2>
        </div>
        {pricesLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/50" />
        ) : (
          Object.keys(livePrices).length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-500">
              <Radio className="h-3 w-3" /> Live
            </span>
          )
        )}
      </div>

      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Symbol</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Entry</th>
              <th className="px-3 py-2 text-right font-medium">LTP</th>
              <th className="px-3 py-2 text-right font-medium">P&L</th>
              <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">SL</th>
              <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Target</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {trades.map((trade) => {
              const ltp = livePrices[trade.symbol]
              const pl = ltp != null ? pnl(trade, ltp) : null
              const plPct = ltp != null
                ? ((ltp - trade.entry_price) / trade.entry_price) *
                  (trade.trade_type === 'BUY' ? 100 : -100)
                : null

              return (
                <Fragment key={trade.id}>
                  <tr
                    className={cn(
                      'hover:bg-muted/20 transition-colors',
                      closingTrade?.id === trade.id && 'bg-muted/30'
                    )}
                  >
                    {/* Symbol */}
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            'h-5 w-5 rounded flex items-center justify-center shrink-0',
                            trade.trade_type === 'BUY' ? 'bg-emerald-500/15' : 'bg-red-500/15'
                          )}
                        >
                          {trade.trade_type === 'BUY'
                            ? <TrendingUp className="h-3 w-3 text-emerald-500" />
                            : <TrendingDown className="h-3 w-3 text-red-500" />}
                        </div>
                        <div>
                          <div className="font-semibold text-xs leading-tight">
                            {trade.symbol.replace('.NS', '').replace('.BO', '')}
                          </div>
                          <div className="text-[10px] text-muted-foreground">{trade.trade_type}</div>
                        </div>
                      </div>
                    </td>

                    {/* Qty */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">{trade.quantity}</td>

                    {/* Entry */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs font-medium">
                      {formatINR(trade.entry_price)}
                    </td>

                    {/* LTP */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {ltp != null ? (
                        <span className="font-semibold">{formatINR(ltp)}</span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* P&L */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs">
                      {pl != null ? (
                        <div className={cn('font-bold', pl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                          {pl >= 0 ? '+' : ''}{formatINR(pl)}
                          {plPct != null && (
                            <div className="text-[10px] font-normal opacity-70">
                              {plPct >= 0 ? '+' : ''}{plPct.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>

                    {/* SL */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-red-500/80 hidden sm:table-cell">
                      {trade.stop_loss ? formatINR(trade.stop_loss) : '—'}
                    </td>

                    {/* Target */}
                    <td className="px-3 py-2.5 text-right tabular-nums text-xs text-emerald-500/80 hidden sm:table-cell">
                      {trade.target ? formatINR(trade.target) : '—'}
                    </td>

                    {/* Close button */}
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => startClose(trade)}
                        disabled={closingId === trade.id}
                        title="Close position"
                      >
                        {closingId === trade.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <X className="h-3 w-3" />}
                      </Button>
                    </td>
                  </tr>

                  {/* Inline close confirm row */}
                  {closingTrade?.id === trade.id && (
                    <tr className="bg-muted/40 border-b border-border/40">
                      <td colSpan={8} className="px-3 py-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">Close at</span>
                          <span className="text-muted-foreground shrink-0">₹</span>
                          <input
                            type="number"
                            step="0.05"
                            min="0"
                            value={closingTrade.price}
                            onChange={(e) => setClosingTrade({ ...closingTrade, price: e.target.value })}
                            className="w-28 bg-background border border-border rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <Button size="sm" className="h-6 text-xs px-3" onClick={confirmClose}>
                            Confirm
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={() => setClosingTrade(null)}
                          >
                            Cancel
                          </Button>
                          {ltp != null && (
                            <span className="text-muted-foreground/60 hidden sm:inline">
                              Live price: {formatINR(ltp)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
