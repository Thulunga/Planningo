'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { X, Link2, Loader2, Search, Check, ChevronDown } from 'lucide-react'
import {
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@planningo/ui'
import { cn } from '@planningo/ui'
import { createTransaction, updateTransaction } from '@/lib/actions/budget'
import { EXPENSE_CATEGORIES } from '@/components/expenses/expense-form-dialog'

interface Category {
  id: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense' | 'both'
}

interface GroupExpenseOption {
  id: string
  title: string
  expense_date: string
  currency: string
  expense_groups: { name: string } | null
  expense_splits: { amount: number }[]
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
}

// ── Searchable category picker (same pattern as group expenses) ──────────────
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

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: Category[]
  groupExpenses: GroupExpenseOption[]
  defaultType?: 'income' | 'expense'
  editTransaction?: Transaction
  prefilledGroupExpenseId?: string
  prefilledAmount?: number
  prefilledTitle?: string
}

export function AddTransactionDialog({
  open,
  onOpenChange,
  categories,
  groupExpenses,
  defaultType = 'expense',
  editTransaction,
  prefilledGroupExpenseId,
  prefilledAmount,
  prefilledTitle,
}: Props) {
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    type: editTransaction?.type ?? defaultType,
    amount: editTransaction ? String(editTransaction.amount) : prefilledAmount ? String(prefilledAmount) : '',
    currency: editTransaction?.currency ?? 'INR',
    title: editTransaction?.title ?? prefilledTitle ?? '',
    notes: editTransaction?.notes ?? '',
    category_id: editTransaction?.category_id ?? '',
    expense_category: (editTransaction as any)?.expense_category ?? '',
    tags: editTransaction?.tags?.join(', ') ?? '',
    transaction_date: editTransaction?.transaction_date ?? format(new Date(), 'yyyy-MM-dd'),
    linked_group_expense_id: editTransaction?.linked_group_expense_id ?? prefilledGroupExpenseId ?? '',
  })

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'both'
  )

  function handleLinkGroupExpense(expenseId: string) {
    if (expenseId === '__none__') {
      setForm((p) => ({ ...p, linked_group_expense_id: '' }))
      return
    }
    const exp = groupExpenses.find((e) => e.id === expenseId)
    if (!exp) return
    const splitAmt = exp.expense_splits[0]?.amount ?? exp.amount
    setForm((p) => ({
      ...p,
      linked_group_expense_id: expenseId,
      // Pre-fill amount and title if empty
      amount: p.amount || String(splitAmt),
      title: p.title || exp.title,
    }))
  }

  function handleSave() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    const amount = parseFloat(form.amount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }

    const payload = {
      type: form.type as 'income' | 'expense',
      amount,
      currency: form.currency,
      title: form.title.trim(),
      notes: form.notes.trim() || null,
      category_id: form.category_id || null,
      expense_category: form.expense_category || null,
      tags: form.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      transaction_date: form.transaction_date,
      linked_group_expense_id: form.linked_group_expense_id || null,
    }

    startTransition(async () => {
      const result = editTransaction
        ? await updateTransaction(editTransaction.id, payload)
        : await createTransaction(payload)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(editTransaction ? 'Transaction updated' : 'Transaction added')
        onOpenChange(false)
        // Reset form on add
        if (!editTransaction) {
          setForm({
            type: defaultType,
            amount: '',
            currency: 'INR',
            title: '',
            notes: '',
            category_id: '',
            expense_category: '',
            tags: '',
            transaction_date: format(new Date(), 'yyyy-MM-dd'),
            linked_group_expense_id: '',
          })
        }
      }
    })
  }

  const linkedExpense = groupExpenses.find((e) => e.id === form.linked_group_expense_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg border border-border p-1 gap-1">
            {(['expense', 'income'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setForm((p) => ({ ...p, type: t, category_id: '' }))}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors capitalize ${
                  form.type === t
                    ? t === 'expense'
                      ? 'bg-red-500 text-white'
                      : 'bg-emerald-500 text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Amount & Currency */}
          <div className="flex gap-2">
            <div className="w-24">
              <Label className="text-xs">Currency</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['INR', 'USD', 'EUR', 'GBP', 'JPY'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs">Amount *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                className="mt-1 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs">Description *</Label>
            <Input
              placeholder={form.type === 'income' ? 'Salary, freelance payment...' : 'Groceries, taxi, Netflix...'}
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="mt-1"
            />
          </div>

          {/* Category */}
          <div>
            <Label className="text-xs">Category</Label>
            <div className="mt-1">
              <CategoryPicker
                value={form.expense_category}
                onChange={(v) => setForm((p) => ({ ...p, expense_category: v }))}
              />
            </div>
          </div>

          {/* Date */}
          <div>
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={form.transaction_date}
              onChange={(e) => setForm((p) => ({ ...p, transaction_date: e.target.value }))}
              className="mt-1 dark:[color-scheme:dark]"
            />
          </div>

          {/* Tags */}
          <div>
            <Label className="text-xs">Tags <span className="text-muted-foreground">(comma-separated)</span></Label>
            <Input
              placeholder="e.g. weekend, monthly, work"
              value={form.tags}
              onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))}
              className="mt-1"
            />
            {form.tags && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {form.tags.split(',').map((t) => t.trim()).filter(Boolean).map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Link to group expense */}
          {form.type === 'expense' && (
            <div>
              <Label className="text-xs flex items-center gap-1.5">
                <Link2 className="h-3 w-3" />
                Link to Group Expense <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select
                value={form.linked_group_expense_id || '__none__'}
                onValueChange={handleLinkGroupExpense}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Link a group expense" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {groupExpenses.map((exp) => (
                    <SelectItem key={exp.id} value={exp.id}>
                      <span className="truncate">
                        {exp.expense_groups?.name && (
                          <span className="text-muted-foreground">[{exp.expense_groups.name}] </span>
                        )}
                        {exp.title} · {exp.currency} {exp.expense_splits[0]?.amount?.toFixed(0)}
                        {exp.expense_date && (
                          <span className="text-muted-foreground ml-1">
                            {format(new Date(exp.expense_date), 'MMM d')}
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {linkedExpense && (
                <div className="mt-1.5 flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1.5 text-xs text-blue-600 dark:text-blue-400">
                  <Link2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">
                    Linked: {linkedExpense.expense_groups?.name} → {linkedExpense.title}
                    {' '}(Your share: {linkedExpense.currency} {linkedExpense.expense_splits[0]?.amount?.toFixed(2)})
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, linked_group_expense_id: '' }))}
                    className="ml-auto shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea
              placeholder="Optional note..."
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              className="mt-1 min-h-[60px] resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editTransaction ? 'Save Changes' : 'Add Transaction'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
