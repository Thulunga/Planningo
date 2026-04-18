'use client'

import type { TradeBreakdown } from '@planningo/trading-core'

interface BarProps {
  label: string
  winRate: number
  count: number
}

function Bar({ label, winRate, count }: BarProps) {
  const pct   = Math.round(winRate)
  const color = pct >= 60 ? 'bg-green-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-red-500'
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 text-xs text-right text-muted-foreground truncate">{label}</div>
      <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
        <div className={`h-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <div className="w-20 shrink-0 text-xs tabular-nums">
        <span className="font-medium">{pct}%</span>
        <span className="text-muted-foreground ml-1">({count})</span>
      </div>
    </div>
  )
}

function Section({
  title,
  data,
}: {
  title: string
  data: Record<string, { wins: number; total: number; rate: number }>
}) {
  const items = Object.entries(data)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => b[1].total - a[1].total)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(([key, val]) => (
            <Bar key={key} label={key} winRate={val.rate} count={val.total} />
          ))}
        </div>
      )}
    </div>
  )
}

interface Props {
  breakdowns: TradeBreakdown
  sessionBreakdown: Record<string, { wins: number; total: number; rate: number }>
}

export function WinRateBreakdown({ breakdowns, sessionBreakdown }: Props) {
  const byConfluenceStrings: Record<string, { wins: number; total: number; rate: number }> = {}
  for (const [k, v] of Object.entries(breakdowns.winRateByConfluenceScore)) {
    const score = Number(k)
    byConfluenceStrings[score === -1 ? 'Unknown' : `Score ${score}`] = v
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      <Section title="By Signal Strength"   data={breakdowns.winRateByStrength} />
      <Section title="By Confluence Score"  data={byConfluenceStrings} />
      <Section title="By Session"           data={sessionBreakdown} />
    </div>
  )
}
