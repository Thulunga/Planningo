'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Share2, Mail, Copy, Check } from 'lucide-react'
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
import { EXPENSE_CATEGORIES } from './expense-form-dialog'
import { toast } from 'sonner'

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Constants ────────────────────────────────────────────────────────────────
const CHART_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16',
]

const CATEGORY_GROUP_COLORS: Record<string, string> = {
  'Food & Drink':      '#f59e0b',
  'Transport':         '#3b82f6',
  'Accommodation':     '#8b5cf6',
  'Entertainment':     '#ec4899',
  'Shopping':          '#10b981',
  'Health & Wellness': '#ef4444',
  'Bills & Utilities': '#6366f1',
  'Travel':            '#14b8a6',
  'Work & Education':  '#f97316',
  'Other':             '#94a3b8',
}

// ─── SVG Pie/Donut Chart ──────────────────────────────────────────────────────
interface PieSlice { label: string; value: number; color: string; emoji: string }

function DonutChart({ data }: { data: PieSlice[] }) {
  if (!data.length || data.every((d) => d.value === 0)) return null

  const total = data.reduce((s, d) => s + d.value, 0)
  const cx = 80; const cy = 80; const r = 58; const innerR = 36

  let angle = -Math.PI / 2

  const slices = data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI
    const sa = angle; const ea = angle + sweep
    angle += sweep
    const x1 = cx + r * Math.cos(sa); const y1 = cy + r * Math.sin(sa)
    const x2 = cx + r * Math.cos(ea); const y2 = cy + r * Math.sin(ea)
    const ix1 = cx + innerR * Math.cos(ea); const iy1 = cy + innerR * Math.sin(ea)
    const ix2 = cx + innerR * Math.cos(sa); const iy2 = cy + innerR * Math.sin(sa)
    const lg = sweep > Math.PI ? 1 : 0
    return {
      ...d,
      pct: Math.round((d.value / total) * 100),
      path: `M ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerR} ${innerR} 0 ${lg} 0 ${ix2} ${iy2} Z`,
    }
  })

  return (
    <svg viewBox="0 0 160 160" className="w-36 h-36 shrink-0">
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} />
      ))}
      {/* Center label */}
      <text x={cx} y={cy - 7} textAnchor="middle" fontSize="11" className="fill-muted-foreground">
        {data.length}
      </text>
      <text x={cx} y={cx + 7} textAnchor="middle" fontSize="9" className="fill-muted-foreground">
        cats
      </text>
    </svg>
  )
}

