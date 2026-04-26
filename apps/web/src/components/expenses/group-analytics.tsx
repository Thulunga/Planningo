'use client'

import { useState, useRef } from 'react'
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
  const W = 300; const H = 90; const LABEL_H = 18; const LEFT = 30
  const chartW = W - LEFT
  const n = bars.length
  const step = Math.floor(chartW / n)
  const barW = Math.max(4, step - 3)
  const yFmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
  const highestBar = bars.reduce((a, b) => b.amount > a.amount ? b : a, bars[0])

  const areaPoints = bars.map((bar, i) => {
    const x = LEFT + 2 + i * step + barW / 2
    const barH = Math.max(3, (bar.amount / maxAmt) * (H - 10))
    return `${x},${H - barH}`
  }).join(' ')
  const firstX = LEFT + 2 + barW / 2
  const lastX = LEFT + 2 + (bars.length - 1) * step + barW / 2

  const showTip = (e: React.MouseEvent | React.TouchEvent, bar: (typeof bars)[0], color: string) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({ x: clientX, y: clientY, lines: [{ label: bar.label }, { label: currency, value: bar.amount.toFixed(2), color }, { label: `${bar.count} expense${bar.count !== 1 ? 's' : ''}` }] })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + LABEL_H}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.33, 0.66, 1].map((f) => (
          <line key={f} x1={LEFT} y1={H - f * (H - 10)} x2={W} y2={H - f * (H - 10)} stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.08} strokeDasharray="4 3" />
        ))}
        {[maxAmt, maxAmt / 2].map((v, i) => (
          <text key={i} x={LEFT - 3} y={H - (v / maxAmt) * (H - 10) + 3.5} textAnchor="end" fontSize={6} fill="currentColor" fillOpacity={0.4}>{yFmt(v)}</text>
        ))}
        <polygon points={`${firstX},${H} ${areaPoints} ${lastX},${H}`} fill="url(#timelineGrad)" />
        {bars.map((bar, i) => {
          const x = LEFT + 2 + i * step
          const barH = Math.max(3, (bar.amount / maxAmt) * (H - 10))
          const y = H - barH
          const isMax = bar.amount === maxAmt
          const color = isMax ? '#7c3aed' : '#8b5cf6'
          const showLabel = n <= 10 || i % Math.ceil(n / 8) === 0 || i === n - 1
          return (
            <g key={bar.key}>
              <rect x={x} y={2} width={barW} height={H - 2} rx={3} fill="transparent"
                onMouseEnter={(e) => showTip(e, bar, color)}
                onMouseLeave={() => { if (timerRef.current) clearTimeout(timerRef.current); setTooltip(null) }}
                onTouchStart={(e) => showTip(e, bar, color)}
                className="cursor-pointer"
              />
              <rect x={x} y={2} width={barW} height={H - 2} rx={3} fill="currentColor" fillOpacity={0.04} />
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} fillOpacity={isMax ? 0.88 : 0.55} />
              {isMax && <circle cx={x + barW / 2} cy={y} r={2.5} fill={color} />}
              {showLabel && (
                <text x={x + barW / 2} y={H + 13} textAnchor="middle" fontSize={5.5} fill="currentColor" fillOpacity={0.4}>{bar.label}</text>
              )}
            </g>
          )
        })}
      </svg>
      <p className="mt-1 text-[10px] text-muted-foreground px-1">
        Peak: <span className="font-semibold text-foreground">{highestBar.label}</span> · {currency} {highestBar.amount.toFixed(2)}
      </p>
      <ChartTooltip data={tooltip} />
    </div>
  )
}

// ─── Category Donut ───────────────────────────────────────────────────────────
interface PieSliceData { label: string; value: number; color: string; emoji: string; count: number }

