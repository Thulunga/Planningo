'use client'

import { useState, useTransition, useEffect } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Search, Pencil, Trash2, Link2, TrendingUp, TrendingDown, Calendar, Tag, FileText, X, ChevronDown } from 'lucide-react'
import { Input, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Sheet, SheetContent, SheetHeader, SheetTitle, cn } from '@planningo/ui'
import { deleteTransaction } from '@/lib/actions/budget'
import { AddTransactionDialog } from './add-transaction-dialog'
import { ConfirmDialog } from '../confirm-dialog'
import { EXPENSE_CATEGORIES } from '@/components/expenses/expense-form-dialog'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense' | 'both'
}

interface Transaction {
  id: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  title: string
  notes: string | null
  category_id: string | null
  expense_category: string | null
  tags: string[]
  transaction_date: string
  linked_group_expense_id: string | null
  auto_linked?: boolean | null
  budget_categories: { id: string; name: string; icon: string; color: string } | null
}

interface GroupExpenseOption {
  id: string
  title: string
  expense_date: string
  currency: string
  expense_groups: { name: string } | null
  expense_splits: { amount: number }[]
}

interface Props {
  transactions: Transaction[]
  categories: Category[]
  groupExpenses: GroupExpenseOption[]
  currency?: string
  showFilters?: boolean
}

