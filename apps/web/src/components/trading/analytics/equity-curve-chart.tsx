'use client'

import type { EquityPoint } from '@planningo/trading-core'

interface Props {
  data: EquityPoint[]
  initialCapital: number
}

export function EquityCurveChart({ data, initialCapital }: Props) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Not enough trades to draw equity curve
      </div>
    )
  }

  const W = 800
  const H = 220
  const PAD = { top: 16, right: 16, bottom: 32, left: 64 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const equities = data.map((p) => p.equity)
  const minEq    = Math.min(...equities) * 0.998
  const maxEq    = Math.max(...equities) * 1.002

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * chartW
  const yScale = (v: number) => PAD.top + chartH - ((v - minEq) / (maxEq - minEq)) * chartH

  const baselineY = yScale(initialCapital)

  // Build polyline points
  const pts = data.map((p, i) => `${xScale(i).toFixed(1)},${yScale(p.equity).toFixed(1)}`).join(' ')

  // Area fill path (close down to baseline then back)
  const area = [
    `M ${xScale(0).toFixed(1)},${yScale(data[0]!.equity).toFixed(1)}`,
    ...data.slice(1).map((p, i) => `L ${xScale(i + 1).toFixed(1)},${yScale(p.equity).toFixed(1)}`),
    `L ${xScale(data.length - 1).toFixed(1)},${baselineY.toFixed(1)}`,
    `L ${xScale(0).toFixed(1)},${baselineY.toFixed(1)}`,
    'Z',
  ].join(' ')

  // Y-axis ticks (5 labels)
  const ticks = 5
  const yTicks = Array.from({ length: ticks }, (_, i) => {
    const v = minEq + (i / (ticks - 1)) * (maxEq - minEq)
    return { v, y: yScale(v) }
  })

  // X-axis date labels (show ~4 evenly spaced)
  const xLabels = [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1]
    .filter((i, idx, arr) => arr.indexOf(i) === idx)
    .map((i) => ({ i, x: xScale(i), label: data[i]!.time.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) }))

  const finalEquity = data[data.length - 1]!.equity
  const isProfit    = finalEquity >= initialCapital

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 320 }}
        aria-label="Equity curve chart"
      >
        {/* Baseline (initial capital) */}
        <line
          x1={PAD.left} y1={baselineY}
          x2={W - PAD.right} y2={baselineY}
          stroke="currentColor" strokeOpacity={0.15} strokeDasharray="4 4"
        />

        {/* Area fill */}
        <path d={area} fill={isProfit ? '#22c55e' : '#ef4444'} fillOpacity={0.08} />

        {/* Equity line */}
        <polyline
          points={pts}
          fill="none"
          stroke={isProfit ? '#22c55e' : '#ef4444'}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Y-axis ticks + labels */}
        {yTicks.map(({ v, y }) => (
          <g key={v}>
            <line x1={PAD.left - 4} y1={y} x2={PAD.left} y2={y} stroke="currentColor" strokeOpacity={0.3} />
            <text x={PAD.left - 8} y={y} textAnchor="end" dominantBaseline="middle"
              fontSize={10} fill="currentColor" fillOpacity={0.6}>
              {v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v.toFixed(0)}`}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {xLabels.map(({ x, label }) => (
          <text key={label} x={x} y={H - 6} textAnchor="middle"
            fontSize={10} fill="currentColor" fillOpacity={0.6}>
            {label}
          </text>
        ))}

        {/* Final value label */}
        {data.length > 1 && (() => {
          const last = data[data.length - 1]!
          const lx   = xScale(data.length - 1)
          const ly   = yScale(last.equity)
          return (
            <text x={lx - 4} y={ly - 8} textAnchor="end"
              fontSize={11} fontWeight="600"
              fill={isProfit ? '#22c55e' : '#ef4444'}>
              ₹{last.equity.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </text>
          )
        })()}
      </svg>
    </div>
  )
}