// ─── Horizontal bar chart for member contributions ────────────────────────────
function MemberBars({ data, currency }: { data: { name: string; amount: number; color: string }[]; currency: string }) {
  const max = Math.max(...data.map((d) => d.amount))
  if (max === 0) return null

  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i}>
          <div className="flex justify-between mb-1">
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">{d.name}</span>
            <span className="text-xs font-semibold ml-2 shrink-0">{currency} {d.amount.toFixed(2)}</span>
          </div>
          <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.amount / max) * 100}%`, backgroundColor: d.color, transition: 'width 0.6s ease' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function memberName(m: Member) {
  return m.profiles?.full_name ?? m.profiles?.email ?? 'Member'
}

/** Greedy debt simplification — returns minimum-transactions payment list */
function simplifyDebts(members: Member[], balances: Record<string, number>) {
  const people = members.map((m) => ({ id: m.user_id, name: memberName(m), bal: balances[m.user_id] ?? 0 }))
  const creditors = people.filter((p) => p.bal > 0.01).sort((a, b) => b.bal - a.bal)
  const debtors   = people.filter((p) => p.bal < -0.01).sort((a, b) => a.bal - b.bal)

  const arrows: { from: string; to: string; amount: number }[] = []
  const c = creditors.map((x) => ({ ...x }))
  const d = debtors.map((x) => ({ ...x }))

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

// ─── Text summary generator ───────────────────────────────────────────────────
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
    end:   new Date(Math.max(...expenses.map((e) => new Date(e.expense_date).getTime()))),
  } : null

  const lines: string[] = []
  lines.push(`📊 *${group.name} — Expense Summary*`)
  if (dateRange) lines.push(`📅 ${format(dateRange.start, 'MMM d')}-${format(dateRange.end, 'MMM d, yyyy')}`)
  lines.push(``)
  lines.push(`💰 *Total Expenses:* ${group.currency} ${total.toFixed(2)}`)
  lines.push(`🧾 *Expenses:* ${expenses.length}  💳 *Payments:* ${settlements.length}  👥 *Members:* ${members.length}`)

  if (topCategories.length > 0) {
    lines.push(``)
    lines.push(`📋 *Top Categories:*`)
    topCategories.forEach((c) => lines.push(`  ${c.emoji} ${c.label}: ${group.currency} ${c.amount.toFixed(2)} (${c.pct}%)`))
  }

  if (memberPaid.length > 0) {
    lines.push(``)
    lines.push(`💸 *Who Paid:*`)
    memberPaid.forEach((m) => lines.push(`  • ${m.name}: ${group.currency} ${m.amount.toFixed(2)}`))
  }

  lines.push(``)
  lines.push(`⚖️ *Balances:*`)
  members.forEach((m) => {
    const bal = balances[m.user_id] ?? 0
    const sign = bal >= 0 ? '+' : ''
    const status = bal > 0.01 ? 'gets back' : bal < -0.01 ? 'owes' : 'settled ✓'
    lines.push(`  • ${memberName(m)}: ${sign}${group.currency} ${Math.abs(bal).toFixed(2)} (${status})`)
  })

  if (arrows.length > 0) {
    lines.push(``)
    lines.push(`🔄 *To Settle Up:*`)
    arrows.forEach((a) => lines.push(`  → ${a.from} pays ${a.to}: ${group.currency} ${a.amount.toFixed(2)}`))
  }

  lines.push(``)
  lines.push(`_Generated by Planningo_ 🚀`)
  return lines.join('\n')
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function GroupSummarySheet({ open, onOpenChange, group, expenses, settlements, members, balances }: GroupSummarySheetProps) {
  const [copied, setCopied] = useState(false)

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)

  const dateRange = expenses.length > 0 ? {
    start: new Date(Math.min(...expenses.map((e) => new Date(e.expense_date).getTime()))),
    end:   new Date(Math.max(...expenses.map((e) => new Date(e.expense_date).getTime()))),
  } : null

  // Category totals → top 5 + "Other"
  const catTotals = expenses.reduce<Record<string, number>>((acc, exp) => {
    const k = exp.category ?? 'other'
    acc[k] = (acc[k] ?? 0) + exp.amount
    return acc
  }, {})
  const catEntries = Object.entries(catTotals).sort(([, a], [, b]) => b - a)
  const topN = 5
  const topCatEntries = catEntries.slice(0, topN)
  const otherAmt = catEntries.slice(topN).reduce((s, [, v]) => s + v, 0)

  const topCategories = [
    ...topCatEntries.map(([cat, amount]) => {
      const def = EXPENSE_CATEGORIES.find((c) => c.value === cat)
      return {
        value: cat,
        label: def?.label ?? cat,
        emoji: def?.emoji ?? '📦',
        amount,
        pct: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
        color: CATEGORY_GROUP_COLORS[def?.group ?? 'Other'] ?? '#94a3b8',
      }
    }),
    ...(otherAmt > 0.01 ? [{ value: 'other_rest', label: 'Other', emoji: '📦', amount: otherAmt, pct: Math.round((otherAmt / totalExpenses) * 100), color: '#94a3b8' }] : []),
  ]

  const pieData: PieSlice[] = topCategories.map((c) => ({ label: c.label, value: c.amount, color: c.color, emoji: c.emoji }))

  // Member contribution (how much each paid)
  const memberPaid = members
    .map((m, i) => ({
      id: m.user_id,
      name: memberName(m),
      amount: expenses.filter((e) => e.paid_by === m.user_id).reduce((s, e) => s + e.amount, 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
      avatar: m.profiles?.avatar_url,
      initials: (m.profiles?.full_name ?? m.profiles?.email ?? 'M')[0].toUpperCase(),
    }))
    .filter((m) => m.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const memberBalances = members.map((m) => ({
    id: m.user_id,
    name: memberName(m),
    balance: balances[m.user_id] ?? 0,
    avatar: m.profiles?.avatar_url,
    initials: (m.profiles?.full_name ?? m.profiles?.email ?? 'M')[0].toUpperCase(),
  }))

  const arrows = simplifyDebts(members, balances)

  // ─── Share actions ─────────────────────────────────────────────────────────
  function getText() {
    return buildTextSummary(group, expenses, settlements, members, balances, topCategories, memberPaid, arrows)
  }

  async function handleNativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${group.name} — Expense Summary`, text: getText() })
      } catch {
        handleCopy()
      }
    } else {
      handleCopy()
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(getText())
    setCopied(true)
    toast.success('Summary copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(getText())}`, '_blank', 'noopener,noreferrer')
  }

  function handleTelegram() {
    window.open(`https://t.me/share/url?url=${encodeURIComponent('https://planningo.app')}&text=${encodeURIComponent(getText())}`, '_blank', 'noopener,noreferrer')
  }

  function handleEmail() {
    window.open(`mailto:?subject=${encodeURIComponent(`${group.name} — Expense Summary`)}&body=${encodeURIComponent(getText())}`, '_blank', 'noopener,noreferrer')
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] flex flex-col p-0 max-w-md gap-0 overflow-hidden">

        {/* Gradient header */}
        <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 px-5 pt-5 pb-6 rounded-t-xl shrink-0">
          <DialogTitle className="text-white text-xl font-bold leading-snug">
            {group.name}
          </DialogTitle>
          <p className="text-violet-200 text-sm mt-0.5">
            {dateRange
              ? `${format(dateRange.start, 'MMM d')}-${format(dateRange.end, 'MMM d, yyyy')}`
              : 'No expenses yet'}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Total Spent', value: `${group.currency} ${totalExpenses.toFixed(2)}` },
              { label: 'Expenses', value: String(expenses.length) },
              { label: 'Members', value: String(members.length) },
            ].map((s) => (
              <div key={s.label} className="bg-white/15 rounded-xl py-2.5 px-2 text-center">
                <p className="text-violet-200 text-[10px] font-medium uppercase tracking-wide">{s.label}</p>
                <p className="text-white font-bold text-base leading-tight mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6">

            {/* Category Pie Chart */}
            {topCategories.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Spending by Category
                </h3>
                <div className="flex items-center gap-4">
                  <DonutChart data={pieData} />
                  <div className="flex-1 space-y-1.5 min-w-0">
                    {topCategories.map((cat) => (
                      <div key={cat.value} className="flex items-center gap-1.5 min-w-0">
                        <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-muted-foreground truncate flex-1">
                          {cat.emoji} {cat.label}
                        </span>
                        <span className="text-xs font-semibold shrink-0 tabular-nums">{cat.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Member Contributions bar chart */}
            {memberPaid.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Who Paid What
                </h3>
                <MemberBars data={memberPaid} currency={group.currency} />
              </section>
            )}

            {/* Balances */}
            <section>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Current Balances
              </h3>
              <div className="space-y-2">
                {memberBalances.map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-1">
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={m.avatar ?? undefined} />
                      <AvatarFallback className="text-xs">{m.initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 truncate">{m.name}</span>
                    <span
                      className={`text-xs font-semibold shrink-0 ${
                        m.balance > 0.01 ? 'text-emerald-500' : m.balance < -0.01 ? 'text-red-500' : 'text-muted-foreground'
                      }`}
                    >
                      {m.balance > 0.01
                        ? `gets back ${group.currency} ${m.balance.toFixed(2)}`
                        : m.balance < -0.01
                        ? `owes ${group.currency} ${Math.abs(m.balance).toFixed(2)}`
                        : 'settled ✓'}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Settle-Up Arrows */}
            {arrows.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  To Settle Up
                </h3>
                <div className="space-y-2">
                  {arrows.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 rounded-xl bg-emerald-500/8 border border-emerald-500/20 px-3 py-2.5"
                    >
                      <span className="text-sm font-medium truncate">{a.from}</span>
                      <span className="text-muted-foreground text-xs shrink-0">→ pays</span>
                      <span className="text-sm font-medium truncate flex-1">{a.to}</span>
                      <span className="text-sm font-bold text-emerald-500 shrink-0 tabular-nums">
                        {group.currency} {a.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Spacing for bottom bar */}
            <div className="h-2" />
          </div>
        </div>

        {/* Pinned share footer */}
        <div className="border-t border-border bg-card px-4 pt-3 pb-4 space-y-2.5 shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-center text-muted-foreground">
            Share this Summary
          </p>

          {/* Primary share button */}
          <Button
            onClick={handleNativeShare}
            className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 font-semibold"
          >
            <Share2 className="h-4 w-4" />
            Share via…
          </Button>

          {/* App shortcuts */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex flex-col items-center gap-1 rounded-xl border border-[#25D366]/25 bg-[#25D366]/8 hover:bg-[#25D366]/15 p-2.5 transition-colors"
            >
              <span className="text-2xl leading-none">💬</span>
              <span className="text-[11px] font-semibold text-[#25D366]">WhatsApp</span>
            </button>
            <button
              onClick={handleTelegram}
              className="flex flex-col items-center gap-1 rounded-xl border border-[#0088cc]/25 bg-[#0088cc]/8 hover:bg-[#0088cc]/15 p-2.5 transition-colors"
            >
              <span className="text-2xl leading-none">✈️</span>
              <span className="text-[11px] font-semibold text-[#0088cc]">Telegram</span>
            </button>
            <button
              onClick={handleEmail}
              className="flex flex-col items-center gap-1 rounded-xl border border-orange-500/25 bg-orange-500/8 hover:bg-orange-500/15 p-2.5 transition-colors"
            >
              <Mail className="h-5 w-5 text-orange-500" />
              <span className="text-[11px] font-semibold text-orange-500">Email</span>
            </button>
          </div>

          {/* Copy text */}
          <button
            onClick={handleCopy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy as Text'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
