'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Search, Filter, Pencil, Trash2, Link2, TrendingUp, TrendingDown } from 'lucide-react'
import { Input, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@planningo/ui'
import { deleteTransaction } from '@/lib/actions/budget'
import { AddTransactionDialog } from './add-transaction-dialog'

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
  tags: string[]
  transaction_date: string
  linked_group_expense_id: string | null
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

  const filtered = transactions.filter((t) => {
    if (filterType !== 'all' && t.type !== filterType) return false
    if (filterCategory !== 'all' && t.category_id !== filterCategory) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      const result = await deleteTransaction(id)
      if (result.error) toast.error(result.error)
      else toast.success('Transaction deleted')
      setDeletingId(null)
    })
  }

  // Group transactions by date
  const byDate = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const key = t.transaction_date
    if (!acc[key]) acc[key] = []
    acc[key]!.push(t)
    return acc
  }, {})

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))

  return (
    <div className="space-y-3">
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as typeof filterType)}>
            <SelectTrigger className="h-8 w-[120px] text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-8 w-[150px] text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-border py-10 text-center text-sm text-muted-foreground">
          No transactions found
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDates.map((date) => (
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
                    onDelete={() => handleDelete(t.id)}
                    isDeleting={deletingId === t.id}
                  />
                ))}
              </div>
            </div>
          ))}
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
  const [showActions, setShowActions] = useState(false)
  const cat = t.budget_categories

  return (
    <div
      className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 hover:border-border/80 hover:bg-card/80 transition-all"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Category icon or type icon */}
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm"
        style={cat ? { backgroundColor: cat.color + '22', color: cat.color } : {}}
      >
        {cat ? (
          <span>{cat.icon}</span>
        ) : t.type === 'income' ? (
          <TrendingUp className="h-4 w-4 text-emerald-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-400" />
        )}
      </div>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{t.title}</span>
          {t.linked_group_expense_id && (
            <span className="inline-flex items-center gap-0.5 rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-500">
              <Link2 className="h-2.5 w-2.5" />
              Group
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          {cat && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: cat.color + '22', color: cat.color }}
            >
              {cat.name}
            </span>
          )}
          {t.tags.map((tag) => (
            <span key={tag} className="text-[10px] text-muted-foreground">#{tag}</span>
          ))}
          {t.notes && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{t.notes}</span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <p className={`text-sm font-semibold tabular-nums ${t.type === 'income' ? 'text-emerald-500' : 'text-foreground'}`}>
          {t.type === 'income' ? '+' : '-'}{currency} {t.amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </p>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'}`}>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={onDelete}
          disabled={isDeleting}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