function CategoryDonutChart({ data, currency }: { data: PieSliceData[]; currency: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!data.length) return null
  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 80; const cy = 80; const r = 60; const innerR = 37

  let angle = -Math.PI / 2
  const slices = data.map((d, idx) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const sa = angle; const ea = angle + sweep
    angle += sweep
    const lg = sweep > Math.PI ? 1 : 0
    const midA = sa + sweep / 2
    const path = [`M ${cx + r * Math.cos(sa)} ${cy + r * Math.sin(sa)}`, `A ${r} ${r} 0 ${lg} 1 ${cx + r * Math.cos(ea)} ${cy + r * Math.sin(ea)}`, `L ${cx + innerR * Math.cos(ea)} ${cy + innerR * Math.sin(ea)}`, `A ${innerR} ${innerR} 0 ${lg} 0 ${cx + innerR * Math.cos(sa)} ${cy + innerR * Math.sin(sa)}`, 'Z'].join(' ')
    return { ...d, idx, pct: Math.round((d.value / total) * 100), path, midA }
  })
  const h = hovered !== null ? slices[hovered] : null

  const showTip = (e: React.MouseEvent | React.TouchEvent, s: (typeof slices)[0]) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({ x: clientX, y: clientY, lines: [{ label: `${s.emoji} ${s.label}` }, { label: currency, value: s.value.toFixed(2), color: s.color }, { label: 'of total', value: `${s.pct}%` }, { label: 'items', value: String(s.count) }] })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="relative mx-auto sm:mx-0 shrink-0">
        <svg viewBox="0 0 160 160" className="w-40 h-40">
          {slices.map((s) => {
            const isH = hovered === s.idx
            return (
              <path key={s.idx} d={s.path} fill={s.color} fillOpacity={hovered === null ? 1 : isH ? 1 : 0.22}
                style={{ transform: `translate(${Math.cos(s.midA) * (isH ? 5 : 0)}px, ${Math.sin(s.midA) * (isH ? 5 : 0)}px)`, transition: 'all 0.15s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => { setHovered(s.idx); showTip(e, s) }}
                onMouseLeave={() => { setHovered(null); setTooltip(null); if (timerRef.current) clearTimeout(timerRef.current) }}
                onTouchStart={(e) => { setHovered(s.idx); showTip(e, s) }}
              />
            )
          })}
          {h ? (
            <>
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize={20} fill={h.color}>{h.emoji}</text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize={10} fontWeight="700" fill={h.color}>{h.pct}%</text>
              <text x={cx} y={cy + 20} textAnchor="middle" fontSize={7} fill="currentColor" fillOpacity={0.5}>{h.label.length > 11 ? h.label.slice(0, 11) + '…' : h.label}</text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={8} fontWeight="700" fill="currentColor" fillOpacity={0.7}>Spending</text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.45}>{total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}</text>
            </>
          )}
        </svg>
        <ChartTooltip data={tooltip} />
      </div>
      <div className="flex-1 min-w-0 max-h-44 overflow-y-auto space-y-0.5">
        {slices.map((s) => (
          <div key={s.idx}
            className={`flex items-center gap-2 rounded-lg px-2 py-0.5 transition-colors cursor-default ${hovered === s.idx ? 'bg-accent' : 'hover:bg-accent/50'}`}
            onMouseEnter={() => setHovered(s.idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] truncate flex-1">{s.emoji} {s.label}</span>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold tabular-nums">{s.pct}%</p>
              <p className="text-[9px] text-muted-foreground tabular-nums">{currency} {s.value >= 1000 ? (s.value / 1000).toFixed(1) + 'k' : s.value.toFixed(0)}</p>
            </div>
          </div>
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
    { label: 'Top Category', value: topCatDef ? topCatDef.label : '—', sub: topCategory ? `${Math.round((topCategory[1].amount / totalSpent) * 100)}% of total` : '', accent: '#d97706', icon: topCatDef?.emoji ?? '📦' },
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

      {/* KPI cards — 2×2 on mobile, 4-across on sm+ */}
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

      {/* Timeline — full width */}
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

      {/* Two-col on md+: Category | Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Category Donut */}
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Spending by Category</h3>
            <span className="text-[10px] text-muted-foreground">{Object.keys(catTotals).length} cat{Object.keys(catTotals).length !== 1 ? 's' : ''}</span>
          </div>
          <CategoryDonutChart data={pieData} currency={currency} />
        </div>

        {/* Balance flow + settle guide */}
        <div className="rounded-2xl border border-border/50 bg-card p-4">
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
