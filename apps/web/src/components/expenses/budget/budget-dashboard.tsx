'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Settings2, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Wallet, Users2,
  AlertTriangle,
} from 'lucide-react'
import { Button, Progress } from '@planningo/ui'
import { AddTransactionDialog } from './add-transaction-dialog'
import { BudgetCategoryManager } from './budget-category-manager'
import { TransactionList } from './transaction-list'

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

interface GroupExpenseOption {
  id: string
  title: string
  expense_date: string
  currency: string
  expense_groups: { name: string } | null
  expense_splits: { amount: number }[]
}

interface Props {
  month: number
  year: number
  transactions: Transaction[]
  categories: Category[]
  budgets: Budget[]
  groupExpenses: GroupExpenseOption[]
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function BudgetDashboard({
  month,
  year,
  transactions,
  categories,
  budgets,
  groupExpenses,
}: Props) {
  const router = useRouter()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addType, setAddType] = useState<'income' | 'expense'>('expense')
  const [isManagerOpen, setIsManagerOpen] = useState(false)

  // Navigate months
  function navigate(delta: number) {
    let m = month + delta
    let y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    router.push(`/expenses/budget?month=${m}&year=${y}`)
  }

  // Compute summary metrics
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)

  const netSavings = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0

  // Group contribution: expense transactions linked to a group expense
  const groupContribution = transactions
    .filter((t) => t.type === 'expense' && t.linked_group_expense_id)
    .reduce((sum, t) => sum + t.amount, 0)

  // Per-category spending
  const spendingByCategory = transactions
    .filter((t) => t.type === 'expense' && t.category_id)
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category_id!] = (acc[t.category_id!] ?? 0) + t.amount
      return acc
    }, {})

  // Budget progress items (categories with a budget set)
  const budgetProgress = budgets
    .map((b) => {
      const cat = categories.find((c) => c.id === b.category_id)
      if (!cat) return null
      const spent = spendingByCategory[b.category_id] ?? 0
      const pct = Math.min((spent / b.amount) * 100, 100)
      const over = spent > b.amount
      return { cat, budget: b, spent, pct, over }
    })
    .filter(Boolean) as Array<{
      cat: Category
      budget: Budget
      spent: number
      pct: number
      over: boolean
    }>

  // Category breakdown (top categories by spending)
  const categoryBreakdown = categories
    .filter((c) => (spendingByCategory[c.id] ?? 0) > 0)
    .map((c) => ({ cat: c, amount: spendingByCategory[c.id] ?? 0 }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8)

  const isCurrentMonth = month === new Date().getMonth() + 1 && year === new Date().getFullYear()

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-center min-w-[140px]">
            <p className="font-semibold">{MONTH_NAMES[month - 1]} {year}</p>
            {isCurrentMonth && (
              <p className="text-xs text-muted-foreground">Current month</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => navigate(1)}
            className="rounded-md p-1 hover:bg-muted transition-colors"
            disabled={isCurrentMonth}
          >
            <ChevronRight className={`h-4 w-4 ${isCurrentMonth ? 'text-muted-foreground/40' : ''}`} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsManagerOpen(true)}>
            <Settings2 className="mr-2 h-3.5 w-3.5" />
            Budgets & Categories
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setAddType('income'); setIsAddOpen(true) }}
            className="text-emerald-600 border-emerald-500/40 hover:bg-emerald-500/10"
          >
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
            Income
          </Button>
          <Button
            size="sm"
            onClick={() => { setAddType('expense'); setIsAddOpen(true) }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard
          label="Total Income"
          value={totalIncome}
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          color="emerald"
          prefix="+"
        />
        <SummaryCard
          label="Total Expenses"
          value={totalExpense}
          icon={<TrendingDown className="h-4 w-4 text-red-400" />}
          color="red"
          prefix="-"
        />
        <SummaryCard
          label="Net Savings"
          value={netSavings}
          icon={<Wallet className="h-4 w-4 text-primary" />}
          color={netSavings >= 0 ? 'emerald' : 'red'}
          sub={totalIncome > 0 ? `${savingsRate.toFixed(0)}% of income` : undefined}
          signed
        />
        <SummaryCard
          label="Group Contributions"
          value={groupContribution}
          icon={<Users2 className="h-4 w-4 text-blue-400" />}
          color="blue"
          prefix="-"
          sub={`${transactions.filter((t) => t.linked_group_expense_id).length} linked`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        {/* Left column: Budget progress + Category breakdown */}
        <div className="space-y-5 lg:col-span-2">
          {/* Budget Progress */}
          {budgetProgress.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Budget Progress</h2>
                <button
                  type="button"
                  onClick={() => setIsManagerOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Edit budgets
                </button>
              </div>
              <div className="space-y-3">
                {budgetProgress.map(({ cat, budget, spent, pct, over }) => (
                  <div key={cat.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-base">{cat.icon}</span>
                        <span className="text-xs font-medium truncate">{cat.name}</span>
                        {over && <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />}
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`text-xs font-semibold tabular-nums ${over ? 'text-red-500' : ''}`}>
                          ₹{spent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {' '}/ ₹{budget.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress
                        value={pct}
                        className="h-1.5"
                        style={{
                          '--progress-color': over ? '#ef4444' : pct > 80 ? '#f59e0b' : cat.color,
                        } as React.CSSProperties}
                      />
                    </div>
                    <p className="mt-0.5 text-right text-[10px] text-muted-foreground">
                      {pct.toFixed(0)}% used · ₹{Math.max(0, budget.amount - spent).toLocaleString('en-IN', { maximumFractionDigits: 0 })} left
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No budgets set CTA */}
          {budgetProgress.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">No budgets set</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Set monthly limits per category to track your spending goals
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setIsManagerOpen(true)}
              >
                Set budgets
              </Button>
            </div>
          )}

          {/* Category Breakdown */}
          {categoryBreakdown.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold">Spending by Category</h2>
              <div className="space-y-2">
                {categoryBreakdown.map(({ cat, amount }) => {
                  const pct = totalExpense > 0 ? (amount / totalExpense) * 100 : 0
                  return (
                    <div key={cat.id} className="flex items-center gap-2">
                      <div
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs"
                        style={{ backgroundColor: cat.color + '22', color: cat.color }}
                      >
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs truncate">{cat.name}</span>
                          <span className="text-xs font-medium tabular-nums ml-2 shrink-0">
                            ₹{amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: cat.color }}
                          />
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground w-8 text-right shrink-0">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Transactions */}
        <div className="lg:col-span-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Transactions ({transactions.length})
              </h2>
            </div>
            {transactions.length === 0 ? (
              <div className="py-10 text-center">
                <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground">No transactions this month</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add your first income or expense to start tracking
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setAddType('income'); setIsAddOpen(true) }}
                  >
                    Add Income
                  </Button>
                  <Button size="sm" onClick={() => { setAddType('expense'); setIsAddOpen(true) }}>
                    Add Expense
                  </Button>
                </div>
              </div>
            ) : (
              <TransactionList
                transactions={transactions}
                categories={categories}
                groupExpenses={groupExpenses}
                currency="INR"
                showFilters
              />
            )}
          </div>
        </div>
      </div>

      <AddTransactionDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        categories={categories}
        groupExpenses={groupExpenses}
        defaultType={addType}
      />

      <BudgetCategoryManager
        open={isManagerOpen}
        onOpenChange={setIsManagerOpen}
        categories={categories}
        budgets={budgets}
        currentMonth={month}
        currentYear={year}
      />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  sub,
  prefix,
  signed,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: 'emerald' | 'red' | 'blue' | 'primary'
  sub?: string
  prefix?: string
  signed?: boolean
}) {
  const colorMap = {
    emerald: 'text-emerald-500',
    red: 'text-red-400',
    blue: 'text-blue-400',
    primary: 'text-primary',
  }

  const displayValue = signed
    ? `${value >= 0 ? '+' : '-'}₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
    : `${prefix ?? ''}₹${Math.abs(value).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums ${colorMap[color]}`}>{displayValue}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}
