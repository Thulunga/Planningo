'use client'

import { useState, useRef } from 'react'
import { format, parseISO, getDay, startOfWeek } from 'date-fns'
import { TrendingUp, TrendingDown, Wallet, Target, ArrowRight } from 'lucide-react'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense' | 'both'
}

interface Budget {
  id: string
  category_id: string
  amount: number
  month: number
  year: number
  budget_categories: { id: string; name: string; icon: string; color: string } | null
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  title: string
  notes: string | null
  category_id: string | null
  tags: string[]
  transaction_date: string
  linked_group_expense_id: string | null
  budget_categories: { id: string; name: string; icon: string; color: string } | null
}

interface Props {
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  currency?: string
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
interface TipState {
  x: number
  y: number
  lines: { label: string; value?: string; color?: string }[]
}

function ChartTooltip({ data }: { data: TipState | null }) {
  if (!data) return null
  return (
    <div
      className="pointer-events-none fixed z-[999] min-w-[140px] max-w-[210px] rounded-xl border border-white/10 bg-zinc-900/97 backdrop-blur px-3 py-2.5 shadow-2xl"
      style={{ left: data.x + 14, top: data.y, transform: 'translateY(-50%)' }}
    >
      {data.lines.map((l, i) => (
        <div key={i} className={`flex items-center gap-2 ${i < data.lines.length - 1 ? 'mb-1' : ''}`}>
          {l.color && (
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
          )}
          <span className={`text-xs ${i === 0 ? 'font-semibold text-white' : 'text-zinc-400'}`}>
            {l.label}
          </span>
          {l.value && (
            <span className="ml-auto pl-3 text-xs font-bold text-white tabular-nums">{l.value}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Cash Flow Timeline (income green + expense red bars side by side) ────────
function CashFlowTimeline({
  transactions,
  currency,
}: {
  transactions: Transaction[]
  currency: string
}) {
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!transactions.length) return null

  // Aggregate by date
  const byDate: Record<string, { income: number; expense: number }> = {}
  transactions.forEach((t) => {
    const key = t.transaction_date.split('T')[0]
    if (!key) return
    byDate[key] = byDate[key] ?? { income: 0, expense: 0 }
    if (t.type === 'income') byDate[key].income += t.amount
    else byDate[key].expense += t.amount
  })

  let entries = Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b))

  // Collapse to weekly if too many
  if (entries.length > 14) {
    const wk: Record<string, { income: number; expense: number }> = {}
    entries.forEach(([date, d]) => {
      const ws = format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), 'yyyy-MM-dd')
      wk[ws] = wk[ws] ?? { income: 0, expense: 0 }
      wk[ws].income += d.income
      wk[ws].expense += d.expense
    })
    entries = Object.entries(wk).sort(([a], [b]) => a.localeCompare(b))
  }

  const bars = entries.map(([key, d]) => ({
    key,
    label: format(parseISO(key), entries.length > 14 ? 'MMM d' : 'MMM d'),
    income: d.income,
    expense: d.expense,
  }))

  const maxVal = Math.max(...bars.map((b) => Math.max(b.income, b.expense)), 0.01)
  const H = 90
  const W = 320
  const LEFT = 28
  const chartW = W - LEFT
  const n = bars.length
  const groupW = Math.floor(chartW / n)
  const barW = Math.max(3, Math.floor(groupW * 0.35))

  const yFmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0))

  const showTip = (
    e: React.MouseEvent | React.TouchEvent,
    bar: (typeof bars)[0],
  ) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({
      x: clientX,
      y: clientY,
      lines: [
        { label: bar.label },
        ...(bar.income > 0 ? [{ label: 'Income', value: `${currency} ${bar.income.toFixed(2)}`, color: '#10b981' }] : []),
        ...(bar.expense > 0 ? [{ label: 'Expense', value: `${currency} ${bar.expense.toFixed(2)}`, color: '#f43f5e' }] : []),
        { label: 'Net', value: `${bar.income - bar.expense >= 0 ? '+' : ''}${currency} ${(bar.income - bar.expense).toFixed(2)}` },
      ],
    })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full overflow-visible">
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.55" />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.55" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels */}
        {[0.33, 0.66, 1].map((f) => (
          <line
            key={f}
            x1={LEFT}
            y1={H - f * (H - 10)}
            x2={W}
            y2={H - f * (H - 10)}
            stroke="currentColor"
            strokeWidth={0.5}
            strokeOpacity={0.08}
            strokeDasharray="4 3"
          />
        ))}
        {[maxVal, maxVal / 2].map((v, i) => (
          <text
            key={i}
            x={LEFT - 3}
            y={H - (v / maxVal) * (H - 10) + 3.5}
            textAnchor="end"
            fontSize={6}
            fill="currentColor"
            fillOpacity={0.4}
          >
            {yFmt(v)}
          </text>
        ))}
        <line x1={LEFT} y1={H} x2={W} y2={H} stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.15} />

        {bars.map((bar, i) => {
          const cx = LEFT + i * groupW + groupW / 2
          const incH = Math.max(2, (bar.income / maxVal) * (H - 10))
          const expH = Math.max(2, (bar.expense / maxVal) * (H - 10))
          const showLabel = n <= 10 || i % Math.ceil(n / 8) === 0 || i === n - 1
          return (
            <g key={bar.key}>
              {/* Hover target */}
              <rect
                x={cx - groupW / 2}
                y={0}
                width={groupW}
                height={H}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={(e) => showTip(e, bar)}
                onMouseLeave={() => {
                  if (timerRef.current) clearTimeout(timerRef.current)
                  setTooltip(null)
                }}
                onTouchStart={(e) => showTip(e, bar)}
              />
              {/* Income bar */}
              {bar.income > 0 && (
                <rect
                  x={cx - barW - 1}
                  y={H - incH}
                  width={barW}
                  height={incH}
                  rx={2}
                  fill="url(#incomeGrad)"
                />
              )}
              {/* Expense bar */}
              {bar.expense > 0 && (
                <rect
                  x={cx + 1}
                  y={H - expH}
                  width={barW}
                  height={expH}
                  rx={2}
                  fill="url(#expenseGrad)"
                />
              )}
              {showLabel && (
                <text
                  x={cx}
                  y={H + 13}
                  textAnchor="middle"
                  fontSize={5.5}
                  fill="currentColor"
                  fillOpacity={0.4}
                >
                  {bar.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="mt-1 flex items-center gap-4 px-1">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500/80" />
          Income
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="inline-block h-2 w-3 rounded-sm bg-rose-500/80" />
          Expense
        </span>
      </div>
      <ChartTooltip data={tooltip} />
    </div>
  )
}

// ─── Category Donut ───────────────────────────────────────────────────────────
interface PieSliceData {
  label: string
  emoji: string
  value: number
  color: string
  count: number
}

function CategoryDonutChart({
  data,
  currency,
}: {
  data: PieSliceData[]
  currency: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!data.length) return null

  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 80
  const cy = 80
  const r = 60
  const innerR = 36

  let angle = -Math.PI / 2
  const slices = data.map((d, idx) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const sa = angle
    const ea = angle + sweep
    angle += sweep
    const lg = sweep > Math.PI ? 1 : 0
    const midA = sa + sweep / 2
    const path = [
      `M ${cx + r * Math.cos(sa)} ${cy + r * Math.sin(sa)}`,
      `A ${r} ${r} 0 ${lg} 1 ${cx + r * Math.cos(ea)} ${cy + r * Math.sin(ea)}`,
      `L ${cx + innerR * Math.cos(ea)} ${cy + innerR * Math.sin(ea)}`,
      `A ${innerR} ${innerR} 0 ${lg} 0 ${cx + innerR * Math.cos(sa)} ${cy + innerR * Math.sin(sa)}`,
      'Z',
    ].join(' ')
    return { ...d, idx, pct: Math.round((d.value / total) * 100), path, midA }
  })

  const h = hovered !== null ? slices[hovered] : null

  const showTip = (e: React.MouseEvent | React.TouchEvent, s: (typeof slices)[0]) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({
      x: clientX,
      y: clientY,
      lines: [
        { label: `${s.emoji} ${s.label}` },
        { label: currency, value: s.value.toFixed(2), color: s.color },
        { label: 'of total', value: `${s.pct}%` },
        { label: 'transactions', value: String(s.count) },
      ],
    })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="relative mx-auto sm:mx-0 shrink-0">
        <svg viewBox="0 0 160 160" className="w-40 h-40">
          {slices.map((s) => {
            const isH = hovered === s.idx
            return (
              <path
                key={s.idx}
                d={s.path}
                fill={s.color}
                fillOpacity={hovered === null ? 1 : isH ? 1 : 0.22}
                style={{
                  transform: `translate(${Math.cos(s.midA) * (isH ? 5 : 0)}px, ${Math.sin(s.midA) * (isH ? 5 : 0)}px)`,
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  setHovered(s.idx)
                  showTip(e, s)
                }}
                onMouseLeave={() => {
                  setHovered(null)
                  setTooltip(null)
                  if (timerRef.current) clearTimeout(timerRef.current)
                }}
                onTouchStart={(e) => {
                  setHovered(s.idx)
                  showTip(e, s)
                }}
              />
            )
          })}
          {h ? (
            <>
              <text x={cx} y={cy - 10} textAnchor="middle" fontSize={20} fill={h.color}>
                {h.emoji}
              </text>
              <text
                x={cx}
                y={cy + 8}
                textAnchor="middle"
                fontSize={11}
                fontWeight="700"
                fill={h.color}
              >
                {h.pct}%
              </text>
              <text
                x={cx}
                y={cy + 20}
                textAnchor="middle"
                fontSize={7}
                fill="currentColor"
                fillOpacity={0.5}
              >
                {h.label.length > 11 ? h.label.slice(0, 11) + '…' : h.label}
              </text>
            </>
          ) : (
            <>
              <text
                x={cx}
                y={cy - 4}
                textAnchor="middle"
                fontSize={8}
                fontWeight="700"
                fill="currentColor"
                fillOpacity={0.7}
              >
                Expenses
              </text>
              <text
                x={cx}
                y={cy + 10}
                textAnchor="middle"
                fontSize={8}
                fill="currentColor"
                fillOpacity={0.45}
              >
                {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}
              </text>
            </>
          )}
        </svg>
        <ChartTooltip data={tooltip} />
      </div>
      <div className="flex-1 min-w-0 max-h-44 overflow-y-auto space-y-0.5">
        {slices.map((s) => (
          <div
            key={s.idx}
            className={`flex items-center gap-2 rounded-lg px-2 py-0.5 transition-colors cursor-default ${hovered === s.idx ? 'bg-accent' : 'hover:bg-accent/50'}`}
            onMouseEnter={() => setHovered(s.idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div
              className="h-2.5 w-2.5 rounded-full shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-[11px] truncate flex-1">
              {s.emoji} {s.label}
            </span>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold tabular-nums">{s.pct}%</p>
              <p className="text-[9px] text-muted-foreground tabular-nums">
                {currency}{' '}
                {s.value >= 1000 ? (s.value / 1000).toFixed(1) + 'k' : s.value.toFixed(0)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Weekly Spending Heatmap ──────────────────────────────────────────────────
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function WeekdayHeatmap({
  transactions,
  currency,
}: {
  transactions: Transaction[]
  currency: string
}) {
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const byDay = Array(7).fill(0) as number[]
  const countByDay = Array(7).fill(0) as number[]

  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      const d = getDay(parseISO(t.transaction_date))
      byDay[d] += t.amount
      countByDay[d] += 1
    })

  const maxDay = Math.max(...byDay, 0.01)

  const showTip = (e: React.MouseEvent | React.TouchEvent, dayIdx: number) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({
      x: clientX,
      y: clientY,
      lines: [
        { label: DAY_LABELS[dayIdx] },
        { label: 'Spent', value: `${currency} ${byDay[dayIdx].toFixed(2)}`, color: '#f43f5e' },
        { label: 'Transactions', value: String(countByDay[dayIdx]) },
      ],
    })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="relative">
      <div className="flex items-end gap-1.5 h-20">
        {byDay.map((val, i) => {
          const pct = maxDay > 0 ? (val / maxDay) * 100 : 0
          const isWeekend = i === 0 || i === 6
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 cursor-default"
              onMouseEnter={(e) => showTip(e, i)}
              onMouseLeave={() => {
                if (timerRef.current) clearTimeout(timerRef.current)
                setTooltip(null)
              }}
              onTouchStart={(e) => showTip(e, i)}
            >
              <div className="w-full flex items-end" style={{ height: 64 }}>
                <div
                  className={`w-full rounded-t-md transition-all ${isWeekend ? 'bg-amber-500/70' : 'bg-rose-500/70'} ${val === 0 ? 'opacity-20' : ''}`}
                  style={{ height: `${Math.max(pct, 4)}%` }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{DAY_LABELS[i]}</span>
            </div>
          )
        })}
      </div>
      <ChartTooltip data={tooltip} />
    </div>
  )
}

// ─── Budget Arc Gauge ─────────────────────────────────────────────────────────
function BudgetArcGauge({
  spent,
  limit,
  color,
}: {
  spent: number
  limit: number
  color: string
}) {
  const pct = Math.min(spent / limit, 1)
  const over = spent > limit
  const R = 28
  const cx = 36
  const cy = 36
  const startAngle = -Math.PI * 0.75
  const sweepAngle = Math.PI * 1.5
  const circumference = R * sweepAngle

  const trackPath = describeArc(cx, cy, R, startAngle, startAngle + sweepAngle)
  const fillPath = describeArc(cx, cy, R, startAngle, startAngle + sweepAngle * pct)

  return (
    <svg viewBox="0 0 72 56" className="w-16 h-14">
      {/* Track */}
      <path
        d={trackPath}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.1}
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* Fill */}
      <path
        d={fillPath}
        fill="none"
        stroke={over ? '#ef4444' : pct > 0.8 ? '#f59e0b' : color}
        strokeWidth={6}
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease' }}
      />
      {/* Center text */}
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={9} fontWeight="700" fill={over ? '#ef4444' : color}>
        {Math.round(pct * 100)}%
      </text>
      <text x={cx} y={cx + 8} textAnchor="middle" fontSize={5.5} fill="currentColor" fillOpacity={0.45}>
        used
      </text>
    </svg>
  )
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const clampedEnd = Math.min(endAngle, startAngle + Math.PI * 1.5 - 0.001)
  const x1 = cx + r * Math.cos(startAngle)
  const y1 = cy + r * Math.sin(startAngle)
  const x2 = cx + r * Math.cos(clampedEnd)
  const y2 = cy + r * Math.sin(clampedEnd)
  const lg = clampedEnd - startAngle > Math.PI ? 1 : 0
  return `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2}`
}

// ─── Budget Progress Cards ────────────────────────────────────────────────────
function BudgetProgressCards({
  budgets,
  categories,
  spendingByCategory,
  currency,
}: {
  budgets: Budget[]
  categories: Category[]
  spendingByCategory: Record<string, number>
  currency: string
}) {
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const items = budgets
    .map((b) => {
      const cat = categories.find((c) => c.id === b.category_id)
      if (!cat) return null
      const spent = spendingByCategory[b.category_id] ?? 0
      return { cat, budget: b, spent, pct: Math.min((spent / b.amount) * 100, 100), over: spent > b.amount }
    })
    .filter(Boolean) as Array<{
    cat: Category
    budget: Budget
    spent: number
    pct: number
    over: boolean
  }>

  if (!items.length) return null

  const showTip = (
    e: React.MouseEvent | React.TouchEvent,
    item: (typeof items)[0],
  ) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    const remaining = item.budget.amount - item.spent
    setTooltip({
      x: clientX,
      y: clientY,
      lines: [
        { label: `${item.cat.icon} ${item.cat.name}` },
        { label: 'Spent', value: `${currency} ${item.spent.toFixed(2)}`, color: item.over ? '#ef4444' : item.cat.color },
        { label: 'Budget', value: `${currency} ${item.budget.amount.toFixed(2)}` },
        {
          label: item.over ? 'Over by' : 'Remaining',
          value: `${currency} ${Math.abs(remaining).toFixed(2)}`,
          color: item.over ? '#ef4444' : '#10b981',
        },
      ],
    })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.cat.id}
            className={`rounded-xl border p-3 cursor-default transition-colors hover:bg-accent/30 ${item.over ? 'border-red-500/30 bg-red-500/5' : item.pct > 80 ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-card'}`}
            onMouseEnter={(e) => showTip(e, item)}
            onMouseLeave={() => {
              if (timerRef.current) clearTimeout(timerRef.current)
              setTooltip(null)
            }}
            onTouchStart={(e) => showTip(e, item)}
          >
            <div className="flex items-start justify-between gap-1 mb-1">
              <div className="min-w-0">
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-base leading-none">{item.cat.icon}</span>
                  <span className="text-[11px] font-semibold truncate">{item.cat.name}</span>
                </div>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  ₹{item.spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })} /{' '}
                  ₹{item.budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <BudgetArcGauge spent={item.spent} limit={item.budget.amount} color={item.cat.color} />
            </div>

            {/* Bar */}
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.pct}%`,
                  backgroundColor: item.over ? '#ef4444' : item.pct > 80 ? '#f59e0b' : item.cat.color,
                }}
              />
            </div>
            {item.over && (
              <p className="mt-1 text-[9px] font-semibold text-red-500">
                ₹{(item.spent - item.budget.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })} over budget
              </p>
            )}
          </div>
        ))}
      </div>
      <ChartTooltip data={tooltip} />
    </div>
  )
}

// ─── Income vs Expense Ratio Ring ────────────────────────────────────────────
function SavingsRing({
  income,
  expense,
  currency,
}: {
  income: number
  expense: number
  currency: string
}) {
  const [tooltip, setTooltip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savings = income - expense
  const savingsRate = income > 0 ? (savings / income) * 100 : 0
  const total = income + expense
  if (total === 0) return null

  const incPct = income / total
  const expPct = expense / total
  const cx = 50
  const cy = 50
  const r = 38
  const inner = 24

  const incSweep = incPct * 2 * Math.PI
  const expSweep = expPct * 2 * Math.PI
  const startAngle = -Math.PI / 2

  const iPath = buildAnnularPath(cx, cy, r, inner, startAngle, startAngle + incSweep)
  const ePath = buildAnnularPath(cx, cy, r, inner, startAngle + incSweep, startAngle + incSweep + expSweep)

  const showTip = (
    e: React.MouseEvent | React.TouchEvent,
    type: 'income' | 'expense',
  ) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTooltip({
      x: clientX,
      y: clientY,
      lines:
        type === 'income'
          ? [
              { label: 'Income' },
              { label: currency, value: income.toFixed(2), color: '#10b981' },
              { label: 'Share', value: `${Math.round(incPct * 100)}%` },
            ]
          : [
              { label: 'Expenses' },
              { label: currency, value: expense.toFixed(2), color: '#f43f5e' },
              { label: 'Share', value: `${Math.round(expPct * 100)}%` },
            ],
    })
    timerRef.current = setTimeout(() => setTooltip(null), 2500)
  }

  return (
    <div className="flex items-center gap-4 relative">
      <div className="relative shrink-0">
        <svg viewBox="0 0 100 100" className="w-24 h-24">
          <path
            d={iPath}
            fill="#10b981"
            fillOpacity={0.85}
            className="cursor-pointer"
            style={{ transition: 'fill-opacity 0.15s' }}
            onMouseEnter={(e) => showTip(e, 'income')}
            onMouseLeave={() => {
              if (timerRef.current) clearTimeout(timerRef.current)
              setTooltip(null)
            }}
            onTouchStart={(e) => showTip(e, 'income')}
          />
          <path
            d={ePath}
            fill="#f43f5e"
            fillOpacity={0.85}
            className="cursor-pointer"
            style={{ transition: 'fill-opacity 0.15s' }}
            onMouseEnter={(e) => showTip(e, 'expense')}
            onMouseLeave={() => {
              if (timerRef.current) clearTimeout(timerRef.current)
              setTooltip(null)
            }}
            onTouchStart={(e) => showTip(e, 'expense')}
          />
          {/* Center */}
          <text
            x={cx}
            y={cy - 5}
            textAnchor="middle"
            fontSize={10}
            fontWeight="800"
            fill={savings >= 0 ? '#10b981' : '#f43f5e'}
          >
            {savingsRate >= 0 ? '+' : ''}{savingsRate.toFixed(0)}%
          </text>
          <text x={cx} y={cx + 7} textAnchor="middle" fontSize={6} fill="currentColor" fillOpacity={0.5}>
            saved
          </text>
        </svg>
        <ChartTooltip data={tooltip} />
      </div>
      <div className="space-y-2 min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Income</p>
            <p className="text-sm font-bold text-emerald-500 tabular-nums">
              {currency} {income.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-3.5 w-3.5 text-rose-500 shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Expenses</p>
            <p className="text-sm font-bold text-rose-500 tabular-nums">
              {currency} {expense.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
          <div>
            <p className="text-[10px] text-muted-foreground">Net savings</p>
            <p className={`text-sm font-bold tabular-nums ${savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {savings >= 0 ? '+' : '-'}{currency}{' '}
              {Math.abs(savings).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function buildAnnularPath(
  cx: number,
  cy: number,
  r: number,
  inner: number,
  startAngle: number,
  endAngle: number,
) {
  const clamp = Math.min(endAngle, startAngle + 2 * Math.PI - 0.001)
  const lg = clamp - startAngle > Math.PI ? 1 : 0
  const x1o = cx + r * Math.cos(startAngle)
  const y1o = cy + r * Math.sin(startAngle)
  const x2o = cx + r * Math.cos(clamp)
  const y2o = cy + r * Math.sin(clamp)
  const x1i = cx + inner * Math.cos(clamp)
  const y1i = cy + inner * Math.sin(clamp)
  const x2i = cx + inner * Math.cos(startAngle)
  const y2i = cy + inner * Math.sin(startAngle)
  return `M ${x1o} ${y1o} A ${r} ${r} 0 ${lg} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${inner} ${inner} 0 ${lg} 0 ${x2i} ${y2i} Z`
}

// ─── Top Spending Insights ────────────────────────────────────────────────────
function SpendingInsights({
  transactions,
  currency,
}: {
  transactions: Transaction[]
  currency: string
}) {
  const expenses = transactions.filter((t) => t.type === 'expense')
  if (!expenses.length) return null

  const topTransaction = expenses.reduce((a, b) => (b.amount > a.amount ? b : a))
  const avgTx = expenses.reduce((s, t) => s + t.amount, 0) / expenses.length

  const linkedToGroup = expenses.filter((t) => t.linked_group_expense_id).length
  const linkedAmt = expenses
    .filter((t) => t.linked_group_expense_id)
    .reduce((s, t) => s + t.amount, 0)

  const insights = [
    {
      icon: '🏆',
      label: 'Largest expense',
      value: `${currency} ${topTransaction.amount.toFixed(2)}`,
      sub: topTransaction.title,
      color: '#f43f5e',
    },
    {
      icon: '📊',
      label: 'Avg. transaction',
      value: `${currency} ${avgTx.toFixed(2)}`,
      sub: `across ${expenses.length} transactions`,
      color: '#7c3aed',
    },
    {
      icon: '👥',
      label: 'Group share',
      value: `${currency} ${linkedAmt.toFixed(2)}`,
      sub: `${linkedToGroup} linked expense${linkedToGroup !== 1 ? 's' : ''}`,
      color: '#0891b2',
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {insights.map((ins) => (
        <div
          key={ins.label}
          className="rounded-xl border border-border bg-card px-3 py-2.5"
          style={{ borderLeftWidth: '3px', borderLeftColor: ins.color }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm">{ins.icon}</span>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
              {ins.label}
            </p>
          </div>
          <p className="text-xs font-black tabular-nums" style={{ color: ins.color }}>
            {ins.value}
          </p>
          <p className="text-[9px] text-muted-foreground truncate">{ins.sub}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Main BudgetAnalytics ─────────────────────────────────────────────────────
const CAT_PALETTE = [
  '#7c3aed', '#0891b2', '#d97706', '#10b981', '#f43f5e',
  '#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#84cc16',
]

export function BudgetAnalytics({ transactions, categories, budgets, currency = 'INR' }: Props) {
  if (!transactions.length) return null

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((s, t) => s + t.amount, 0)
  const netSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0
  const expenseCount = transactions.filter((t) => t.type === 'expense').length

  // Spending by category
  const spendingByCategory = transactions
    .filter((t) => t.type === 'expense' && t.category_id)
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category_id!] = (acc[t.category_id!] ?? 0) + t.amount
      return acc
    }, {})

  // Pie slices
  const pieData: PieSliceData[] = categories
    .filter((c) => (spendingByCategory[c.id] ?? 0) > 0)
    .map((c, idx) => ({
      label: c.name,
      emoji: c.icon,
      value: spendingByCategory[c.id]!,
      color: c.color || CAT_PALETTE[idx % CAT_PALETTE.length],
      count: transactions.filter((t) => t.category_id === c.id && t.type === 'expense').length,
    }))
    .sort((a, b) => b.value - a.value)

  const topCat = pieData[0]

  const kpis = [
    {
      label: 'Total Income',
      value: `${currency} ${totalIncome >= 10000 ? (totalIncome / 1000).toFixed(1) + 'k' : totalIncome.toFixed(0)}`,
      sub: `${transactions.filter((t) => t.type === 'income').length} transactions`,
      accent: '#10b981',
      icon: '💚',
    },
    {
      label: 'Total Expenses',
      value: `${currency} ${totalExpense >= 10000 ? (totalExpense / 1000).toFixed(1) + 'k' : totalExpense.toFixed(0)}`,
      sub: `${expenseCount} transactions`,
      accent: '#f43f5e',
      icon: '💸',
    },
    {
      label: 'Net Savings',
      value: `${netSavings >= 0 ? '+' : ''}${currency} ${Math.abs(netSavings) >= 10000 ? (Math.abs(netSavings) / 1000).toFixed(1) + 'k' : Math.abs(netSavings).toFixed(0)}`,
      sub:
        totalIncome > 0
          ? `${savingsRate.toFixed(0)}% of income saved`
          : 'no income recorded',
      accent: netSavings >= 0 ? '#7c3aed' : '#f59e0b',
      icon: netSavings >= 0 ? '🎯' : '⚠️',
    },
    {
      label: 'Top Category',
      value: topCat ? topCat.label : '-',
      sub: topCat
        ? `${currency} ${topCat.value.toFixed(0)} · ${Math.round((topCat.value / totalExpense) * 100)}%`
        : 'no data',
      accent: topCat?.color ?? '#94a3b8',
      icon: topCat?.emoji ?? '📦',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <Target className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Budget Analytics</h2>
        <div className="h-px flex-1 bg-border/60" />
        <span className="text-[10px] text-muted-foreground">
          {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} this month
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card px-3.5 py-3"
            style={{ borderLeftWidth: '3px', borderLeftColor: kpi.accent }}
          >
            <div className="mb-1.5 flex items-start justify-between gap-1">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
                {kpi.label}
              </p>
              <span className="text-base leading-none">{kpi.icon}</span>
            </div>
            <p
              className="text-[13px] font-black leading-tight tabular-nums truncate"
              style={{ color: kpi.accent }}
            >
              {kpi.value}
            </p>
            <p className="mt-0.5 text-[9px] text-muted-foreground">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Cash flow timeline - full width */}
      <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
        <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
          <div>
            <h3 className="text-xs font-semibold text-foreground">Cash Flow</h3>
            <p className="text-[10px] text-muted-foreground">Income & expenses over time</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold tabular-nums ${netSavings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {netSavings >= 0 ? '+' : '-'}{currency} {Math.abs(netSavings).toFixed(2)}
            </p>
            <p className="text-[9px] text-muted-foreground">net savings</p>
          </div>
        </div>
        <div className="px-3 pb-4">
          <CashFlowTimeline transactions={transactions} currency={currency} />
        </div>
      </div>

      {/* 3-col insights */}
      <SpendingInsights transactions={transactions} currency={currency} />

      {/* Two-col: Category donut + Weekly heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Category donut */}
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Spending by Category</h3>
            <span className="text-[10px] text-muted-foreground">
              {pieData.length} cat{pieData.length !== 1 ? 's' : ''}
            </span>
          </div>
          {pieData.length > 0 ? (
            <CategoryDonutChart data={pieData} currency={currency} />
          ) : (
            <p className="text-xs text-muted-foreground py-4 text-center">No categorized expenses</p>
          )}
        </div>

        {/* Right side: Savings ring + weekly heatmap */}
        <div className="space-y-3">
          {/* Savings ring */}
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <h3 className="mb-3 text-xs font-semibold text-foreground">Income vs Expenses</h3>
            <SavingsRing income={totalIncome} expense={totalExpense} currency={currency} />
          </div>

          {/* Weekly pattern */}
          <div className="rounded-2xl border border-border/50 bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-foreground">Spending by Day</h3>
              <span className="text-[10px] text-muted-foreground">weekly pattern</span>
            </div>
            <WeekdayHeatmap transactions={transactions} currency={currency} />
          </div>
        </div>
      </div>

      {/* Budget progress cards */}
      {budgets.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-foreground">Budget Progress</h3>
            <span className="text-[10px] text-muted-foreground">
              {budgets.length} limit{budgets.length !== 1 ? 's' : ''} set
            </span>
          </div>
          <BudgetProgressCards
            budgets={budgets}
            categories={categories}
            spendingByCategory={spendingByCategory}
            currency={currency}
          />
        </div>
      )}
    </div>
  )
}
