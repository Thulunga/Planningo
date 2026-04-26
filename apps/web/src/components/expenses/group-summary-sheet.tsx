'use client'

import { useState, useRef } from 'react'
import { format } from 'date-fns'
import { Mail, Copy, Check, ImageDown, Loader2 } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@planningo/ui'
import { EXPENSE_CATEGORIES, CHART_COLORS, CATEGORY_GROUP_COLORS } from './expense-form-dialog'
import { toast } from 'sonner'

// TYPES
interface Member {
  user_id: string
  role: string
  profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
}

export interface GroupSummarySheetProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  group: { id: string; name: string; currency: string; category: string }
  expenses: any[]
  settlements: any[]
  members: Member[]
  balances: Record<string, number>
}

// TOOLTIP
interface TooltipState { x: number; y: number; lines: { label: string; value?: string; color?: string }[] }

function ChartTooltip({ data }: { data: TooltipState | null }) {
  if (!data) return null
  return (
    <div
      className="pointer-events-none fixed z-[999] min-w-[120px] rounded-xl border border-white/10 bg-zinc-900/96 backdrop-blur px-3 py-2 shadow-2xl"
      style={{ left: data.x + 14, top: data.y, transform: 'translateY(-50%)' }}
    >
      {data.lines.map((l, i) => (
        <div key={i} className={`flex items-center gap-2 ${i < data.lines.length - 1 ? 'mb-0.5' : ''}`}>
          {l.color && <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />}
          <span className={`text-xs ${i === 0 ? 'font-semibold text-white' : 'text-zinc-400'}`}>{l.label}</span>
          {l.value && <span className="ml-auto pl-3 text-xs font-bold text-white tabular-nums">{l.value}</span>}
        </div>
      ))}
    </div>
  )
}

// DONUT CHART
interface PieSlice { label: string; value: number; color: string; emoji: string }

