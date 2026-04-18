'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown, Download, Trash2 } from 'lucide-react'
import { deleteBacktestRun, getBacktestRun } from '@/lib/actions/backtest'
import { exportBacktestGzip } from '@/lib/trading/export-backtest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RunRow = Record<string, any>

interface Props {
  runs: RunRow[]
  onSelect: (runId: string) => void
  onDelete: (runId: string) => void
  selectedRunId?: string
}

export function BacktestHistory({ runs, onSelect, onDelete, selectedRunId }: Props) {
  const [confirmingId,  setConfirmingId]  = useState<string | null>(null)
  const [exportingId,   setExportingId]   = useState<string | null>(null)
  const [isPending,     startTransition]  = useTransition()

  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No past runs yet — run your first backtest above.
      </p>
    )
  }

  function handleDelete(e: React.MouseEvent, runId: string) {
    e.stopPropagation()
    if (confirmingId !== runId) {
      setConfirmingId(runId)
      return
    }
    setConfirmingId(null)
    startTransition(async () => {
      await deleteBacktestRun(runId)
      onDelete(runId)
    })
  }

  async function handleExport(e: React.MouseEvent, run: RunRow) {
    e.stopPropagation()
    setExportingId(run.id)
    try {
      const res = await getBacktestRun(run.id)
      if (!res.data) return

      const { run: fullRun, trades } = res.data
      const symbol = (fullRun.symbol as string).replace(/[^A-Z0-9]/gi, '-')
      const date   = (fullRun.start_date as string).substring(0, 10)

      await exportBacktestGzip(
        {
          exportVersion: 1,
          exportedAt:   new Date().toISOString(),
          run: {
            id:             fullRun.id,
            symbol:         fullRun.symbol,
            startDate:      fullRun.start_date,
            endDate:        fullRun.end_date,
            initialCapital: fullRun.initial_capital,
            config:         fullRun.config,
            status:         fullRun.status,
            metrics:        fullRun.metrics,
            totalCandles:   fullRun.total_candles,
            createdAt:      fullRun.created_at,
            completedAt:    fullRun.completed_at ?? null,
            errorMessage:   fullRun.error_message ?? null,
          },
          trades: trades.map((t: RunRow) => ({
            id:              t.id,
            symbol:          t.symbol,
            side:            t.side ?? 'LONG',
            entryTime:       t.entry_time,
            entryPrice:      t.entry_price,
            exitTime:        t.exit_time,
            exitPrice:       t.exit_price,
            quantity:        t.quantity,
            stopLoss:        t.stop_loss,
            target:          t.target,
            pnl:             t.pnl,
            pnlPct:          t.pnl_pct,
            rMultiple:       t.r_multiple,
            status:          t.status,
            exitReason:      t.exit_reason,
            mae:             t.mae,
            mfe:             t.mfe,
            durationMinutes: t.duration_minutes,
            confluenceScore: t.confluence_score,
            signalStrength:  t.signal_strength,
            riskAmount:      t.risk_amount,
            chargesTotal:    t.charges_total,
          })),
          equityCurve: ((fullRun.equity_curve ?? []) as RunRow[]).map((p) => ({
            time:        p.time as string,
            equity:      p.equity as number,
            drawdown:    p.drawdown as number,
            drawdownAbs: p.drawdownAbs as number,
          })),
        },
        `backtest-${symbol}-${date}.json.gz`,
      )
    } finally {
      setExportingId(null)
    }
  }

  return (
    <div className="space-y-1.5">
      {runs.map((run) => {
        const m          = run.metrics as Record<string, number> | null
        const isProfit   = (m?.totalReturn ?? 0) >= 0
        const isSelected = run.id === selectedRunId
        const isConfirm  = confirmingId === run.id
        const isExporting = exportingId === run.id

        return (
          <div
            key={run.id}
            onClick={() => { setConfirmingId(null); onSelect(run.id) }}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors cursor-pointer ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              {/* Left: icon + symbol + dates */}
              <div className="flex items-center gap-2 min-w-0">
                {run.status === 'COMPLETED' ? (
                  isProfit
                    ? <TrendingUp  className="h-4 w-4 text-green-500 shrink-0" />
                    : <TrendingDown className="h-4 w-4 text-red-500 shrink-0" />
                ) : run.status === 'FAILED' ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 animate-pulse" />
                )}
                <span className="font-medium text-sm truncate">{run.symbol}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {run.start_date} – {run.end_date}
                </span>
              </div>

              {/* Right: metrics + action buttons */}
              <div className="flex items-center gap-3 shrink-0">
                {m && run.status === 'COMPLETED' && (
                  <>
                    <span className={`text-sm font-medium tabular-nums ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                      {isProfit ? '+' : ''}{m.totalReturn?.toFixed(2)}%
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      WR {m.winRate?.toFixed(0)}%
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {m.totalTrades} trades
                    </span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  </>
                )}
                {run.status === 'FAILED' && (
                  <span className="text-xs text-destructive truncate max-w-[200px]">{run.error_message}</span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>

                {/* Export button (completed only) */}
                {run.status === 'COMPLETED' && (
                  <button
                    onClick={(e) => handleExport(e, run)}
                    disabled={isExporting}
                    title="Export run data (gzip JSON)"
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Delete button with inline confirm */}
                {isConfirm ? (
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDelete(e, run.id)}
                      disabled={isPending}
                      className="rounded px-2 py-0.5 text-[10px] font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                    >
                      Delete
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmingId(null) }}
                      className="rounded px-2 py-0.5 text-[10px] font-medium bg-muted text-muted-foreground hover:bg-muted/70"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={(e) => handleDelete(e, run.id)}
                    title="Delete this run"
                    className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
