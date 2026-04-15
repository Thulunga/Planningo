'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, ArrowLeft, UserPlus, DollarSign, Trash2, Loader2 } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@planningo/ui'
import { createExpense, addGroupMember, createSettlement } from '@/lib/actions/expenses'
import { useRouter } from 'next/navigation'

interface Member {
  user_id: string
  role: string
  profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
}

interface GroupExpensesClientProps {
  group: { id: string; name: string; currency: string; category: string; group_members: Member[] }
  expenses: any[]
  settlements: any[]
  currentUserId: string
}

function calcBalances(expenses: any[], settlements: any[], currentUserId: string, members: Member[]) {
  const balances: Record<string, number> = {}
  members.forEach((m) => { balances[m.user_id] = 0 })

  // Process expenses
  expenses.forEach((exp) => {
    // Person who paid gets credited
    balances[exp.paid_by] = (balances[exp.paid_by] ?? 0) + exp.amount
    // Each split person owes their amount
    exp.expense_splits?.forEach((split: any) => {
      balances[split.user_id] = (balances[split.user_id] ?? 0) - split.amount
    })
  })

  // Process settlements
  settlements.forEach((s) => {
    balances[s.paid_by] = (balances[s.paid_by] ?? 0) + s.amount
    balances[s.paid_to] = (balances[s.paid_to] ?? 0) - s.amount
  })

  return balances
}

export function GroupExpensesClient({
  group,
  expenses: initialExpenses,
  settlements: initialSettlements,
  currentUserId,
}: GroupExpensesClientProps) {
  const router = useRouter()
  const [expenses, setExpenses] = useState(initialExpenses)
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')

  const [newExpense, setNewExpense] = useState({
    title: '',
    amount: '',
    category: 'general',
    split_type: 'equal' as const,
    expense_date: format(new Date(), 'yyyy-MM-dd'),
  })

  const members = group.group_members
  const balances = calcBalances(expenses, initialSettlements, currentUserId, members)

  async function handleAddExpense() {
    if (!newExpense.title.trim() || !newExpense.amount) {
      toast.error('Title and amount are required')
      return
    }

    const amount = parseFloat(newExpense.amount)
    const splitAmount = amount / members.length

    setSaving(true)
    const result = await createExpense({
      group_id: group.id,
      title: newExpense.title.trim(),
      amount,
      currency: group.currency,
      category: newExpense.category,
      split_type: newExpense.split_type,
      expense_date: newExpense.expense_date,
      splits: members.map((m) => ({
        user_id: m.user_id,
        amount: Math.round(splitAmount * 100) / 100,
      })),
    })
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense added')
      setIsAddExpenseOpen(false)
      router.refresh()
    }
  }

  async function handleAddMember() {
    if (!memberEmail.trim()) return
    setSaving(true)
    const result = await addGroupMember(group.id, memberEmail.trim())
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Member added')
      setIsAddMemberOpen(false)
      setMemberEmail('')
      router.refresh()
    }
  }

  const myBalance = balances[currentUserId] ?? 0
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/expenses">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Expenses
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{group.category} · {group.currency}</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(true)} className="flex-1 sm:flex-none">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
          <Button size="sm" onClick={() => setIsAddExpenseOpen(true)} className="flex-1 sm:flex-none">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-xl font-bold">{group.currency} {totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Your Balance</p>
            <p className={`text-xl font-bold ${myBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {myBalance >= 0 ? '+' : ''}{group.currency} {myBalance.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {myBalance >= 0 ? 'You are owed' : 'You owe'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">Members</p>
            <div className="mt-1 flex -space-x-2">
              {members.slice(0, 5).map((m) => (
                <Avatar key={m.user_id} className="h-7 w-7 border-2 border-background">
                  <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {m.profiles?.full_name?.[0] ?? '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balances */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Balances</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {members.map((m) => {
            const balance = balances[m.user_id] ?? 0
            return (
              <Card key={m.user_id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">{m.profiles?.full_name?.[0] ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{m.profiles?.full_name ?? m.profiles?.email ?? 'Member'}</p>
                  </div>
                  <p className={`text-sm font-semibold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {balance >= 0 ? '+' : ''}{group.currency} {balance.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Expense list */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Expenses ({expenses.length})
        </h2>
        {expenses.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <DollarSign className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No expenses yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {expenses.map((exp) => {
              const paidByMember = members.find((m) => m.user_id === exp.paid_by)
              const yourSplit = exp.expense_splits?.find((s: any) => s.user_id === currentUserId)

              return (
                <Card key={exp.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 py-3 sm:flex-nowrap">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{exp.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Paid by {paidByMember?.profiles?.full_name ?? 'Unknown'} · {format(new Date(exp.expense_date), 'MMM d')}
                      </p>
                    </div>
                    <div className="w-full text-left sm:w-auto sm:text-right">
                      <p className="text-sm font-semibold">{group.currency} {exp.amount.toFixed(2)}</p>
                      {yourSplit && (
                        <p className="text-xs text-muted-foreground">
                          Your share: {group.currency} {yourSplit.amount.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>What was it for? *</Label>
              <Input
                placeholder="Dinner, taxi, hotel..."
                value={newExpense.title}
                onChange={(e) => setNewExpense((p) => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount ({group.currency}) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense((p) => ({ ...p, amount: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newExpense.expense_date}
                  onChange={(e) => setNewExpense((p) => ({ ...p, expense_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={newExpense.category}
                  onValueChange={(v) => setNewExpense((p) => ({ ...p, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['general', 'food', 'transport', 'accommodation', 'entertainment', 'shopping'].map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Split equally among {members.length} members: {group.currency}{' '}
              {newExpense.amount
                ? (parseFloat(newExpense.amount) / members.length).toFixed(2)
                : '0.00'} each
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsAddExpenseOpen(false)}>Cancel</Button>
              <Button onClick={handleAddExpense} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enter the email of a Planningo user to add them to this group.
            </p>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="friend@example.com"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddMemberOpen(false)}>Cancel</Button>
              <Button onClick={handleAddMember} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