function DonutChart({ data, currency }: { data: PieSlice[]; currency: string }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  if (!data.length || data.every((d) => d.value === 0)) return null

  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 80; const cy = 80; const r = 58; const innerR = 36

  let angle = -Math.PI / 2
  const slices = data.map((d, idx) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const sa = angle; const ea = angle + sweep
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

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <svg viewBox="0 0 160 160" className="w-36 h-36">
          {slices.map((s) => {
            const isH = hovered === s.idx
            const push = isH ? 4 : 0
            return (
              <path
                key={s.idx}
                d={s.path}
                fill={s.color}
                fillOpacity={hovered === null ? 1 : isH ? 1 : 0.3}
                style={{
                  transform: `translate(${Math.cos(s.midA) * push}px, ${Math.sin(s.midA) * push}px)`,
                  transition: 'all 0.12s ease',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  setHovered(s.idx)
                  setTooltip({
                    x: e.clientX, y: e.clientY,
                    lines: [
                      { label: `${s.emoji} ${s.label}` },
                      { label: currency, value: s.value.toFixed(2), color: s.color },
                      { label: 'of total', value: `${s.pct}%` },
                    ],
                  })
                }}
                onMouseLeave={() => { setHovered(null); setTooltip(null) }}
              />
            )
          })}
          {h ? (
            <>
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize={18} fill={h.color}>{h.emoji}</text>
              <text x={cx} y={cy + 8} textAnchor="middle" fontSize={9} fontWeight="600" fill={h.color}>{h.pct}%</text>
            </>
          ) : (
            <>
              <text x={cx} y={cy - 4} textAnchor="middle" fontSize={9} fontWeight="600" fill="currentColor" fillOpacity={0.7}>{data.length}</text>
              <text x={cx} y={cy + 9} textAnchor="middle" fontSize={8} fill="currentColor" fillOpacity={0.5}>cats</text>
            </>
          )}
        </svg>
        <ChartTooltip data={tooltip} />
      </div>
      <div className="flex-1 space-y-1.5 min-w-0">
        {slices.map((s) => (
          <div
            key={s.idx}
            className={`flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors cursor-default ${hovered === s.idx ? 'bg-accent' : 'hover:bg-accent/50'}`}
            onMouseEnter={() => setHovered(s.idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-muted-foreground truncate flex-1">{s.emoji} {s.label}</span>
            <span className="text-[11px] font-semibold shrink-0 tabular-nums">{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// MEMBER BARS
function MemberBars({ data, currency }: { data: { name: string; amount: number; color: string }[]; currency: string }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const max = Math.max(...data.map((d) => d.amount), 0.01)
  const totalPaid = data.reduce((s, d) => s + d.amount, 0)

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{d.name}</span>
            <span className="ml-2 shrink-0 text-xs font-semibold">{currency} {d.amount.toFixed(2)}</span>
          </div>
          <div
            className="h-2.5 rounded-full bg-muted/50 overflow-hidden cursor-pointer"
            onMouseEnter={(e) => setTooltip({
              x: e.clientX, y: e.clientY,
              lines: [
                { label: d.name },
                { label: 'Paid', value: `${currency} ${d.amount.toFixed(2)}`, color: d.color },
                { label: 'Share', value: `${Math.round((d.amount / totalPaid) * 100)}%` },
              ],
            })}
            onMouseLeave={() => setTooltip(null)}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.amount / max) * 100}%`, backgroundColor: d.color, transition: 'width 0.6s ease' }}
            />
          </div>
        </div>
      ))}
      <ChartTooltip data={tooltip} />
    </div>
  )
}

// HELPERS
function memberName(m: Member) { return m.profiles?.full_name ?? m.profiles?.email ?? 'Member' }

function simplifyDebts(members: Member[], balances: Record<string, number>) {
  const people = members.map((m) => ({ id: m.user_id, name: memberName(m), bal: balances[m.user_id] ?? 0 }))
  const c = people.filter((p) => p.bal > 0.01).sort((a, b) => b.bal - a.bal).map((x) => ({ ...x }))
  const d = people.filter((p) => p.bal < -0.01).sort((a, b) => a.bal - b.bal).map((x) => ({ ...x }))
  const arrows: { from: string; to: string; amount: number }[] = []
  for (const debtor of d) {
    for (const creditor of c) {
      if (Math.abs(debtor.bal) < 0.005) break
      if (creditor.bal < 0.005) continue
      const amt = Math.min(Math.abs(debtor.bal), creditor.bal)
      arrows.push({ from: debtor.name, to: creditor.name, amount: amt })
      debtor.bal += amt
      creditor.bal -= amt
    }
  }
  return arrows
}

function buildTextSummary(
  group: GroupSummarySheetProps['group'],
  expenses: any[],
  settlements: any[],
  members: Member[],
  balances: Record<string, number>,
  topCategories: { label: string; emoji: string; amount: number; pct: number }[],
  memberPaid: { name: string; amount: number }[],
  arrows: { from: string; to: string; amount: number }[],
) {
  const total = expenses.reduce((s, e) => s + e.amount, 0)
  const dateRange = expenses.length > 0 ? {
    start: new Date(Math.min(...expenses.map((e) => new Date(e.expense_date).getTime()))),
    end: new Date(Math.max(...expenses.map((e) => new Date(e.expense_date).getTime()))),
  } : null

  const lines: string[] = []
  lines.push(`📊 *${group.name} - Expense Summary*`)
  if (dateRange) lines.push(`📅 ${format(dateRange.start, 'MMM d')} – ${format(dateRange.end, 'MMM d, yyyy')}`)
  lines.push('')
  lines.push(`💰 *Total Expenses:* ${group.currency} ${total.toFixed(2)}`)
  lines.push(`🧾 *Expenses:* ${expenses.length}  💳 *Payments:* ${settlements.length}  👥 *Members:* ${members.length}`)
  if (topCategories.length > 0) {
    lines.push(''); lines.push('📋 *Top Categories:*')
    topCategories.forEach((c) => lines.push(`  ${c.emoji} ${c.label}: ${group.currency} ${c.amount.toFixed(2)} (${c.pct}%)`))
  }
  if (memberPaid.length > 0) {
    lines.push(''); lines.push('💸 *Who Paid:*')
    memberPaid.forEach((m) => lines.push(`  • ${m.name}: ${group.currency} ${m.amount.toFixed(2)}`))
  }
  lines.push(''); lines.push('⚖️ *Balances:*')
  members.forEach((m) => {
    const bal = balances[m.user_id] ?? 0
    const status = bal > 0.01 ? 'gets back' : bal < -0.01 ? 'owes' : 'settled ✓'
    lines.push(`  • ${memberName(m)}: ${bal >= 0 ? '+' : ''}${group.currency} ${Math.abs(bal).toFixed(2)} (${status})`)
  })
  if (arrows.length > 0) {
    lines.push(''); lines.push('🔄 *To Settle Up:*')
    arrows.forEach((a) => lines.push(`  → ${a.from} pays ${a.to}: ${group.currency} ${a.amount.toFixed(2)}`))
  }
  lines.push(''); lines.push('_Generated by Planningo_ 🚀')
  return lines.join('\n')
}

// MAIN
export function GroupSummarySheet({ open, onOpenChange, group, expenses, settlements, members, balances }: GroupSummarySheetProps) {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)
  const captureRef = useRef<HTMLDivElement>(null)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const dateRange = expenses.length > 0 ? {
    start: new Date(Math.min(...expenses.map((e) => new Date(e.expense_date).getTime()))),
    end: new Date(Math.max(...expenses.map((e) => new Date(e.expense_date).getTime()))),
  } : null

  const catTotals = expenses.reduce<Record<string, number>>((acc, exp) => {
    const k = exp.category ?? 'other'; acc[k] = (acc[k] ?? 0) + exp.amount; return acc
  }, {})
  const catEntries = Object.entries(catTotals).sort(([, a], [, b]) => b - a)
  const topCatEntries = catEntries.slice(0, 5)
  const otherAmt = catEntries.slice(5).reduce((s, [, v]) => s + v, 0)

  const topCategories = [
    ...topCatEntries.map(([cat, amount]) => {
      const def = EXPENSE_CATEGORIES.find((c) => c.value === cat)
      return {
        value: cat, label: def?.label ?? cat, emoji: def?.emoji ?? '📦', amount,
        pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: CATEGORY_GROUP_COLORS[def?.group ?? 'Other'] ?? '#94a3b8',
      }
    }),
    ...(otherAmt > 0.01 ? [{ value: 'other_rest', label: 'Other', emoji: '📦', amount: otherAmt, pct: Math.round((otherAmt / totalExpenses) * 100), color: '#94a3b8' }] : []),
  ]

  const pieData = topCategories.map((c) => ({ label: c.label, value: c.amount, color: c.color, emoji: c.emoji }))

  const memberPaid = members
    .map((m, i) => ({
      id: m.user_id, name: memberName(m),
      amount: expenses.filter((e) => e.paid_by === m.user_id).reduce((s, e) => s + e.amount, 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const memberBalances = members.map((m) => ({
    id: m.user_id, name: memberName(m), balance: balances[m.user_id] ?? 0,
    avatar: m.profiles?.avatar_url, initials: (m.profiles?.full_name ?? m.profiles?.email ?? 'M')[0].toUpperCase(),
  }))

  const arrows = simplifyDebts(members, balances)
  const getText = () => buildTextSummary(group, expenses, settlements, members, balances, topCategories, memberPaid, arrows)

  async function handleCopy() {
    await navigator.clipboard.writeText(getText())
    setCopied(true); toast.success('Summary copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() { window.open(`https://wa.me/?text=${encodeURIComponent(getText())}`, '_blank', 'noopener,noreferrer') }
  function handleTelegram() { window.open(`https://t.me/share/url?url=${encodeURIComponent('https://planningo.app')}&text=${encodeURIComponent(getText())}`, '_blank', 'noopener,noreferrer') }
  function handleEmail() { window.open(`mailto:?subject=${encodeURIComponent(`${group.name} - Expense Summary`)}&body=${encodeURIComponent(getText())}`, '_blank', 'noopener,noreferrer') }

  async function handleSaveImage() {
    const el = captureRef.current
    if (!el) return
    setExporting(true)
    try {
      const scrollDiv = el.querySelector('[data-scroll-body]') as HTMLElement | null
      const origOverflow = scrollDiv?.style.overflow ?? ''
      const origMaxH = scrollDiv?.style.maxHeight ?? ''
      if (scrollDiv) { scrollDiv.style.overflow = 'visible'; scrollDiv.style.maxHeight = 'none' }

      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#0f0f11',
        width: el.offsetWidth,
        height: scrollDiv ? el.offsetHeight - (scrollDiv?.offsetHeight ?? 0) + scrollDiv.scrollHeight : el.scrollHeight,
        windowWidth: el.offsetWidth,
      })

      if (scrollDiv) { scrollDiv.style.overflow = origOverflow; scrollDiv.style.maxHeight = origMaxH }

      canvas.toBlob(async (blob) => {
        if (!blob) { toast.error('Could not generate image'); setExporting(false); return }
        const file = new File([blob], `${group.name}-summary.png`, { type: 'image/png' })
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: `${group.name} - Expense Summary` })
        } else {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url; a.download = `${group.name}-summary.png`; a.click()
          URL.revokeObjectURL(url)
          toast.success('Image downloaded!')
        }
        setExporting(false)
      }, 'image/png')
    } catch (err) {
      console.error(err)
      toast.error('Image export failed - try copying text instead')
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] flex flex-col p-0 max-w-md gap-0 overflow-hidden">

        <div ref={captureRef} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {/* Gradient header */}
          <div className="shrink-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-5 pb-6 pt-5">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold leading-snug text-white">{group.name}</DialogTitle>
            </DialogHeader>
            <p className="mt-0.5 text-sm text-violet-200">
              {dateRange ? `${format(dateRange.start, 'MMM d')} – ${format(dateRange.end, 'MMM d, yyyy')}` : 'No expenses yet'}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Total Spent', value: `${group.currency} ${totalExpenses.toFixed(2)}` },
                { label: 'Expenses', value: String(expenses.length) },
                { label: 'Members', value: String(members.length) },
              ].map((s) => (
                <div key={s.label} className="rounded-xl bg-white/15 px-2 py-2.5 text-center">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-200">{s.label}</p>
                  <p className="mt-0.5 text-base font-bold leading-tight text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scrollable body */}
          <div data-scroll-body className="flex-1 overflow-y-auto">
            <div className="space-y-6 p-4">
              {topCategories.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spending by Category</h3>
                  <DonutChart data={pieData} currency={group.currency} />
                </section>
              )}
              {memberPaid.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who Paid What</h3>
                  <MemberBars data={memberPaid} currency={group.currency} />
                </section>
              )}
              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Balances</h3>
                <div className="space-y-2">
                  {memberBalances.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-0.5">
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage src={m.avatar ?? undefined} />
                        <AvatarFallback className="text-xs">{m.initials}</AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate text-sm">{m.name}</span>
                      <span className={`shrink-0 text-xs font-semibold ${m.balance > 0.01 ? 'text-emerald-500' : m.balance < -0.01 ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {m.balance > 0.01 ? `gets back ${group.currency} ${m.balance.toFixed(2)}` : m.balance < -0.01 ? `owes ${group.currency} ${Math.abs(m.balance).toFixed(2)}` : 'settled ✓'}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
              {arrows.length > 0 && (
                <section>
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">To Settle Up</h3>
                  <div className="space-y-2">
                    {arrows.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-3 py-2.5">
                        <span className="truncate text-sm font-medium">{a.from}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">→ pays</span>
                        <span className="flex-1 truncate text-sm font-medium">{a.to}</span>
                        <span className="shrink-0 text-sm font-bold text-emerald-500 tabular-nums">{group.currency} {a.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              <div className="h-2" />
            </div>
          </div>
        </div>

        {/* Share footer - NOT captured */}
        <div className="shrink-0 space-y-2.5 border-t border-border bg-card px-4 pb-4 pt-3">
          <p className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Share this Summary</p>
          <Button
            onClick={handleSaveImage}
            disabled={exporting}
            className="w-full gap-2 border-0 bg-gradient-to-r from-violet-600 to-indigo-600 font-semibold text-white hover:from-violet-700 hover:to-indigo-700"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageDown className="h-4 w-4" />}
            {exporting ? 'Generating…' : 'Save / Share as Image'}
          </Button>
          <div className="grid grid-cols-3 gap-2">
            <button onClick={handleWhatsApp} className="flex flex-col items-center gap-1 rounded-xl border border-[#25D366]/25 bg-[#25D366]/8 p-2.5 transition-colors hover:bg-[#25D366]/15">
              <span className="text-2xl leading-none">💬</span>
              <span className="text-[11px] font-semibold text-[#25D366]">WhatsApp</span>
            </button>
            <button onClick={handleTelegram} className="flex flex-col items-center gap-1 rounded-xl border border-[#0088cc]/25 bg-[#0088cc]/8 p-2.5 transition-colors hover:bg-[#0088cc]/15">
              <span className="text-2xl leading-none">✈️</span>
              <span className="text-[11px] font-semibold text-[#0088cc]">Telegram</span>
            </button>
            <button onClick={handleEmail} className="flex flex-col items-center gap-1 rounded-xl border border-orange-500/25 bg-orange-500/8 p-2.5 transition-colors hover:bg-orange-500/15">
              <Mail className="h-5 w-5 text-orange-500" />
              <span className="text-[11px] font-semibold text-orange-500">Email</span>
            </button>
          </div>
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium transition-colors hover:bg-accent"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy as Text'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
