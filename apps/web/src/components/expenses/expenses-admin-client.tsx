'use client'

import { useTransition } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Shield, Archive, ArchiveRestore, Trash2, Undo2, Users, Wallet, ReceiptText } from 'lucide-react'
import { Button, Card, CardContent } from '@planningo/ui'
import { adminToggleExpenseDeleted, adminToggleGroupArchive } from '@/lib/actions/expenses-admin'

interface Props {
  stats: {
    users: number
    groups: number
    activeGroups: number
    groupExpenses: number
    personalTransactions: number
  }
  groups: Array<{
    id: string
    name: string
    category: string
    currency: string
    created_at: string
    is_archived: boolean
    creator: { full_name: string | null; email: string | null } | null
  }>
  expenses: Array<{
    id: string
    title: string
    amount: number
    currency: string
    expense_date: string
    deleted_at: string | null
    groupName: string
    paidBy: { full_name: string | null; email: string | null } | null
  }>
  personalTransactions: Array<{
    id: string
    type: 'income' | 'expense'
    title: string
    amount: number
    currency: string
    transaction_date: string
    deleted_at: string | null
    owner: { full_name: string | null; email: string | null } | null
  }>
}

export function ExpensesAdminClient({ stats, groups, expenses, personalTransactions }: Props) {
  const [isPending, startTransition] = useTransition()

  function onToggleGroup(groupId: string, archived: boolean) {
    startTransition(async () => {
      const res = await adminToggleGroupArchive(groupId, archived)
      if (res.error) toast.error(res.error)
      else toast.success(archived ? 'Group archived' : 'Group restored')
    })
  }

  function onToggleExpense(expenseId: string, deleted: boolean) {
    startTransition(async () => {
      const res = await adminToggleExpenseDeleted(expenseId, deleted)
      if (res.error) toast.error(res.error)
      else toast.success(deleted ? 'Expense soft deleted' : 'Expense restored')
    })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
        <div className="flex items-center gap-2 font-medium">
          <Shield className="h-4 w-4" />
          Admin mode enabled
        </div>
        <p className="mt-1 text-xs text-amber-700/90 dark:text-amber-300/90">
          You are viewing global expense data and can moderate group expenses and groups.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Users" value={stats.users} icon={<Users className="h-4 w-4 text-blue-500" />} />
        <StatCard label="Groups" value={stats.groups} icon={<Wallet className="h-4 w-4 text-violet-500" />} />
        <StatCard label="Active Groups" value={stats.activeGroups} icon={<Wallet className="h-4 w-4 text-emerald-500" />} />
        <StatCard label="Group Expenses" value={stats.groupExpenses} icon={<ReceiptText className="h-4 w-4 text-rose-500" />} />
        <StatCard label="Personal Tx" value={stats.personalTransactions} icon={<ReceiptText className="h-4 w-4 text-cyan-500" />} />
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent Expense Groups</h2>
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{g.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {g.category} · {g.currency} · by {g.creator?.full_name ?? g.creator?.email ?? 'Unknown'} · {format(new Date(g.created_at), 'MMM d, yyyy')}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onToggleGroup(g.id, !g.is_archived)}
                className="h-7"
              >
                {g.is_archived ? (
                  <>
                    <ArchiveRestore className="mr-1 h-3.5 w-3.5" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="mr-1 h-3.5 w-3.5" />
                    Archive
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent Group Expenses</h2>
        <div className="space-y-2">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{e.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {e.groupName} · {e.currency} {e.amount.toFixed(2)} · by {e.paidBy?.full_name ?? e.paidBy?.email ?? 'Unknown'} · {format(new Date(e.expense_date), 'MMM d, yyyy')}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => onToggleExpense(e.id, !e.deleted_at)}
                className="h-7"
              >
                {e.deleted_at ? (
                  <>
                    <Undo2 className="mr-1 h-3.5 w-3.5" />
                    Restore
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Soft Delete
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Recent Personal Transactions (Read-only)</h2>
        <div className="space-y-2">
          {personalTransactions.map((t) => (
            <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{t.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t.type.toUpperCase()} · {t.currency} {t.amount.toFixed(2)} · {t.owner?.full_name ?? t.owner?.email ?? 'Unknown'} · {format(new Date(t.transaction_date), 'MMM d, yyyy')}
                </p>
              </div>
              {t.deleted_at && (
                <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Deleted</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-1 flex items-center gap-2">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xl font-bold tabular-nums">{value.toLocaleString('en-IN')}</p>
      </CardContent>
    </Card>
  )
}
