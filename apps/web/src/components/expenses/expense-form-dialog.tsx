'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Loader2, Search, Check, ChevronDown, RotateCcw, Wallet, X } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@planningo/ui'
import { cn } from '@planningo/ui'
import { createExpense, updateExpense, getMyAutoLinkStatus } from '@/lib/actions/expenses'

interface Member {
  user_id: string
  role: string
  profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
}

export interface ExpenseFormDialogProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: 'add' | 'edit'
  group: { id: string; name: string; currency: string }
  members: Member[]
  currentUserId: string
  expense?: any // existing expense data for edit mode
  onSuccess?: () => void
}

// ─── Shared chart constants (also consumed by analytics & summary components) ──
export const CHART_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6',
  '#f97316', '#84cc16',
]

export const CATEGORY_GROUP_COLORS: Record<string, string> = {
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

// ─── Categories ───────────────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food', emoji: '🍽️', group: 'Food & Drink' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍴', group: 'Food & Drink' },
  { value: 'coffee', label: 'Coffee & Café', emoji: '☕', group: 'Food & Drink' },
  { value: 'groceries', label: 'Groceries', emoji: '🛒', group: 'Food & Drink' },
  { value: 'takeout', label: 'Takeout / Delivery', emoji: '🥡', group: 'Food & Drink' },
  { value: 'drinks', label: 'Drinks & Alcohol', emoji: '🍺', group: 'Food & Drink' },
  { value: 'bakery', label: 'Bakery & Snacks', emoji: '🥐', group: 'Food & Drink' },
  { value: 'taxi', label: 'Taxi / Rideshare', emoji: '🚕', group: 'Transport' },
  { value: 'fuel', label: 'Fuel / Petrol', emoji: '⛽', group: 'Transport' },
  { value: 'flight', label: 'Flight', emoji: '✈️', group: 'Transport' },
  { value: 'train', label: 'Train / Metro', emoji: '🚆', group: 'Transport' },
  { value: 'bus', label: 'Bus', emoji: '🚌', group: 'Transport' },
  { value: 'parking', label: 'Parking', emoji: '🅿️', group: 'Transport' },
  { value: 'car_rental', label: 'Car Rental', emoji: '🚗', group: 'Transport' },
  { value: 'transport', label: 'Transport (other)', emoji: '🛺', group: 'Transport' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨', group: 'Accommodation' },
  { value: 'airbnb', label: 'Airbnb / Homestay', emoji: '🏡', group: 'Accommodation' },
  { value: 'rent', label: 'Rent', emoji: '🔑', group: 'Accommodation' },
  { value: 'accommodation', label: 'Accommodation (other)', emoji: '🏠', group: 'Accommodation' },
  { value: 'maintenance', label: 'Maintenance & Repairs', emoji: '🛠️', group: 'Accommodation' },
  { value: 'movies', label: 'Movies / Cinema', emoji: '🎬', group: 'Entertainment' },
  { value: 'sports', label: 'Sports & Activities', emoji: '⚽', group: 'Entertainment' },
  { value: 'games', label: 'Games', emoji: '🎮', group: 'Entertainment' },
  { value: 'concerts', label: 'Concerts & Shows', emoji: '🎵', group: 'Entertainment' },
  { value: 'nightlife', label: 'Nightlife & Bars', emoji: '🎉', group: 'Entertainment' },
  { value: 'streaming', label: 'Streaming & OTT', emoji: '📺', group: 'Entertainment' },
  { value: 'entertainment', label: 'Entertainment (other)', emoji: '🎭', group: 'Entertainment' },
  { value: 'clothing', label: 'Clothing & Fashion', emoji: '👕', group: 'Shopping' },
  { value: 'electronics', label: 'Electronics & Gadgets', emoji: '📱', group: 'Shopping' },
  { value: 'books', label: 'Books & Magazines', emoji: '📚', group: 'Shopping' },
  { value: 'gifts', label: 'Gifts & Occasions', emoji: '🎁', group: 'Shopping' },
  { value: 'household', label: 'Household Items', emoji: '🪴', group: 'Shopping' },
  { value: 'shopping', label: 'Shopping (other)', emoji: '🛍️', group: 'Shopping' },
  { value: 'medical', label: 'Medical / Doctor', emoji: '🩺', group: 'Health & Wellness' },
  { value: 'pharmacy', label: 'Pharmacy / Medicine', emoji: '💊', group: 'Health & Wellness' },
  { value: 'gym', label: 'Gym & Fitness', emoji: '💪', group: 'Health & Wellness' },
  { value: 'spa', label: 'Salon & Spa', emoji: '💆', group: 'Health & Wellness' },
  { value: 'healthcare', label: 'Healthcare (other)', emoji: '🏥', group: 'Health & Wellness' },
  { value: 'utilities', label: 'Utilities (electricity, gas)', emoji: '⚡', group: 'Bills & Utilities' },
  { value: 'internet', label: 'Internet / Broadband', emoji: '🌐', group: 'Bills & Utilities' },
  { value: 'phone', label: 'Phone / Mobile', emoji: '📞', group: 'Bills & Utilities' },
  { value: 'insurance', label: 'Insurance', emoji: '🛡️', group: 'Bills & Utilities' },
  { value: 'subscriptions', label: 'Subscriptions', emoji: '📋', group: 'Bills & Utilities' },
  { value: 'emi', label: 'EMI / Loan', emoji: '🏦', group: 'Bills & Utilities' },
  { value: 'tour', label: 'Tour & Sightseeing', emoji: '🗺️', group: 'Travel' },
  { value: 'activities', label: 'Activities & Experiences', emoji: '🎯', group: 'Travel' },
  { value: 'visa', label: 'Visa & Documents', emoji: '📄', group: 'Travel' },
  { value: 'travel', label: 'Travel (other)', emoji: '🌍', group: 'Travel' },
  { value: 'work', label: 'Work & Business', emoji: '💼', group: 'Work & Education' },
  { value: 'office', label: 'Office Supplies', emoji: '🖊️', group: 'Work & Education' },
  { value: 'education', label: 'Education & Courses', emoji: '🎓', group: 'Work & Education' },
  { value: 'software', label: 'Software & Tools', emoji: '💻', group: 'Work & Education' },
  { value: 'general', label: 'General', emoji: '📌', group: 'Other' },
  { value: 'other', label: 'Other', emoji: '📦', group: 'Other' },
]

// ─── Category Picker ──────────────────────────────────────────────────────────
function CategoryPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filtered = EXPENSE_CATEGORIES.filter(
    (c) =>
      c.label.toLowerCase().includes(search.toLowerCase()) ||
      c.group.toLowerCase().includes(search.toLowerCase()) ||
      c.value.toLowerCase().includes(search.toLowerCase()),
  )
  const selected = EXPENSE_CATEGORIES.find((c) => c.value === value)
  const groups = Array.from(new Set(filtered.map((c) => c.group)))

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch('') }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-accent/40 transition-colors"
        >
          <span className="truncate">
            {selected ? `${selected.emoji} ${selected.label}` : 'Select category'}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <input
            className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        <div
          className="max-h-60 overflow-y-scroll overscroll-contain p-1 [touch-action:pan-y]"
          onWheel={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {groups.map((group) => (
            <div key={group}>
              <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
              {filtered
                .filter((c) => c.group === group)
                .map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => { onChange(cat.value); setOpen(false); setSearch('') }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors',
                      value === cat.value && 'bg-accent font-medium',
                    )}
                  >
                    <span className="text-base leading-none">{cat.emoji}</span>
                    <span className="truncate">{cat.label}</span>
                    {value === cat.value && <Check className="ml-auto h-3.5 w-3.5 shrink-0" />}
                  </button>
                ))}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">No categories found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
