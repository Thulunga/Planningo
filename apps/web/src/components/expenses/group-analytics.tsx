'use client'

import { useState, useRef, useId } from 'react'
import { format, parseISO, startOfWeek } from 'date-fns'
import { ArrowRight } from 'lucide-react'
import { EXPENSE_CATEGORIES, CHART_COLORS, CATEGORY_GROUP_COLORS } from './expense-form-dialog'

interface Member {
  user_id: string
  profiles: { full_name: string | null; email: string; avatar_url: string | null } | null
}

function mName(m: Member) {
  return m.profiles?.full_name ?? m.profiles?.email?.split('@')[0] ?? 'Member'
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────
interface TipState { x: number; y: number; lines: { label: string; value?: string; color?: string }[] }

function ChartTooltip({ data }: { data: TipState | null }) {
  if (!data) return null
  return (
    <div
      className="pointer-events-none fixed z-[999] min-w-[130px] max-w-[200px] rounded-xl border border-white/10 bg-zinc-900/97 backdrop-blur px-3 py-2.5 shadow-2xl"
      style={{ left: data.x + 14, top: data.y, transform: 'translateY(-50%)' }}
    >
      {data.lines.map((l, i) => (
        <div key={i} className={`flex items-center gap-2 ${i < data.lines.length - 1 ? 'mb-1' : ''}`}>
          {l.color && <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />}
          <span className={`text-xs ${i === 0 ? 'font-semibold text-white' : 'text-zinc-400'}`}>{l.label}</span>
          {l.value && <span className="ml-auto pl-3 text-xs font-bold text-white tabular-nums">{l.value}</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Spending Timeline ────────────────────────────────────────────────────────
function SpendingTimeline({ expenses, currency }: { expenses: any[]; currency: string }) {
  const chartId = useId().replaceAll(':', '')
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!expenses.length) return null

  const dateTotals: Record<string, { amount: number; count: number }> = {}
  expenses.forEach((e) => {
    const key = (e.expense_date ?? '').split('T')[0]
    if (!key) return
    dateTotals[key] = dateTotals[key] ?? { amount: 0, count: 0 }
    dateTotals[key].amount += e.amount
    dateTotals[key].count += 1
  })

  const entries = Object.entries(dateTotals).sort(([a], [b]) => a.localeCompare(b))
  let bars: { key: string; label: string; amount: number; count: number }[]
  if (entries.length > 14) {
    const wk: Record<string, { amount: number; count: number }> = {}
    entries.forEach(([date, data]) => {
      const ws = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      wk[ws] = wk[ws] ?? { amount: 0, count: 0 }
      wk[ws].amount += data.amount
      wk[ws].count += data.count
    })
    bars = Object.entries(wk).sort(([a], [b]) => a.localeCompare(b)).map(([key, d]) => ({ key, label: format(parseISO(key), 'MMM d'), amount: d.amount, count: d.count }))
  } else {
    bars = entries.map(([key, d]) => ({ key, label: format(parseISO(key), 'MMM d'), amount: d.amount, count: d.count }))
  }

  const maxAmt = Math.max(...bars.map((b) => b.amount), 0.01)
  const minAmt = Math.min(...bars.map((b) => b.amount), maxAmt)
  const total = bars.reduce((s, b) => s + b.amount, 0)
  const avg = total / bars.length
  const firstAmount = bars[0]?.amount ?? 0
  const lastAmount = bars.at(-1)?.amount ?? 0
  const trendPct = firstAmount > 0 ? ((lastAmount - firstAmount) / firstAmount) * 100 : 0
  const volatility = Math.sqrt(
    bars.reduce((s, b) => s + Math.pow(b.amount - avg, 2), 0) / Math.max(1, bars.length)
  )

  const W = 360; const H = 145; const LABEL_H = 24; const LEFT = 38; const TOP = 10
  const chartW = W - LEFT
  const n = bars.length
  const step = Math.max(1, Math.floor(chartW / n))
  const barW = Math.max(6, step - 4)
  const yFmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
  const highestBar = bars.reduce((a, b) => b.amount > a.amount ? b : a, bars[0])
  const lowestBar = bars.reduce((a, b) => b.amount < a.amount ? b : a, bars[0])

  const plotY = (amount: number) => {
    const range = H - TOP - 12
    return H - (amount / maxAmt) * range
  }

  const points = bars.map((bar, i) => {
    const x = LEFT + 2 + i * step + barW / 2
    const y = plotY(bar.amount)
    return { x, y, bar, idx: i }
  })

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? LEFT} ${H} L ${points[0]?.x ?? LEFT} ${H} Z`

  const showTip = (e: React.MouseEvent | React.TouchEvent, point: (typeof points)[0], color: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const prev = point.idx > 0 ? bars[point.idx - 1].amount : point.bar.amount
    const delta = point.bar.amount - prev
    const deltaPct = prev > 0 ? (delta / prev) * 100 : 0
    const runningTotal = bars.slice(0, point.idx + 1).reduce((s, b) => s + b.amount, 0)
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({
      x: clientX,
      y: clientY,
      lines: [
        { label: point.bar.label },
        { label: 'Spend', value: `${currency} ${point.bar.amount.toFixed(2)}`, color },
        { label: 'Transactions', value: String(point.bar.count) },
        { label: 'Change', value: `${delta >= 0 ? '+' : ''}${currency} ${Math.abs(delta).toFixed(2)} (${delta >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)` },
        { label: 'Share of total', value: `${((point.bar.amount / total) * 100).toFixed(1)}%` },
        { label: 'Running total', value: `${currency} ${runningTotal.toFixed(2)}` },
      ],
    })
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + LABEL_H}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id={`timelineArea-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.34" />
            <stop offset="65%" stopColor="#3b82f6" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id={`timelineBars-${chartId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.5" />
          </linearGradient>
          <filter id={`timelineGlow-${chartId}`} x="-20%" y="-20%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="2.4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect x={LEFT} y={TOP} width={W - LEFT} height={H - TOP} rx={10} fill="currentColor" fillOpacity={0.02} />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={LEFT} y1={H - f * (H - TOP - 12)} x2={W} y2={H - f * (H - TOP - 12)} stroke="currentColor" strokeWidth={0.7} strokeOpacity={0.1} strokeDasharray="4 4" />
        ))}
        {[maxAmt, (maxAmt + minAmt) / 2, minAmt].map((v, i) => (
          <text key={i} x={LEFT - 4} y={plotY(v) + 3.5} textAnchor="end" fontSize={6} fill="currentColor" fillOpacity={0.48}>{yFmt(v)}</text>
        ))}
        <path d={areaPath} fill={`url(#timelineArea-${chartId})`} />
        <path d={linePath} stroke="#67e8f9" strokeWidth={2.1} fill="none" strokeLinecap="round" strokeLinejoin="round" filter={`url(#timelineGlow-${chartId})`} />
        <line x1={LEFT} y1={plotY(avg)} x2={W} y2={plotY(avg)} stroke="#38bdf8" strokeWidth={0.9} strokeOpacity={0.55} strokeDasharray="5 5" />
        <text x={W - 2} y={plotY(avg) - 2} textAnchor="end" fontSize={5.5} fill="#38bdf8" fillOpacity={0.8}>avg {yFmt(avg)}</text>
        {points.map((point, i) => {
          const x = LEFT + 2 + i * step
          const barH = Math.max(3, (point.bar.amount / maxAmt) * (H - TOP - 12))
          const y = H - barH
          const isMax = point.bar.amount === maxAmt
          const color = isMax ? '#06b6d4' : '#60a5fa'
          const showLabel = n <= 10 || i % Math.ceil(n / 8) === 0 || i === n - 1
          return (
            <g key={point.bar.key}>
              <rect x={x} y={2} width={barW} height={H - 2} rx={3} fill="transparent"
                onMouseEnter={(e) => showTip(e, point, color)}
                onMouseMove={(e) => showTip(e, point, color)}
                onMouseLeave={() => {
                  if (timerRef.current) clearTimeout(timerRef.current)
                  setTooltip(null)
                }}
                onTouchStart={(e) => showTip(e, point, color)}
                className="cursor-pointer"
              />
              <rect x={x} y={TOP} width={barW} height={H - TOP} rx={4} fill="currentColor" fillOpacity={0.03} />
              <rect x={x} y={y} width={barW} height={barH} rx={4} fill={`url(#timelineBars-${chartId})`} fillOpacity={isMax ? 1 : 0.78} />
              <circle cx={point.x} cy={point.y} r={isMax ? 3 : 2.1} fill={color} fillOpacity={0.95} />
              {showLabel && (
                <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={5.5} fill="currentColor" fillOpacity={0.46}>{point.bar.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      <div className="mt-2 grid grid-cols-2 gap-1.5 px-1 sm:grid-cols-4">
        <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5">
          <p className="text-[9px] text-muted-foreground">Peak window</p>
          <p className="text-[10px] font-semibold text-foreground tabular-nums">{highestBar.label} · {currency} {highestBar.amount.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 px-2 py-1.5">
          <p className="text-[9px] text-muted-foreground">Average</p>
          <p className="text-[10px] font-semibold text-foreground tabular-nums">{currency} {avg.toFixed(2)}</p>
        </div>
        <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-2 py-1.5">
          <p className="text-[9px] text-muted-foreground">Trend</p>
          <p className={`text-[10px] font-semibold tabular-nums ${trendPct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%</p>
        </div>
        <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 px-2 py-1.5">
          <p className="text-[9px] text-muted-foreground">Volatility</p>
          <p className="text-[10px] font-semibold text-foreground tabular-nums">{currency} {volatility.toFixed(2)}</p>
        </div>
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground px-1">
        Quietest: <span className="font-semibold text-foreground">{lowestBar.label}</span> · {currency} {lowestBar.amount.toFixed(2)}
      </p>
      <ChartTooltip data={tooltip} />
    </div>
  )
}

// ─── Category Donut 3-D ──────────────────────────────────────────────────────
interface PieSliceData { label: string; value: number; color: string; emoji: string; count: number }

function CategoryDonutChart({ data, currency }: { data: PieSliceData[]; currency: string }) {
  const chartId = useId().replaceAll(':', '')
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.value, 0)

  // ── 3-D perspective parameters ─────────────────────────────────────────────
  const cx = 144; const cy = 108
  const R = 93; const Ri = 51              // outer / inner radii
  const pf = 0.42                           // Y compression (perspective)
  const Ry = R * pf; const RiY = Ri * pf   // ellipse Y semi-axes
  const D = 28                              // extrusion depth
  const fn = (v: number) => v.toFixed(3)
  const op = (a: number, dy = 0): [number, number] => [cx + R * Math.cos(a), cy + Ry * Math.sin(a) + dy]
  const ip = (a: number, dy = 0): [number, number] => [cx + Ri * Math.cos(a), cy + RiY * Math.sin(a) + dy]
  const aCmd = (rx: number, rry: number, x: number, y: number, lg: 0 | 1, sw: 0 | 1) =>
    `A ${fn(rx)} ${fn(rry)} 0 ${lg} ${sw} ${fn(x)} ${fn(y)}`

  let angle = -Math.PI / 2
  const slices = data.map((d, idx) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const sa = angle; const ea = angle + sweep
    angle += sweep
    const lg: 0 | 1 = sweep > Math.PI ? 1 : 0
    const midA = sa + sweep / 2

    // Top (elliptical) face
    const [ox1, oy1] = op(sa); const [ox2, oy2] = op(ea)
    const [ix1, iy1] = ip(sa); const [ix2, iy2] = ip(ea)
    const topPath = [
      `M ${fn(ox1)} ${fn(oy1)}`,
      aCmd(R, Ry, ox2, oy2, lg, 1),
      `L ${fn(ix2)} ${fn(iy2)}`,
      aCmd(Ri, RiY, ix1, iy1, lg, 0),
      'Z',
    ].join(' ')

    // Outer wall — only front-facing arc: angles ∈ [0, π]
    let outerWall = ''
    const wSa = Math.max(sa, 0)
    const wEa = Math.min(ea, Math.PI)
    if (wSa < wEa) {
      const [wx1, wy1] = op(wSa); const [wx2, wy2] = op(wEa)
      const wLg: 0 | 1 = (wEa - wSa) > Math.PI ? 1 : 0
      outerWall = [
        `M ${fn(wx1)} ${fn(wy1)}`,
        aCmd(R, Ry, wx2, wy2, wLg, 1),
        `L ${fn(wx2)} ${fn(wy2 + D)}`,
        aCmd(R, Ry, wx1, wy1 + D, wLg, 0),
        'Z',
      ].join(' ')
    }

    return { ...d, idx, pct: Math.round((d.value / total) * 100), midA, topPath, outerWall }
  })

  // Sort back → front (most-negative sin first = drawn behind)
  const sorted = [...slices].sort((a, b) => Math.sin(a.midA) - Math.sin(b.midA))
  const hSlice = hovered === null ? null : slices[hovered]

  const showTip = (e: React.MouseEvent | React.TouchEvent, s: typeof slices[0]) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({
      x: clientX, y: clientY,
      lines: [
        { label: `${s.emoji} ${s.label}` },
        { label: 'Spent', value: `${currency} ${s.value.toFixed(2)}`, color: s.color },
        { label: 'Share', value: `${s.pct}%` },
        { label: 'Transactions', value: String(s.count) },
        { label: 'Avg / item', value: `${currency} ${(s.value / s.count).toFixed(2)}` },
      ],
    })
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* 3-D SVG chart */}
      <div className="relative mx-auto sm:mx-0 shrink-0">
        <svg viewBox="0 0 304 256" className="h-64 w-auto">
          <defs>
            <radialGradient id={`bg3-${chartId}`} cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#000" stopOpacity="0" />
            </radialGradient>
            <filter id={`glo-${chartId}`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id={`gloSm-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            {slices.map((s) => (
              <linearGradient key={s.idx} id={`wg-${chartId}-${s.idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.92" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.22" />
              </linearGradient>
            ))}
          </defs>

          {/* Ambient glow beneath */}
          <ellipse cx={cx} cy={cy + D / 2} rx={R + 16} ry={(R + 16) * pf + D / 2}
            fill={`url(#bg3-${chartId})`} />

          {/* All slices: outer wall then top face, back → front */}
          {sorted.map((s) => {
            const isH = hovered === s.idx
            const tx = isH ? (Math.cos(s.midA) * 6).toFixed(1) : '0'
            const ty = isH ? (Math.sin(s.midA) * pf * 6).toFixed(1) : '0'
            const opacity = hovered === null || isH ? 1 : 0.22
            return (
              <g
                key={s.idx}
                style={{ transform: `translate(${tx}px, ${ty}px)`, transition: 'transform 0.18s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => { setHovered(s.idx); showTip(e, s) }}
                onMouseLeave={() => {
                  setHovered(null)
                  setTooltip(null)
                  if (timerRef.current) clearTimeout(timerRef.current)
                }}
                onTouchStart={(e) => { setHovered(s.idx); showTip(e, s) }}
              >
                {s.outerWall && (
                  <path
                    d={s.outerWall}
                    fill={`url(#wg-${chartId}-${s.idx})`}
                    fillOpacity={opacity}
                    filter={isH ? `url(#gloSm-${chartId})` : undefined}
                  />
                )}
                <path
                  d={s.topPath}
                  fill={s.color}
                  fillOpacity={opacity}
                  stroke={isH ? s.color : 'none'}
                  strokeWidth={isH ? 1.2 : 0}
                  filter={isH ? `url(#glo-${chartId})` : undefined}
                />
              </g>
            )
          })}

          {/* Inner ring highlight */}
          <ellipse cx={cx} cy={cy} rx={Ri} ry={RiY}
            fill="none" stroke="white" strokeWidth={0.7} strokeOpacity={0.12}
            filter={`url(#gloSm-${chartId})`}
          />

          {/* Center label */}
          {hSlice ? (
            <>
              <text x={cx} y={cy - 13} textAnchor="middle" fontSize={26} fill={hSlice.color}>{hSlice.emoji}</text>
              <text x={cx} y={cy + 9} textAnchor="middle" fontSize={14} fontWeight="700" fill={hSlice.color}>{hSlice.pct}%</text>
              <text x={cx} y={cy + 24} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.55}>
                {hSlice.label.length > 12 ? `${hSlice.label.slice(0, 12)}…` : hSlice.label}
              </text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={10} fontWeight="700" fill="currentColor" fillOpacity={0.7}>Total</text>
              <text x={cx} y={cy + 14} textAnchor="middle" fontSize={12} fontWeight="600" fill="currentColor" fillOpacity={0.5}>
                {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
              </text>
            </>
          )}
        </svg>
        <ChartTooltip data={tooltip} />
      </div>

      {/* Legend with inline percentage bars */}
      <div className="flex-1 min-w-0 max-h-56 overflow-y-auto space-y-0.5 pr-0.5">
        {slices.map((s) => (
          <button
            key={s.idx}
            type="button"
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1 transition-all text-left ${
              hovered === s.idx ? 'bg-accent/70' : 'hover:bg-accent/35'
            }`}
            onMouseEnter={() => setHovered(s.idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="h-2.5 w-2.5 rounded-full shrink-0 ring-1 ring-inset ring-white/15" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] truncate flex-1">{s.emoji} {s.label}</span>
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="hidden sm:block w-28 h-1.5 rounded-full bg-border/40 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${s.pct}%`, backgroundColor: s.color, opacity: 0.9 }} />
              </div>
              <div className="text-right w-12">
                <p className="text-[11px] font-semibold tabular-nums" style={{ color: s.color }}>{s.pct}%</p>
                <p className="text-[9px] text-muted-foreground tabular-nums">
                  {currency} {s.value >= 1000 ? `${(s.value / 1000).toFixed(1)}k` : s.value.toFixed(0)}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Balance Flow ─────────────────────────────────────────────────────────────
function BalanceFlowChart({ members, balances, currency }: { members: Member[]; balances: Record<string, number>; currency: string }) {
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const items = members
    .map((m, i) => ({ id: m.user_id, name: mName(m), balance: balances[m.user_id] ?? 0, color: CHART_COLORS[i % CHART_COLORS.length], initials: (m.profiles?.full_name ?? m.profiles?.email ?? 'M')[0].toUpperCase() }))
    .sort((a, b) => b.balance - a.balance)

  const maxAbs = Math.max(...items.map((it) => Math.abs(it.balance)), 0.01)

  const showTip = (e: React.MouseEvent | React.TouchEvent, item: (typeof items)[0]) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    const isPos = item.balance > 0.01; const isNeg = item.balance < -0.01
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({ x: clientX, y: clientY, lines: [{ label: item.name }, { label: isPos ? 'Gets back' : isNeg ? 'Owes' : 'Settled ✓', value: (isPos || isNeg) ? `${currency} ${Math.abs(item.balance).toFixed(2)}` : undefined, color: isPos ? '#10b981' : isNeg ? '#ef4444' : '#94a3b8' }] })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="space-y-3.5">
      {items.map((item) => {
        const pct = Math.min(100, (Math.abs(item.balance) / maxAbs) * 100)
        const isPos = item.balance > 0.01; const isNeg = item.balance < -0.01
        return (
          <div key={item.id} className="cursor-default"
            onMouseEnter={(e) => showTip(e, item)}
            onMouseLeave={() => { if (timerRef.current) clearTimeout(timerRef.current); setTooltip(null) }}
            onTouchStart={(e) => showTip(e, item)}
          >
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: item.color }}>{item.initials}</div>
              <span className="flex-1 truncate text-xs font-medium">{item.name}</span>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${isPos ? 'bg-emerald-500/15 text-emerald-500' : isNeg ? 'bg-red-500/15 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                {isPos ? `+${currency} ${item.balance.toFixed(2)}` : isNeg ? `−${currency} ${Math.abs(item.balance).toFixed(2)}` : 'Settled ✓'}
              </span>
            </div>
            <div className="flex h-2.5 w-full items-center overflow-hidden rounded-full bg-muted/30">
              <div className="flex flex-1 justify-end pr-px">
                {isNeg && <div className="h-1.5 rounded-l-full bg-gradient-to-l from-red-500 to-red-400" style={{ width: `${pct}%`, transition: 'width 0.5s ease' }} />}
              </div>
              <div className="h-3 w-px shrink-0 bg-border" />
              <div className="flex-1 pl-px">
                {isPos && <div className="h-1.5 rounded-r-full bg-gradient-to-r from-emerald-400 to-emerald-500" style={{ width: `${pct}%`, transition: 'width 0.5s ease' }} />}
              </div>
            </div>
          </div>
        )
      })}
      <ChartTooltip data={tooltip} />
    </div>
  )
}

// ─── Debt simplification ──────────────────────────────────────────────────────
function simplifyDebts(members: Member[], balances: Record<string, number>) {
  const people = members.map((m) => ({ id: m.user_id, name: mName(m), bal: balances[m.user_id] ?? 0 }))
  const c = people.filter((p) => p.bal > 0.01).sort((a, b) => b.bal - a.bal).map((x) => ({ ...x }))
  const d = people.filter((p) => p.bal < -0.01).sort((a, b) => a.bal - b.bal).map((x) => ({ ...x }))
  const arrows: { from: string; to: string; amount: number }[] = []
  for (const debtor of d) {
    for (const creditor of c) {
      if (Math.abs(debtor.bal) < 0.005) break
      if (creditor.bal < 0.005) continue
      const amt = Math.min(Math.abs(debtor.bal), creditor.bal)
      arrows.push({ from: debtor.name, to: creditor.name, amount: amt })
      debtor.bal += amt; creditor.bal -= amt
    }
  }
  return arrows
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export function GroupAnalytics({
  expenses,
  members,
  balances,
  currency,
  currentUserId,
}: {
  expenses: any[]
  members: Member[]
  balances: Record<string, number>
  currency: string
  currentUserId: string
}) {
  if (expenses.length === 0) return null

  const catTotals = expenses.reduce<Record<string, { amount: number; count: number }>>((acc, e) => {
    const k = e.category ?? 'other'
    acc[k] = acc[k] ?? { amount: 0, count: 0 }
    acc[k].amount += e.amount; acc[k].count += 1
    return acc
  }, {})

  const sorted = Object.entries(catTotals).sort(([, a], [, b]) => b.amount - a.amount)
  const top = sorted.slice(0, 7)
  const otherAmt = sorted.slice(7).reduce((s, [, v]) => s + v.amount, 0)
  const otherCount = sorted.slice(7).reduce((s, [, v]) => s + v.count, 0)

  const pieData: PieSliceData[] = [
    ...top.map(([cat, data]) => {
      const def = EXPENSE_CATEGORIES.find((c) => c.value === cat)
      return { label: def?.label ?? cat, emoji: def?.emoji ?? '📦', value: data.amount, count: data.count, color: CATEGORY_GROUP_COLORS[def?.group ?? 'Other'] ?? '#94a3b8' }
    }),
    ...(otherAmt > 0.01 ? [{ label: 'Other', emoji: '📦', value: otherAmt, count: otherCount, color: '#94a3b8' }] : []),
  ]

  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0)
  const avgPerExpense = totalSpent / expenses.length
  const myBalance = balances[currentUserId] ?? 0
  const topCategory = top[0]
  const topCatDef = topCategory ? EXPENSE_CATEGORIES.find((c) => c.value === topCategory[0]) : null
  const arrows = simplifyDebts(members, balances)
  const numOwing = members.filter((m) => (balances[m.user_id] ?? 0) < -0.01).length

  const kpis = [
    { label: 'Total Spent', value: `${currency} ${totalSpent >= 10000 ? (totalSpent / 1000).toFixed(1) + 'k' : totalSpent.toFixed(2)}`, sub: `${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`, accent: '#7c3aed', icon: '💰' },
    { label: 'Avg / Expense', value: `${currency} ${avgPerExpense.toFixed(2)}`, sub: 'per transaction', accent: '#0891b2', icon: '📊' },
    { label: 'Top Category', value: topCatDef ? topCatDef.label : '-', sub: topCategory ? `${Math.round((topCategory[1].amount / totalSpent) * 100)}% of total` : '', accent: '#d97706', icon: topCatDef?.emoji ?? '📦' },
    { label: 'Your Balance', value: `${myBalance >= 0 ? '+' : ''}${currency} ${Math.abs(myBalance).toFixed(2)}`, sub: myBalance > 0.01 ? 'owed to you' : myBalance < -0.01 ? 'you owe' : 'all settled', accent: myBalance > 0.01 ? '#10b981' : myBalance < -0.01 ? '#ef4444' : '#94a3b8', icon: myBalance > 0.01 ? '📈' : myBalance < -0.01 ? '📉' : '✅' },
  ]

  return (
    <div className="space-y-3">
      {/* Section heading */}
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-foreground">Analytics</h2>
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[10px] text-muted-foreground">{members.length} members · {numOwing} owe</span>
      </div>

      {/* KPI cards - 2×2 on mobile, 4-across on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card px-3.5 py-3"
            style={{ borderLeftWidth: '3px', borderLeftColor: kpi.accent }}
          >
            <div className="mb-1.5 flex items-start justify-between gap-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">{kpi.label}</p>
              <span className="text-base leading-none">{kpi.icon}</span>
            </div>
            <p className="text-[13px] font-black leading-tight tabular-nums truncate" style={{ color: kpi.accent }}>{kpi.value}</p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Timeline - full width */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <div>
            <h3 className="text-xs font-semibold text-foreground">Spending Timeline</h3>
            <p className="text-[10px] text-muted-foreground">Daily / weekly breakdown</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums">{currency} {totalSpent.toFixed(2)}</p>
            <p className="text-[9px] text-muted-foreground">total</p>
          </div>
        </div>
        <div className="px-3 pb-4">
          <SpendingTimeline expenses={expenses} currency={currency} />
        </div>
      </div>

      {/* Category (wider) + Balance grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {/* Category Donut */}
        <div className="md:col-span-3 rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Spending by Category</h3>
            <span className="text-[10px] text-muted-foreground">{Object.keys(catTotals).length} cat{Object.keys(catTotals).length !== 1 ? 's' : ''}</span>
          </div>
          <CategoryDonutChart data={pieData} currency={currency} />
        </div>

        {/* Balance flow + settle guide */}
        <div className="md:col-span-2 rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Balance Overview</h3>
            <div className="flex gap-2.5">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-1.5 w-2.5 rounded-full bg-emerald-500" /> owes</span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="inline-block h-1.5 w-2.5 rounded-full bg-red-500" /> owed</span>
            </div>
          </div>
          <BalanceFlowChart members={members} balances={balances} currency={currency} />
          {arrows.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border/40">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Suggested Payments</p>
              <div className="space-y-1.5">
                {arrows.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-2.5 py-1.5">
                    <span className="text-xs font-medium truncate max-w-[90px]">{a.from}</span>
                    <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="flex-1 text-xs font-medium truncate">{a.to}</span>
                    <span className="shrink-0 text-xs font-bold text-emerald-500 tabular-nums">{currency} {a.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
