'use client'

import { useRef, useState } from 'react'
import { ArrowRight, BarChart3, PieChart, Share2 } from 'lucide-react'

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

const members = [
  { name: 'Aarav', paid: 12840, share: 6420, color: '#10b981' },
  { name: 'Mia', paid: 4200, share: 6420, color: '#0ea5e9' },
  { name: 'Noah', paid: 1380, share: 6420, color: '#d946ef' },
]

const categoryMix = [
  { label: 'Food', amount: 7200, color: '#f43f5e' },
  { label: 'Stay', amount: 6100, color: '#6366f1' },
  { label: 'Transport', amount: 2800, color: '#06b6d4' },
  { label: 'Activities', amount: 2320, color: '#f59e0b' },
]

const timeline = [2200, 3400, 5100, 4600, 6200, 5400, 5900]
const timelineLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function GroupExpenseShowcase() {
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

  const timelineMax = Math.max(...timeline)
  const timelinePoints = timeline
    .map((value, index) => {
      const x = 20 + index * 46.6
      const y = 120 - (value / timelineMax) * 92
      return `${x},${y}`
    })
    .join(' ')
  const timelineArea = `20,120 ${timelinePoints} 300,120`

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Live Preview</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Group expense intelligence, beautifully visualized
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Same style as your actual group split screen: analytics, settle-up guidance, and glanceable balances.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-3">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Group Overview</p>
              <h3 className="text-lg font-semibold">Goa Weekend Crew</h3>
              <p className="text-xs text-muted-foreground">Apr 12 - Apr 15 • 3 members • 9 expenses</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total spent</p>
              <p className="text-base font-bold">INR 19,420</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div
              className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 cursor-default"
              onMouseEnter={(e) => showTip(e, [{ label: 'Your Position' }, { label: 'You are owed', value: 'INR 6,420', color: '#10b981' }, { label: 'From Mia + Noah' }])}
              onMouseLeave={hideTip}
              onTouchStart={(e) => showTip(e, [{ label: 'Your Position' }, { label: 'You are owed', value: 'INR 6,420', color: '#10b981' }, { label: 'From Mia + Noah' }])}
            >
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">You are owed</p>
              <p className="mt-1 text-2xl font-extrabold tracking-tight">INR 6,420</p>
              <p className="mt-1 text-xs text-muted-foreground">Mia and Noah should settle to Aarav</p>
            </div>
            <div
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 cursor-default"
              onMouseEnter={(e) => showTip(e, [{ label: 'Suggested payments' }, { label: 'Noah → Aarav', value: 'INR 5,040', color: '#f59e0b' }, { label: 'Mia → Aarav', value: 'INR 2,220', color: '#f59e0b' }])}
              onMouseLeave={hideTip}
              onTouchStart={(e) => showTip(e, [{ label: 'Suggested payments' }, { label: 'Noah → Aarav', value: 'INR 5,040', color: '#f59e0b' }, { label: 'Mia → Aarav', value: 'INR 2,220', color: '#f59e0b' }])}
            >
              <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Suggested payment</p>
              <p className="mt-1 text-lg font-semibold">Noah → Aarav: INR 5,040</p>
              <p className="text-sm font-medium">Mia → Aarav: INR 2,220</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-background/40 p-4">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Spending timeline</p>
            </div>
            <svg viewBox="0 0 320 140" className="h-36 w-full overflow-visible">
              <line x1="20" y1="120" x2="300" y2="120" className="stroke-border" />
              <line x1="20" y1="90" x2="300" y2="90" className="stroke-border/70" />
              <line x1="20" y1="60" x2="300" y2="60" className="stroke-border/50" />
              <line x1="20" y1="30" x2="300" y2="30" className="stroke-border/40" />

              <polygon points={timelineArea} className="fill-primary/15" />
              <polyline points={timelinePoints} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

              {timeline.map((value, index) => {
                const x = 20 + index * 46.6
                const y = 120 - (value / timelineMax) * 92
                const prev = index > 0 ? timeline[index - 1] : value
                const delta = value - prev
                return (
                  <g key={index}>
                    <circle
                      cx={x}
                      cy={y}
                      r="5"
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={(e) => showTip(e, [{ label: timelineLabels[index] ?? `Day ${index + 1}` }, { label: 'Spent', value: `INR ${value.toLocaleString('en-IN')}`, color: '#6366f1' }, { label: 'Change', value: `${delta >= 0 ? '+' : ''}INR ${delta.toLocaleString('en-IN')}` }])}
                      onMouseLeave={hideTip}
                      onTouchStart={(e) => showTip(e, [{ label: timelineLabels[index] ?? `Day ${index + 1}` }, { label: 'Spent', value: `INR ${value.toLocaleString('en-IN')}`, color: '#6366f1' }, { label: 'Change', value: `${delta >= 0 ? '+' : ''}INR ${delta.toLocaleString('en-IN')}` }])}
                    />
                    <circle cx={x} cy={y} r="3.2" className="fill-primary" />
                  </g>
                )
              })}

              {timelineLabels.map((label, index) => {
                const x = 20 + index * 46.6
                return (
                  <text key={label} x={x} y="134" textAnchor="middle" className="fill-muted-foreground text-[9px]">
                    {label}
                  </text>
                )
              })}
            </svg>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">Category mix</h3>
            </div>
          </div>

          <div className="mb-4 flex items-center gap-4 rounded-xl border border-border bg-background/50 p-3">
            <div
              className="relative h-20 w-20 rounded-full cursor-default"
              style={{ background: 'conic-gradient(#f43f5e 0 37%, #6366f1 37% 68%, #06b6d4 68% 82%, #f59e0b 82% 100%)' }}
              onMouseEnter={(e) => showTip(e, [{ label: 'Top category' }, { label: 'Food', value: '37%', color: '#f43f5e' }, { label: 'INR 7,200' }])}
              onMouseLeave={hideTip}
              onTouchStart={(e) => showTip(e, [{ label: 'Top category' }, { label: 'Food', value: '37%', color: '#f43f5e' }, { label: 'INR 7,200' }])}
            >
              <div className="absolute inset-[11px] rounded-full bg-background" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Top category</p>
              <p className="text-lg font-semibold">Food • 37%</p>
              <p className="text-xs text-muted-foreground">Best for quick visual split of group spending</p>
            </div>
          </div>

          <div className="space-y-2">
            {categoryMix.map((item) => {
              const percent = Math.round((item.amount / 19420) * 100)
              return (
                <div
                  key={item.label}
                  className="space-y-1 cursor-default"
                  onMouseEnter={(e) => showTip(e, [{ label: item.label }, { label: 'Spent', value: `INR ${item.amount.toLocaleString('en-IN')}`, color: item.color }, { label: 'Share', value: `${percent}%` }])}
                  onMouseLeave={hideTip}
                  onTouchStart={(e) => showTip(e, [{ label: item.label }, { label: 'Spent', value: `INR ${item.amount.toLocaleString('en-IN')}`, color: item.color }, { label: 'Share', value: `${percent}%` }])}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground">INR {item.amount.toLocaleString('en-IN')} • {percent}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className="h-2 rounded-full" style={{ width: `${percent}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
            <p className="mb-2 text-sm font-semibold">Member balances</p>
            <div className="space-y-2.5">
              {members.map((m) => {
                const balance = m.paid - m.share
                const magnitude = Math.round((Math.abs(balance) / 6420) * 100)
                return (
                  <div
                    key={m.name}
                    className="rounded-lg bg-muted/40 px-3 py-2.5 cursor-default"
                    onMouseEnter={(e) => showTip(e, [{ label: m.name }, { label: 'Paid', value: `INR ${m.paid.toLocaleString('en-IN')}`, color: m.color }, { label: 'Share', value: `INR ${m.share.toLocaleString('en-IN')}` }, { label: 'Balance', value: `${balance >= 0 ? '+' : '-'}INR ${Math.abs(balance).toLocaleString('en-IN')}` }])}
                    onMouseLeave={hideTip}
                    onTouchStart={(e) => showTip(e, [{ label: m.name }, { label: 'Paid', value: `INR ${m.paid.toLocaleString('en-IN')}`, color: m.color }, { label: 'Share', value: `INR ${m.share.toLocaleString('en-IN')}` }, { label: 'Balance', value: `${balance >= 0 ? '+' : '-'}INR ${Math.abs(balance).toLocaleString('en-IN')}` }])}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.color }} />
                        <span className="text-sm font-medium">{m.name}</span>
                      </div>
                      <span className={`text-xs font-semibold ${balance >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {balance >= 0 ? '+' : '-'}INR {Math.abs(balance).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="h-1.5 rounded-full bg-background">
                      <div
                        className={`h-1.5 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ width: `${Math.max(magnitude, 8)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium">
              <Share2 className="h-3 w-3" />
              Share summary
            </span>
            <span className="rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium">Export as image</span>
            <span className="rounded-md border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium">Settle up instantly</span>
          </div>

          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Smart settle-up</p>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className="font-medium">Noah</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">Aarav</span>
              <span className="ml-auto font-semibold text-emerald-600 dark:text-emerald-400">INR 5,040</span>
            </div>
          </div>
        </div>
      </div>

      <FloatingTooltip tip={tip} />
    </section>
  )
}
