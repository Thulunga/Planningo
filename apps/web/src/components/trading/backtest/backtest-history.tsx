'use client'

import { CheckCircle2, XCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RunRow = Record<string, any>

interface Props {
  runs: RunRow[]
  onSelect: (runId: string) => void
  selectedRunId?: string
}

export function BacktestHistory({ runs, onSelect, selectedRunId }: Props) {
  if (runs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No past runs yet — run your first backtest above.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      {runs.map((run) => {
        const m         = run.metrics as Record<string, number> | null
        const isProfit  = (m?.totalReturn ?? 0) >= 0
        const isSelected = run.id === selectedRunId

        return (
          <button
            key={run.id}
            onClick={() => onSelect(run.id)}
            className={`w-full text-left rounded-lg border px-4 py-3 transition-colors ${
              isSelected
                ? 'border-primary bg-primary/5'
                : 'border-border hover:bg-muted/30'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                {run.status === 'COMPLETED' ? (
                  isProfit
                    ? <TrendingUp className="h-4 w-4 text-green-500 shrink-0" />
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
                  </>
                )}
                {run.status === 'FAILED' && (
                  <span className="text-xs text-destructive truncate max-w-[200px]">{run.error_message}</span>
                )}
                {run.status === 'COMPLETED' && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