type SplitMode = 'equal' | 'amount' | 'percentage'

function memberName(m: Member) {
  return m.profiles?.full_name ?? m.profiles?.email ?? 'Member'
}

function initSplits(members: Member[], totalNum: number, mode: SplitMode, existingSplits?: any[]) {
  if (existingSplits && mode === 'amount') {
    const result: Record<string, string> = {}
    existingSplits.forEach((s: any) => { result[s.user_id] = String(s.amount) })
    return result
  }
  const result: Record<string, string> = {}
  const each = members.length > 0 ? totalNum / members.length : 0
  const pct = members.length > 0 ? 100 / members.length : 0
  members.forEach((m) => {
    result[m.user_id] = mode === 'percentage' ? pct.toFixed(2) : each > 0 ? each.toFixed(2) : '0.00'
  })
  return result
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────
export function ExpenseFormDialog({
  open,
  onOpenChange,
  mode,
  group,
  members,
  currentUserId,
  expense,
  onSuccess,
}: ExpenseFormDialogProps) {
  const [saving, setSaving] = useState(false)

  // Basic fields
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('general')
  const [expenseDate, setExpenseDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [notes, setNotes] = useState('')

  // Who paid
  const [paidBy, setPaidBy] = useState(currentUserId)

  // Split
  const [splitMode, setSplitMode] = useState<SplitMode>('equal')
  const [splits, setSplits] = useState<Record<string, string>>({})
  const [pinnedSplits, setPinnedSplits] = useState<Set<string>>(new Set())

  // Auto-link caller's share to personal expenses
  const [linkToPersonal, setLinkToPersonal] = useState(false)

  // Initialise when dialog opens
  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && expense) {
      setTitle(expense.title ?? '')
      setAmount(String(expense.amount ?? ''))
      setCategory(expense.category ?? 'general')
      setExpenseDate(expense.expense_date ?? format(new Date(), 'yyyy-MM-dd'))
      setNotes(expense.notes ?? '')
      setPaidBy(expense.paid_by ?? currentUserId)
      const initialMode: SplitMode = 'amount'
      setSplitMode(initialMode)
      const initialSplits = initSplits(members, expense.amount ?? 0, initialMode, expense.expense_splits)
      setSplits(initialSplits)
      setPinnedSplits(new Set(members.map((m) => m.user_id))) // all pinned from existing data
      // Pre-fill toggle from server: is there already an auto-linked personal txn?
      setLinkToPersonal(false)
      let cancelled = false
      ;(async () => {
        const res = await getMyAutoLinkStatus(expense.id)
        if (!cancelled) setLinkToPersonal(Boolean(res?.autoLinked))
      })()
      return () => {
        cancelled = true
      }
    } else {
      setTitle('')
      setAmount('')
      setCategory('general')
      setExpenseDate(format(new Date(), 'yyyy-MM-dd'))
      setNotes('')
      setPaidBy(currentUserId)
      setSplitMode('equal')
      setSplits({})
      setPinnedSplits(new Set())
      setLinkToPersonal(false)
    }
  }, [open, mode, expense, currentUserId, members])

  // When amount changes in amount/percentage mode, rebalance unpinned
  useEffect(() => {
    if (splitMode === 'equal') return
    const totalNum = parseFloat(amount) || 0
    setSplits((prev) => rebalance(pinnedSplits, prev, totalNum, splitMode, members.map((m) => m.user_id)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, splitMode])

  // When split mode changes, reset pins and rebalance
  function handleSplitModeChange(newMode: SplitMode) {
    setSplitMode(newMode)
    const totalNum = parseFloat(amount) || 0
    setPinnedSplits(new Set())
    setSplits(initSplits(members, totalNum, newMode))
  }

  function rebalance(
    pinned: Set<string>,
    current: Record<string, string>,
    totalNum: number,
    mode: SplitMode,
    allIds: string[],
  ): Record<string, string> {
    const unpinned = allIds.filter((uid) => !pinned.has(uid))
    if (unpinned.length === 0) return current

    const pinnedSum = Array.from(pinned).reduce(
      (s, uid) => s + (parseFloat(current[uid] ?? '0') || 0),
      0,
    )
    const base = mode === 'percentage' ? 100 : totalNum
    const remaining = base - pinnedSum
    const each = remaining / unpinned.length

    const result = { ...current }
    unpinned.forEach((uid) => { result[uid] = Math.max(0, each).toFixed(2) })
    return result
  }

  function handleSplitChange(userId: string, value: string) {
    const newPinned = new Set(pinnedSplits).add(userId)
    const newSplits = { ...splits, [userId]: value }
    const totalNum = parseFloat(amount) || 0
    const rebalanced = rebalance(newPinned, newSplits, totalNum, splitMode, members.map((m) => m.user_id))
    setSplits(rebalanced)
    setPinnedSplits(newPinned)
  }

  function resetSplits() {
    const totalNum = parseFloat(amount) || 0
    setPinnedSplits(new Set())
    setSplits(initSplits(members, totalNum, splitMode))
  }

  // Quick preset: only one member owes the full amount
  function setOnlyOwes(userId: string) {
    const totalNum = parseFloat(amount) || 0
    const newSplits: Record<string, string> = {}
    members.forEach((m) => { newSplits[m.user_id] = m.user_id === userId ? totalNum.toFixed(2) : '0.00' })
    setSplits(newSplits)
    setPinnedSplits(new Set(members.map((m) => m.user_id)))
  }

  // Validate and compute final splits for submission
  function computeFinalSplits(): { user_id: string; amount: number }[] | null {
    const totalNum = parseFloat(amount) || 0
    if (totalNum <= 0) return null

    if (splitMode === 'equal') {
      const each = Math.round((totalNum / members.length) * 100) / 100
      return members.map((m) => ({ user_id: m.user_id, amount: each }))
    }

    if (splitMode === 'amount') {
      const result = members.map((m) => ({
        user_id: m.user_id,
        amount: Math.round((parseFloat(splits[m.user_id] ?? '0') || 0) * 100) / 100,
      }))
      const sum = result.reduce((s, r) => s + r.amount, 0)
      if (Math.abs(sum - totalNum) > 0.05) {
        toast.error(`Split amounts (${group.currency} ${sum.toFixed(2)}) don't match total (${group.currency} ${totalNum.toFixed(2)})`)
        return null
      }
      return result
    }

    // percentage mode
    const totalPct = members.reduce((s, m) => s + (parseFloat(splits[m.user_id] ?? '0') || 0), 0)
    if (Math.abs(totalPct - 100) > 0.2) {
      toast.error(`Percentages must sum to 100% (currently ${totalPct.toFixed(1)}%)`)
      return null
    }
    return members.map((m) => ({
      user_id: m.user_id,
      amount: Math.round(((parseFloat(splits[m.user_id] ?? '0') || 0) / 100) * totalNum * 100) / 100,
    }))
  }

  async function handleSubmit() {
    if (!title.trim()) { toast.error('Title is required'); return }
    const totalNum = parseFloat(amount)
    if (isNaN(totalNum) || totalNum <= 0) { toast.error('Enter a valid amount'); return }

    const finalSplits = computeFinalSplits()
    if (!finalSplits) return

    setSaving(true)
    let result: { error?: string; warning?: string }

    if (mode === 'add') {
      result = await createExpense({
        group_id: group.id,
        title: title.trim(),
        amount: totalNum,
        currency: group.currency,
        category,
        split_type: splitMode === 'equal' ? 'equal' : 'exact',
        expense_date: expenseDate,
        paid_by_override: paidBy !== currentUserId ? paidBy : undefined,
        link_to_personal: linkToPersonal,
        splits: finalSplits,
      })
    } else {
      result = await updateExpense(
        expense!.id,
        group.id,
        {
          title: title.trim(),
          amount: totalNum,
          category,
          expense_date: expenseDate,
          paid_by: paidBy,
          currency: group.currency,
          link_to_personal: linkToPersonal,
        },
        finalSplits,
      )
    }

    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      if (result.warning) toast.warning(result.warning)
      else toast.success(mode === 'add' ? 'Expense added' : 'Expense updated')
      onOpenChange(false)
      onSuccess?.()
    }
  }

  const totalNum = parseFloat(amount) || 0
  const selectedCat = EXPENSE_CATEGORIES.find((c) => c.value === category)

  // Live preview of caller's share (matches what computeFinalSplits would emit)
  const myShareNum = useMemo(() => {
    if (!members.length || totalNum <= 0) return 0
    if (splitMode === 'equal') {
      return Math.round((totalNum / members.length) * 100) / 100
    }
    if (splitMode === 'amount') {
      return Math.round((parseFloat(splits[currentUserId] ?? '0') || 0) * 100) / 100
    }
    // percentage
    const pct = parseFloat(splits[currentUserId] ?? '0') || 0
    return Math.round((pct / 100) * totalNum * 100) / 100
  }, [splitMode, splits, totalNum, members, currentUserId])

  const isCurrentUserMember = members.some((m) => m.user_id === currentUserId)
  const canLinkToPersonal = isCurrentUserMember && myShareNum > 0

  // Split summary values
  const splitAmountTotal = splitMode === 'amount'
    ? members.reduce((s, m) => s + (parseFloat(splits[m.user_id] ?? '0') || 0), 0)
    : null
  const splitPctTotal = splitMode === 'percentage'
    ? members.reduce((s, m) => s + (parseFloat(splits[m.user_id] ?? '0') || 0), 0)
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="left-0 right-0 translate-x-0 w-full max-w-none bottom-0 top-auto sm:inset-auto sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:top-1/2 sm:-translate-y-1/2 sm:max-w-lg p-0 gap-0 max-h-[85svh] sm:max-h-[90vh] flex flex-col rounded-t-2xl sm:rounded-lg">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b bg-background/95 backdrop-blur-sm shrink-0">
          <DialogTitle className="text-lg font-bold">
            {mode === 'add' ? 'Add Expense' : 'Edit Expense'}
          </DialogTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Track-my-share toggle (auto-link caller's share to personal expenses) */}
          {isCurrentUserMember && (
            <div
              className={cn(
                'flex items-start gap-3 rounded-lg border p-3 transition-colors',
                linkToPersonal && canLinkToPersonal
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-border bg-muted/30',
              )}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                  linkToPersonal && canLinkToPersonal
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <Wallet className="h-4 w-4" />
              </div>
              <div className="flex-1 space-y-0.5">
                <Label
                  htmlFor="link-to-personal"
                  className={cn(
                    'cursor-pointer text-sm font-medium leading-tight',
                    !canLinkToPersonal && 'text-muted-foreground',
                  )}
                >
                  Track my share in personal expenses
                </Label>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {canLinkToPersonal ? (
                    <>
                      Your share{' '}
                      <span className="font-semibold text-foreground">
                        {group.currency} {myShareNum.toFixed(2)}
                      </span>{' '}
                      will be auto-added to your personal budget and stay linked to this group expense. Other members&apos; shares are never touched.
                    </>
                  ) : totalNum <= 0 ? (
                    <>Enter an amount and your share will be calculated and tracked here.</>
                  ) : (
                    <>You&apos;re excluded from this split, so nothing will be added to your personal expenses.</>
                  )}
                </p>
              </div>
              <Switch
                id="link-to-personal"
                checked={linkToPersonal && canLinkToPersonal}
                onCheckedChange={setLinkToPersonal}
                disabled={!canLinkToPersonal}
                className="mt-1 shrink-0"
              />
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              placeholder="Dinner, hotel, taxi..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount ({group.currency}) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="dark:[color-scheme:dark]"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <CategoryPicker value={category} onChange={setCategory} />
          </div>

          <Separator />

          {/* Who Paid */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Who paid the bill?
            </Label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.user_id}
                  type="button"
                  onClick={() => setPaidBy(m.user_id)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all',
                    paidBy === m.user_id
                      ? 'border-primary bg-primary/10 font-medium'
                      : 'border-border hover:bg-accent',
                  )}
                >
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={m.profiles?.avatar_url ?? ''} />
                    <AvatarFallback className="text-[10px]">
                      {(m.profiles?.full_name ?? m.profiles?.email ?? '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate max-w-[100px]">{memberName(m)}</span>
                  {paidBy === m.user_id && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Split */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                How to split?
              </Label>
              {splitMode !== 'equal' && (
                <button
                  type="button"
                  onClick={resetSplits}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>

            <Tabs value={splitMode} onValueChange={(v) => handleSplitModeChange(v as SplitMode)}>
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="equal" className="text-xs">Equal</TabsTrigger>
                <TabsTrigger value="amount" className="text-xs">By Amount</TabsTrigger>
                <TabsTrigger value="percentage" className="text-xs">By %</TabsTrigger>
              </TabsList>

              {/* Equal */}
              <TabsContent value="equal" className="mt-3 space-y-2">
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  {members.map((m) => (
                    <div key={m.user_id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={m.profiles?.avatar_url ?? ''} />
                          <AvatarFallback className="text-[10px]">
                            {(m.profiles?.full_name ?? m.profiles?.email ?? '?')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-muted-foreground">{memberName(m)}</span>
                      </div>
                      <span className="font-medium">
                        {group.currency} {totalNum > 0 ? (totalNum / members.length).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Split equally - {group.currency} {totalNum > 0 ? (totalNum / members.length).toFixed(2) : '0.00'} per person
                </p>
              </TabsContent>

              {/* By Amount */}
              <TabsContent value="amount" className="mt-3 space-y-2">
                <div className="space-y-2">
                  {members.map((m) => {
                    const isPinned = pinnedSplits.has(m.user_id)
                    return (
                      <div key={m.user_id} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={m.profiles?.avatar_url ?? ''} />
                            <AvatarFallback className="text-[10px]">
                              {(m.profiles?.full_name ?? m.profiles?.email ?? '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{memberName(m)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Quick preset: only this person owes */}
                          <button
                            type="button"
                            onClick={() => setOnlyOwes(m.user_id)}
                            className="text-[10px] text-muted-foreground hover:text-primary px-1 py-0.5 rounded border border-border hover:border-primary transition-colors whitespace-nowrap"
                            title="Set this member to owe the full amount"
                          >
                            Full
                          </button>
                          <div className="relative w-28">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                              {group.currency}
                            </span>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={splits[m.user_id] ?? ''}
                              onChange={(e) => handleSplitChange(m.user_id, e.target.value)}
                              className={cn(
                                'h-8 pl-8 pr-2 text-sm',
                                isPinned && 'border-primary/60 bg-primary/5',
                              )}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Running total */}
                <div className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
                  Math.abs((splitAmountTotal ?? 0) - totalNum) < 0.05
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600',
                )}>
                  <span>Total allocated</span>
                  <span className="font-semibold">
                    {group.currency} {(splitAmountTotal ?? 0).toFixed(2)} / {group.currency} {totalNum.toFixed(2)}
                  </span>
                </div>
              </TabsContent>

              {/* By Percentage */}
              <TabsContent value="percentage" className="mt-3 space-y-2">
                <div className="space-y-2">
                  {members.map((m) => {
                    const isPinned = pinnedSplits.has(m.user_id)
                    const pct = parseFloat(splits[m.user_id] ?? '0') || 0
                    const amtFromPct = totalNum > 0 ? (pct / 100) * totalNum : 0
                    return (
                      <div key={m.user_id} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Avatar className="h-6 w-6 shrink-0">
                            <AvatarImage src={m.profiles?.avatar_url ?? ''} />
                            <AvatarFallback className="text-[10px]">
                              {(m.profiles?.full_name ?? m.profiles?.email ?? '?')[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm truncate">{memberName(m)}</p>
                            {totalNum > 0 && (
                              <p className="text-[11px] text-muted-foreground">
                                = {group.currency} {amtFromPct.toFixed(2)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="relative w-24 shrink-0">
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={splits[m.user_id] ?? ''}
                            onChange={(e) => handleSplitChange(m.user_id, e.target.value)}
                            className={cn(
                              'h-8 pr-6 text-sm',
                              isPinned && 'border-primary/60 bg-primary/5',
                            )}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">
                            %
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Running total */}
                <div className={cn(
                  'flex items-center justify-between rounded-lg px-3 py-2 text-xs',
                  Math.abs((splitPctTotal ?? 0) - 100) < 0.2
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-amber-500/10 text-amber-600',
                )}>
                  <span>Total %</span>
                  <span className="font-semibold">{(splitPctTotal ?? 0).toFixed(1)}% / 100%</span>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Optional Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. bill photo, reference..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Sticky Footer Buttons - Mobile Bottom Sticky, Desktop Right-aligned */}
        <div className="sticky bottom-0 z-10 flex gap-3 px-5 py-4 border-t bg-background/95 backdrop-blur-sm shrink-0 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1 sm:flex-none sm:w-auto h-11 sm:h-9"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 sm:flex-none sm:w-auto h-11 sm:h-9 gap-2"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'add' ? 'Add Expense' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
