'use client'

import { useRef, useState } from 'react'

interface TipState {
  x: number
  y: number
  lines: { label: string; value?: string; color?: string }[]
}

function FloatingTooltip({ tip }: { tip: TipState | null }) {
  if (!tip) return null
  return (
    <div
      className="pointer-events-none fixed z-[999] min-w-[130px] max-w-[220px] rounded-xl border border-border/70 bg-popover/95 px-3 py-2.5 text-popover-foreground shadow-xl backdrop-blur"
      style={{ left: tip.x + 14, top: tip.y, transform: 'translateY(-50%)' }}
    >
      {tip.lines.map((l, i) => (
        <div key={i} className={`flex items-center gap-2 ${i < tip.lines.length - 1 ? 'mb-1' : ''}`}>
          {l.color && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />}
          <span className={`text-xs ${i === 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>{l.label}</span>
          {l.value && <span className="ml-auto pl-3 text-xs font-bold text-foreground tabular-nums">{l.value}</span>}
        </div>
      ))}
    </div>
  )
}

const demoBudgetCategories = [
  { icon: '🍔', label: 'Food & Dining', spent: 8400, limit: 10000, color: '#f43f5e' },
  { icon: '🚗', label: 'Transport', spent: 3200, limit: 3000, color: '#f59e0b' },
  { icon: '🎬', label: 'Entertainment', spent: 1800, limit: 4000, color: '#7c3aed' },
  { icon: '💊', label: 'Health', spent: 900, limit: 2000, color: '#10b981' },
  { icon: '🛍️', label: 'Shopping', spent: 5100, limit: 5000, color: '#0891b2' },
]

const demoDailyCashflow = [
  { day: 'Mon', income: 0, expense: 1200 },
  { day: 'Tue', income: 0, expense: 2100 },
  { day: 'Wed', income: 42000, expense: 3400 },
  { day: 'Thu', income: 0, expense: 1800 },
  { day: 'Fri', income: 0, expense: 4600 },
  { day: 'Sat', income: 0, expense: 3900 },
  { day: 'Sun', income: 0, expense: 1400 },
]

const demoWeekdaySpend = [1400, 1200, 2100, 3400, 1800, 4600, 3900]

export function PersonalBudgetShowcase() {
  const [tip, setTip] = useState<TipState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTip = (
    e: React.MouseEvent | React.TouchEvent,
    lines: { label: string; value?: string; color?: string }[],
  ) => {
    const x = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const y = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    if (timerRef.current) clearTimeout(timerRef.current)
    setTip({ x, y, lines })
    timerRef.current = setTimeout(() => setTip(null), 2500)
  }

  const hideTip = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setTip(null)
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">Personal Finance</p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Your budget, beautifully in control
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Track income, expenses, category budgets, and spending patterns - all with interactive charts that respond to every hover.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        {[
          { label: 'Monthly Income', value: '₹42,000', sub: '4 transactions', accent: '#10b981', icon: '💚' },
          { label: 'Total Expenses', value: '₹18,400', sub: '23 transactions', accent: '#f43f5e', icon: '💸' },
          { label: 'Net Savings', value: '+₹23,600', sub: '56% of income saved', accent: '#7c3aed', icon: '🎯' },
          { label: 'Top Category', value: 'Food & Dining', sub: '₹8,400 · 46%', accent: '#f43f5e', icon: '🍔' },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="relative overflow-hidden rounded-2xl border border-border/50 bg-card px-3.5 py-3 cursor-default"
            style={{ borderLeftWidth: '3px', borderLeftColor: kpi.accent }}
            onMouseEnter={(e) => showTip(e, [{ label: kpi.label }, { label: 'Value', value: kpi.value, color: kpi.accent }, { label: kpi.sub }])}
            onMouseLeave={hideTip}
            onTouchStart={(e) => showTip(e, [{ label: kpi.label }, { label: 'Value', value: kpi.value, color: kpi.accent }, { label: kpi.sub }])}
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

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">Cash Flow</h3>
              <p className="text-[10px] text-muted-foreground">Income & expenses this week</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-emerald-500">+₹23,600</p>
              <p className="text-[9px] text-muted-foreground">net savings</p>
            </div>
          </div>

          <div className="relative">
            <svg viewBox="0 0 320 110" className="w-full overflow-visible">
              <defs>
                <linearGradient id="landingIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="landingExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              {[0.33, 0.66, 1].map((f) => (
                <line key={f} x1="28" y1={90 - f * 80} x2="310" y2={90 - f * 80} stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.08} strokeDasharray="4 3" />
              ))}
              <line x1="28" y1="90" x2="310" y2="90" stroke="currentColor" strokeWidth={0.5} strokeOpacity={0.15} />
              {demoDailyCashflow.map((bar, i) => {
                const groupW = 40
                const cx = 28 + i * groupW + groupW / 2
                const bw = 7
                const maxV = 42000
                const incH = Math.max(2, (bar.income / maxV) * 80)
                const expH = Math.max(2, (bar.expense / maxV) * 80)
                const net = bar.income - bar.expense
                return (
                  <g key={bar.day}>
                    <rect
                      x={cx - groupW / 2}
                      y={0}
                      width={groupW}
                      height={90}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={(e) => showTip(e, [{ label: bar.day }, { label: 'Income', value: `₹${bar.income.toLocaleString('en-IN')}`, color: '#10b981' }, { label: 'Expense', value: `₹${bar.expense.toLocaleString('en-IN')}`, color: '#f43f5e' }, { label: 'Net', value: `${net >= 0 ? '+' : '-'}₹${Math.abs(net).toLocaleString('en-IN')}` }])}
                      onMouseLeave={hideTip}
                      onTouchStart={(e) => showTip(e, [{ label: bar.day }, { label: 'Income', value: `₹${bar.income.toLocaleString('en-IN')}`, color: '#10b981' }, { label: 'Expense', value: `₹${bar.expense.toLocaleString('en-IN')}`, color: '#f43f5e' }, { label: 'Net', value: `${net >= 0 ? '+' : '-'}₹${Math.abs(net).toLocaleString('en-IN')}` }])}
                    />
                    {bar.income > 0 && <rect x={cx - bw - 1} y={90 - incH} width={bw} height={incH} rx={2} fill="url(#landingIncomeGrad)" />}
                    <rect x={cx + 1} y={90 - expH} width={bw} height={expH} rx={2} fill="url(#landingExpenseGrad)" />
                    <text x={cx} y="103" textAnchor="middle" fontSize={6} fill="currentColor" fillOpacity={0.4}>{bar.day}</text>
                  </g>
                )
              })}
            </svg>
            <div className="mt-1 flex items-center gap-4 px-1">
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-500/80" />Income</span>
              <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="inline-block h-2 w-3 rounded-sm bg-rose-500/80" />Expense</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { icon: '🏆', label: 'Largest', value: '₹4,600', sub: 'Friday shopping', color: '#f43f5e' },
              { icon: '📊', label: 'Avg/day', value: '₹800', sub: 'across 23 txns', color: '#7c3aed' },
              { icon: '👥', label: 'Group share', value: '₹3,200', sub: '4 linked', color: '#0891b2' },
            ].map((ins) => (
              <div
                key={ins.label}
                className="rounded-xl border border-border bg-background/50 px-3 py-2 cursor-default"
                style={{ borderLeftWidth: '3px', borderLeftColor: ins.color }}
                onMouseEnter={(e) => showTip(e, [{ label: ins.label }, { label: 'Value', value: ins.value, color: ins.color }, { label: ins.sub }])}
                onMouseLeave={hideTip}
                onTouchStart={(e) => showTip(e, [{ label: ins.label }, { label: 'Value', value: ins.value, color: ins.color }, { label: ins.sub }])}
              >
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="text-xs">{ins.icon}</span>
                  <p className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">{ins.label}</p>
                </div>
                <p className="text-[11px] font-black tabular-nums" style={{ color: ins.color }}>{ins.value}</p>
                <p className="text-[9px] text-muted-foreground">{ins.sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Budget Progress</h3>
              <span className="text-[10px] text-muted-foreground">5 limits set</span>
            </div>
            <div className="space-y-2">
              {demoBudgetCategories.map((cat) => {
                const pct = Math.min((cat.spent / cat.limit) * 100, 100)
                const over = cat.spent > cat.limit
                const barColor = over ? '#ef4444' : pct > 80 ? '#f59e0b' : cat.color
                return (
                  <div
                    key={cat.label}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 cursor-default ${over ? 'bg-red-500/5 border border-red-500/20' : 'bg-muted/30'}`}
                    onMouseEnter={(e) => showTip(e, [{ label: cat.label }, { label: 'Spent', value: `₹${cat.spent.toLocaleString('en-IN')}`, color: barColor }, { label: 'Budget', value: `₹${cat.limit.toLocaleString('en-IN')}` }, { label: 'Usage', value: `${Math.round(pct)}%${over ? ' (Over)' : ''}` }])}
                    onMouseLeave={hideTip}
                    onTouchStart={(e) => showTip(e, [{ label: cat.label }, { label: 'Spent', value: `₹${cat.spent.toLocaleString('en-IN')}`, color: barColor }, { label: 'Budget', value: `₹${cat.limit.toLocaleString('en-IN')}` }, { label: 'Usage', value: `${Math.round(pct)}%${over ? ' (Over)' : ''}` }])}
                  >
                    <div className="relative h-9 w-9 shrink-0">
                      <div className="h-9 w-9 rounded-full" style={{ background: `conic-gradient(${barColor} 0 ${Math.round(pct)}%, hsl(var(--muted)) ${Math.round(pct)}% 100%)` }} />
                      <div className="absolute inset-[4px] rounded-full bg-card" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[8px] font-bold" style={{ color: barColor }}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{cat.icon}</span>
                        <span className="text-[11px] font-medium truncate">{cat.label}</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground tabular-nums">
                        ₹{cat.spent.toLocaleString('en-IN')} / ₹{cat.limit.toLocaleString('en-IN')}
                        {over && <span className="text-red-500 font-semibold ml-1">over!</span>}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Spending by Day</h3>
              <span className="text-[10px] text-muted-foreground">weekly pattern</span>
            </div>
            <div className="flex items-end gap-1.5 h-16">
              {(['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const).map((day, i) => {
                const val = demoWeekdaySpend[i]!
                const maxV = Math.max(...demoWeekdaySpend)
                const pct = (val / maxV) * 100
                const isWeekend = i === 0 || i === 6
                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center gap-1 cursor-default"
                    onMouseEnter={(e) => showTip(e, [{ label: day }, { label: 'Spent', value: `₹${val.toLocaleString('en-IN')}`, color: isWeekend ? '#f59e0b' : '#f43f5e' }])}
                    onMouseLeave={hideTip}
                    onTouchStart={(e) => showTip(e, [{ label: day }, { label: 'Spent', value: `₹${val.toLocaleString('en-IN')}`, color: isWeekend ? '#f59e0b' : '#f43f5e' }])}
                  >
                    <div className="w-full flex items-end" style={{ height: 48 }}>
                      <div className={`w-full rounded-t-md ${isWeekend ? 'bg-amber-500/70' : 'bg-rose-500/70'}`} style={{ height: `${Math.max(pct, 6)}%` }} />
                    </div>
                    <span className="text-[8px] text-muted-foreground">{day}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm cursor-default" onMouseEnter={(e) => showTip(e, [{ label: 'Savings Rate' }, { label: 'Saved', value: '+56%', color: '#10b981' }, { label: 'Net', value: '+₹23,600' }])} onMouseLeave={hideTip} onTouchStart={(e) => showTip(e, [{ label: 'Savings Rate' }, { label: 'Saved', value: '+56%', color: '#10b981' }, { label: 'Net', value: '+₹23,600' }])}>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Income vs Expenses</h3>
            <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">+56% saved</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="h-24 w-24 rounded-full" style={{ background: 'conic-gradient(#10b981 0 70%, #f43f5e 70% 100%)' }} />
              <div className="absolute inset-[12px] rounded-full bg-card" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-xs font-bold text-emerald-500">56%</p>
                <p className="text-[9px] text-muted-foreground">saved</p>
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground">Income</p>
                <p className="text-lg font-black leading-tight text-emerald-500 tabular-nums">₹42,000</p>
              </div>
              <div className="rounded-lg bg-muted/40 px-2.5 py-2">
                <p className="text-[10px] text-muted-foreground">Expenses</p>
                <p className="text-lg font-black leading-tight text-rose-500 tabular-nums">₹18,400</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-lg border border-border/60 bg-background/60 px-2.5 py-2">
            <p className="text-[10px] font-medium text-muted-foreground">Net savings</p>
            <p className="text-base font-black text-primary tabular-nums">+₹23,600</p>
          </div>
        </div>

        <div className="sm:col-span-2 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold mb-2">Category breakdown</h3>
          <div className="space-y-1.5">
            {demoBudgetCategories.slice(0, 4).map((cat) => {
              const pct = Math.round((cat.spent / 18400) * 100)
              return (
                <div
                  key={cat.label}
                  className="flex items-center gap-2 cursor-default"
                  onMouseEnter={(e) => showTip(e, [{ label: cat.label }, { label: 'Spent', value: `₹${cat.spent.toLocaleString('en-IN')}`, color: cat.color }, { label: 'Share', value: `${pct}%` }])}
                  onMouseLeave={hideTip}
                  onTouchStart={(e) => showTip(e, [{ label: cat.label }, { label: 'Spent', value: `₹${cat.spent.toLocaleString('en-IN')}`, color: cat.color }, { label: 'Share', value: `${pct}%` }])}
                >
                  <span className="text-sm shrink-0">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] truncate">{cat.label}</span>
                      <span className="text-[11px] font-semibold tabular-nums ml-2 shrink-0">₹{cat.spent.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground w-7 text-right shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <FloatingTooltip tip={tip} />
    </section>
  )
}
