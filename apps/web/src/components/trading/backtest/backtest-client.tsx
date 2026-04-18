'use client'

import { useState } from 'react'
import type { BacktestResult } from '@planningo/trading-core'
import { BacktestForm } from './backtest-form'
import type { WatchlistItem } from './backtest-form'
import { BacktestResults } from './backtest-results'
import { BacktestHistory } from './backtest-history'
import { getBacktestRun } from '@/lib/actions/backtest'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RunRow = Record<string, any>

interface ActiveResult {
  runId: string
  result: BacktestResult
  interval: string
  warning?: string
  candleCount: number
}

interface Props {
  initialHistory: RunRow[]
  watchlist: WatchlistItem[]
}

export function BacktestClient({ initialHistory, watchlist }: Props) {
  const [history,       setHistory]       = useState<RunRow[]>(initialHistory)
  const [activeResult,  setActiveResult]  = useState<ActiveResult | null>(null)
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>()

  function onNewResult(data: {
    runId: string
    result: BacktestResult
    interval: string
    warning?: string
    candleCount: number
  }) {
    setActiveResult(data)
    setSelectedRunId(data.runId)
    const m = data.result.metrics
    setHistory((prev) => [{
      id:         data.runId,
      symbol:     data.result.config.symbol,
      start_date: data.result.config.startDate.toISOString().substring(0, 10),
      end_date:   data.result.config.endDate.toISOString().substring(0, 10),
      status:     'COMPLETED',
      metrics:    m,
      created_at: new Date().toISOString(),
    }, ...prev])
  }

  async function onSelectHistory(runId: string) {
    if (runId === selectedRunId) return
    setSelectedRunId(runId)

    const res = await getBacktestRun(runId)
    if (!res.data) return

    const { run } = res.data
    if (run.status !== 'COMPLETED' || !run.metrics || !run.equity_curve) return

    const reconstructed: BacktestResult = {
      runId,
      config: {
        symbol:         run.symbol,
        startDate:      new Date(run.start_date),
        endDate:        new Date(run.end_date),
        initialCapital: run.initial_capital,
        ...(run.config ?? {}),
      },
      trades: res.data.trades.map((t: RunRow) => ({
        id:              t.id,
        symbol:          t.symbol,
        side:            (t.side ?? 'LONG') as 'LONG' | 'SHORT',
        entryTime:       new Date(t.entry_time),
        entryPrice:      t.entry_price,
        exitTime:        t.exit_time ? new Date(t.exit_time) : undefined,
        exitPrice:       t.exit_price ?? undefined,
        quantity:        t.quantity,
        stopLoss:        t.stop_loss ?? 0,
        target:          t.target ?? 0,
        pnl:             t.pnl ?? undefined,
        pnlPct:          t.pnl_pct ?? undefined,
        rMultiple:       t.r_multiple ?? undefined,
        status:          t.status,
        exitReason:      t.exit_reason ?? undefined,
        mae:             t.mae ?? undefined,
        mfe:             t.mfe ?? undefined,
        durationMinutes: t.duration_minutes ?? undefined,
        confluenceScore: t.confluence_score ?? undefined,
        signalStrength:  t.signal_strength ?? undefined,
        riskAmount:      t.risk_amount ?? undefined,
        chargesTotal:    t.charges_total ?? undefined,
      })),
      metrics:     run.metrics,
      equityCurve: (run.equity_curve as RunRow[]).map((p) => ({
        time:        new Date(p.time as string),
        equity:      p.equity      as number,
        drawdown:    p.drawdown    as number,
        drawdownAbs: p.drawdownAbs as number,
      })),
      totalCandles: run.total_candles ?? 0,
      startedAt:    new Date(run.created_at),
      completedAt:  run.completed_at ? new Date(run.completed_at) : new Date(),
    }

    setActiveResult({
      runId,
      result:      reconstructed,
      interval:    '5m',
      candleCount: run.total_candles ?? 0,
    })
  }

  function onDelete(runId: string) {
    setHistory((prev) => prev.filter((r) => r.id !== runId))
    if (selectedRunId === runId) {
      setSelectedRunId(undefined)
      setActiveResult(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold text-sm mb-4">Configure Backtest</h2>
        <BacktestForm onResult={onNewResult} watchlist={watchlist} />
      </div>

      {/* Results */}
      {activeResult && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4">Results</h2>
          <BacktestResults {...activeResult} />
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-3">
            Past Runs
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              click to reload results
            </span>
          </h2>
          <BacktestHistory
            runs={history}
            onSelect={onSelectHistory}
            onDelete={onDelete}
            selectedRunId={selectedRunId}
          />
        </div>
      )}
    </div>
  )
}