export function TransactionList({
  transactions,
  categories,
  groupExpenses,
  currency = 'INR',
  showFilters = true,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDeleteTitle, setConfirmDeleteTitle] = useState('')
  const PAGE_SIZE = 5
  const [visiblePages, setVisiblePages] = useState(1)

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.expense_category !== filterCategory) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  // Reset pagination when filters change
  const filterKey = `${search}|${filterType}|${filterCategory}`
  useEffect(() => { setVisiblePages(1) }, [filterKey])
  const byDate = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const key = t.transaction_date
    if (!acc[key]) acc[key] = []
    acc[key]!.push(t)
    return acc
  }, {})

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  const visibleDates = sortedDates.slice(0, visiblePages * PAGE_SIZE)
  const hasMore = visibleDates.length < sortedDates.length

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteTransaction(id)
      if (result.error) toast.error(result.error)
      else toast.success('Transaction deleted')
      setDeletingId(null)
      setConfirmDeleteId(null)
    })
  }

  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="space-y-2">
          <div className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm w-full"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="h-8 flex-1 text-sm">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {EXPENSE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.emoji} {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
          No transactions found
        </div>
      ) : (
        <div className="space-y-4">
          {visibleDates.map((date) => (
            <div key={date}>
              <p className="mb-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {format(new Date(date + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
              </p>
              <div className="space-y-1.5">
                {byDate[date]!.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    currency={currency}
                    onEdit={() => setEditingTx(t)}
                    onDelete={() => { setConfirmDeleteId(t.id); setConfirmDeleteTitle(t.title) }}
                    isDeleting={deletingId === t.id}
                  />
                ))}
              </div>
            </div>
          ))}
          {hasMore && (
            <button
              type="button"
              onClick={() => setVisiblePages((p) => p + 1)}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2.5 text-xs font-medium text-muted-foreground hover:border-border/80 hover:text-foreground hover:bg-accent/30 transition-colors"
            >
              <ChevronDown className="h-3.5 w-3.5" />
              Load older ({sortedDates.length - visibleDates.length} more {sortedDates.length - visibleDates.length === 1 ? 'day' : 'days'})
            </button>
          )}
        </div>
      )}

      {editingTx && (
        <AddTransactionDialog
          open={!!editingTx}
          onOpenChange={(v) => { if (!v) setEditingTx(null) }}
          categories={categories}
          groupExpenses={groupExpenses}
          editTransaction={{
            ...editingTx,
            linked_group_expense_id: editingTx.linked_group_expense_id,
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        onOpenChange={(v) => { if (!v) setConfirmDeleteId(null) }}
        title="Delete this transaction?"
        description={`"${confirmDeleteTitle}" will be permanently removed from your budget records. This cannot be undone.`}
        confirmLabel="Yes, delete"
        loading={isPending && deletingId === confirmDeleteId}
        onConfirm={() => { if (confirmDeleteId) handleDelete(confirmDeleteId) }}
      />
    </div>
  )
}

function TransactionRow({
  transaction: t,
  currency,
  onEdit,
  onDelete,
  isDeleting,
}: {
  transaction: Transaction
  currency: string
  onEdit: () => void
  onDelete: () => void
  isDeleting: boolean
}) {
  const [detailOpen, setDetailOpen] = useState(false)
  const cat = t.budget_categories
  const expCat = t.expense_category ? EXPENSE_CATEGORIES.find((c) => c.value === t.expense_category) : null
  const isIncome = t.type === 'income'
  const iconBg  = cat ? cat.color + '22' : isIncome ? '#10b98120' : '#f43f5e18'
  const iconColor = cat ? cat.color : isIncome ? '#10b981' : '#f43f5e'

  return (
    <>
      {/* ── Compact single-line row ─────────────────────────────────────── */}
      <div
        className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2 cursor-pointer hover:bg-accent/40 active:bg-accent/60 transition-colors"
        onClick={() => setDetailOpen(true)}
      >
        {/* Icon */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          {expCat ? <span>{expCat.emoji}</span>
            : cat  ? <span>{cat.icon}</span>
            : isIncome ? <TrendingUp className="h-3.5 w-3.5" />
            : <TrendingDown className="h-3.5 w-3.5" />}
        </div>

        {/* Middle: title + sub-label */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight truncate">{t.title}</p>
          <div className="flex items-center gap-1.5 mt-px">
            {expCat ? (
              <span className="text-[10px] text-muted-foreground">{expCat.emoji} {expCat.label}</span>
            ) : cat ? (
              <span className="text-[10px] font-medium" style={{ color: cat.color }}>{cat.icon} {cat.name}</span>
            ) : null}
            {t.linked_group_expense_id && (
              <span
                className={cn(
                  'inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[9px] font-medium',
                  t.auto_linked
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-500/10 text-blue-500',
                )}
              >
                <Link2 className="h-2 w-2" />{t.auto_linked ? 'Auto' : 'Group'}
              </span>
            )}
            {t.tags.slice(0, 1).map((tag) => (
              <span key={tag} className="text-[10px] text-muted-foreground/60">#{tag}</span>
            ))}
          </div>
        </div>

        {/* Amount */}
        <span className={`text-sm font-bold tabular-nums shrink-0 ${isIncome ? 'text-emerald-500' : 'text-foreground'}`}>
          {isIncome ? '+' : '-'}{currency}&nbsp;{t.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
        </span>

        {/* Action buttons — stop propagation so row click doesn't fire */}
        <div className="flex items-center shrink-0" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost" size="sm"
            className="h-7 w-7 p-0 text-destructive/50 hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Detail bottom sheet ─────────────────────────────────────────── */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8 max-h-[85vh] overflow-y-auto">
          <SheetHeader className="mb-5">
            <div className="flex items-start gap-3">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ backgroundColor: iconBg, color: iconColor }}
              >
                {expCat ? <span>{expCat.emoji}</span>
                  : cat  ? <span>{cat.icon}</span>
                  : isIncome ? <TrendingUp className="h-5 w-5" />
                  : <TrendingDown className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base font-bold leading-tight text-left pr-8">{t.title}</SheetTitle>
                <p className={`text-2xl font-black tabular-nums mt-1 ${isIncome ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isIncome ? '+' : '-'}{currency}&nbsp;{t.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-0 divide-y divide-border/50 rounded-xl border border-border overflow-hidden mb-4">
            {/* Type */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">Type</span>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                isIncome ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
              }`}>
                {isIncome ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isIncome ? 'Income' : 'Expense'}
              </span>
            </div>

            {/* Date */}
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />Date
              </span>
              <span className="text-sm font-medium">
                {format(new Date(t.transaction_date + 'T00:00:00'), 'MMM d, yyyy')}
              </span>
            </div>

            {/* Category */}
            {(expCat || cat) && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground">Category</span>
                {expCat ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {expCat.emoji} {expCat.label}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: cat!.color + '22', color: cat!.color }}
                  >
                    {cat!.icon} {cat!.name}
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            {t.tags.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Tag className="h-4 w-4" />Tags
                </span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {t.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">#{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Group link */}
            {t.linked_group_expense_id && (
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Link2 className="h-4 w-4" />Source
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    t.auto_linked
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-blue-500/10 text-blue-500',
                  )}
                >
                  {t.auto_linked ? 'Auto-tracked from group expense' : 'Linked group expense'}
                </span>
              </div>
            )}

            {/* Notes */}
            {t.notes && (
              <div className="px-4 py-3 space-y-1.5">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <FileText className="h-4 w-4" />Notes
                </span>
                <p className="text-sm leading-relaxed text-foreground/80">{t.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11 gap-2 text-sm"
              onClick={() => { setDetailOpen(false); onEdit() }}
            >
              <Pencil className="h-4 w-4" />Edit
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 gap-2 text-sm text-destructive border-destructive/30 hover:bg-destructive/10 hover:border-destructive"
              onClick={() => { setDetailOpen(false); onDelete() }}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4" />Delete
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

