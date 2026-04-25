'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, ArrowLeft, UserPlus, DollarSign, Trash2, Loader2, BookmarkPlus, CheckCircle2, Pencil, Copy, Check } from 'lucide-react'
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
import { createExpense, addGroupMember, createSettlement, updateSettlement, deleteSettlement, searchGroupUsers, generateGroupInviteCode } from '@/lib/actions/expenses'
import { useRouter } from 'next/navigation'
import { AddTransactionDialog } from './budget/add-transaction-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@planningo/ui'

interface Member {
  user_id: string
  role: string
  profiles: { id: string; full_name: string | null; email: string; avatar_url: string | null } | null
}

interface BudgetCategory {
  id: string
  name: string
  icon: string
  color: string
  type: 'income' | 'expense' | 'both'
}

interface GroupExpensesClientProps {
  group: { id: string; name: string; currency: string; category: string; group_members: Member[] }
  expenses: any[]
  settlements: any[]
  currentUserId: string
  budgetCategories: BudgetCategory[]
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
  budgetCategories,
}: GroupExpensesClientProps) {
  const router = useRouter()
  const [expenses, setExpenses] = useState(initialExpenses)
  
  useEffect(() => { setExpenses(initialExpenses) }, [initialExpenses])

  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [memberEmail, setMemberEmail] = useState('')
  
  // Settle up state
  const [isSettleOpen, setIsSettleOpen] = useState(false)
  const [settleTarget, setSettleTarget] = useState<{ userId: string; name: string; amount: number } | null>(null)
  const [settleAmount, setSettleAmount] = useState('')
  const [settleNote, setSettleNote] = useState('')
  const [settlePaidBy, setSettlePaidBy] = useState<string>(currentUserId)
  const [editingSettlement, setEditingSettlement] = useState<any | null>(null)
  
  // Record to budget
  const [recordingExpense, setRecordingExpense] = useState<{
    id: string
    title: string
    splitAmount: number
  } | null>(null)

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

  function openSettle(memberId: string, memberName: string) {
    const theirBalance = balances[memberId] ?? 0
    const myBal = balances[currentUserId] ?? 0
    const suggested = Math.min(Math.abs(myBal < 0 ? myBal : 0), Math.abs(theirBalance > 0 ? theirBalance : 0))
    setEditingSettlement(null)
    setSettlePaidBy(currentUserId)
    setSettleTarget({ userId: memberId, name: memberName, amount: suggested })
    setSettleAmount(suggested > 0 ? suggested.toFixed(2) : '')
    setSettleNote('')
    setIsSettleOpen(true)
  }

  function openEditSettle(s: any) {
    const payee = members.find((m) => m.user_id === s.paid_to)
    setEditingSettlement(s)
    setSettlePaidBy(s.paid_by)
    setSettleTarget({
      userId: s.paid_to,
      name: payee?.profiles?.full_name ?? payee?.profiles?.email ?? 'Member',
      amount: 0,
    })
    setSettleAmount(String(s.amount))
    setSettleNote(s.notes ?? '')
    setIsSettleOpen(true)
  }

  async function handleSettle() {
    const amount = parseFloat(settleAmount)
    if (!settleTarget || isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSaving(true)
    const result = editingSettlement
      ? await updateSettlement(editingSettlement.id, group.id, {
          paid_by: settlePaidBy,
          paid_to: settleTarget.userId,
          amount,
          notes: settleNote.trim() || undefined,
        })
      : await createSettlement({
          group_id: group.id,
          paid_by: settlePaidBy,
          paid_to: settleTarget.userId,
          amount,
          currency: group.currency,
          notes: settleNote.trim() || undefined,
        })
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(editingSettlement ? 'Payment updated!' : `Payment of ${group.currency} ${amount.toFixed(2)} recorded!`)
      setIsSettleOpen(false)
      setSettleTarget(null)
      setSettleAmount('')
      setSettleNote('')
      setEditingSettlement(null)
      setSettlePaidBy(currentUserId)
      router.refresh()
    }
  }

  const myBalance = balances[currentUserId] ?? 0
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="space-y-4 pb-28 sm:pb-4">
      {/* Sticky top bar — back link + title + action buttons */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/95 backdrop-blur px-4 pt-2 pb-3 border-b border-border/50">
        <Button variant="ghost" size="sm" asChild className="mb-1 -ml-2">
          <Link href="/expenses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Groups
          </Link>
        </Button>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{group.name}</h1>
            <p className="text-xs text-muted-foreground capitalize">{group.category} · {group.currency}</p>
          </div>
          {/* Action buttons — all screen sizes */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddMemberOpen(true)}
              className="gap-1.5"
            >
              <UserPlus className="h-4 w-4" />
              <span className="text-xs font-medium">Add Member</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettleOpen(true)}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium">Settle Up</span>
            </Button>
            {/* Add Expense button — desktop only */}
            <Button
              size="sm"
              onClick={() => setIsAddExpenseOpen(true)}
              className="hidden sm:flex gap-1.5"
            >
              <Plus className="h-4 w-4" />
              <span className="text-xs font-medium">Add Expense</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="text-lg font-bold mt-1">{group.currency} {totalExpenses.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Your Balance</p>
            <p className={`text-lg font-bold mt-1 ${myBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {myBalance >= 0 ? '+' : ''}{group.currency} {myBalance.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {myBalance >= 0 ? 'You are owed' : 'You owe'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Members</p>
            <div className="mt-1.5 flex -space-x-2">
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
        <div className="space-y-2">
          {members.map((m) => {
            const balance = balances[m.user_id] ?? 0
            return (
              <Card key={m.user_id}>
                <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">{m.profiles?.full_name?.[0] ?? '?'}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.profiles?.full_name ?? m.profiles?.email ?? 'Member'}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <p className={`text-sm font-semibold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {balance >= 0 ? '+' : ''}{group.currency} {balance.toFixed(2)}
                    </p>
                    {m.user_id !== currentUserId && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => openSettle(m.user_id, m.profiles?.full_name ?? m.profiles?.email ?? 'Member')}
                        className="h-8 px-3 shrink-0"
                      >
                        Settle
                      </Button>
                    )}
                  </div>
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
                  <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <DollarSign className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{exp.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Paid by {paidByMember?.profiles?.full_name ?? 'Unknown'} · {format(new Date(exp.expense_date), 'MMM d')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 sm:justify-end">
                      <div className="text-right">
                        <p className="text-sm font-semibold">{group.currency} {exp.amount.toFixed(2)}</p>
                        {yourSplit && (
                          <p className="text-xs text-muted-foreground">
                            Your share: {group.currency} {yourSplit.amount.toFixed(2)}
                          </p>
                        )}
                      </div>
                      {yourSplit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-blue-500 hover:text-blue-600 hover:bg-blue-500/10 shrink-0 whitespace-nowrap"
                          title="Record to my budget"
                          onClick={() => setRecordingExpense({
                            id: exp.id,
                            title: exp.title,
                            splitAmount: yourSplit.amount,
                          })}
                        >
                          <BookmarkPlus className="h-3.5 w-3.5 mr-1" />
                          <span className="hidden sm:inline">Record</span>
                        </Button>
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

      {/* Settle Up Dialog */}
      <Dialog open={isSettleOpen} onOpenChange={setIsSettleOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingSettlement ? 'Edit Payment' : 'Record a Payment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Who Paid?</Label>
              <div className="grid gap-2">
                {members.map((m) => (
                  <button
                    key={m.user_id}
                    onClick={() => setSettlePaidBy(m.user_id)}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 transition-all ${
                      settlePaidBy === m.user_id ? 'border-blue-400 bg-blue-500/10' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <Avatar className="h-6 w-6 shrink-0">
                      <AvatarImage src={m.profiles?.avatar_url ?? ''} />
                      <AvatarFallback className="text-xs">{m.profiles?.full_name?.[0] ?? m.profiles?.email?.[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate">{m.profiles?.full_name ?? m.profiles?.email ?? 'Member'}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase text-muted-foreground">Paid to?</Label>
              <div className="grid gap-2">
                {members
                  .filter((m) => m.user_id !== settlePaidBy)
                  .map((m) => {
                    const bal = balances[m.user_id] ?? 0
                    return (
                      <button
                        key={m.user_id}
                        onClick={() => {
                          const suggested = Math.min(
                            Math.abs((balances[settlePaidBy] ?? 0) < 0 ? balances[settlePaidBy] : 0),
                            Math.abs(bal > 0 ? bal : 0)
                          )
                          setSettleTarget({
                            userId: m.user_id,
                            name: m.profiles?.full_name ?? m.profiles?.email ?? 'Member',
                            amount: suggested,
                          })
                          setSettleAmount(suggested > 0 ? suggested.toFixed(2) : '')
                        }}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 transition-all ${
                          settleTarget?.userId === m.user_id
                            ? 'border-blue-400 bg-blue-500/10'
                            : 'border-border hover:bg-accent'
                        }`}
                      >
                        <Avatar className="h-6 w-6 shrink-0">
                          <AvatarImage src={m.profiles?.avatar_url ?? ''} />
                          <AvatarFallback className="text-xs">{m.profiles?.full_name?.[0] ?? m.profiles?.email?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm font-medium truncate">{m.profiles?.full_name ?? m.profiles?.email ?? 'Member'}</p>
                          <p className="text-xs text-muted-foreground">{bal >= 0 ? 'owed' : 'owes'} {group.currency} {Math.abs(bal).toFixed(2)}</p>
                        </div>
                      </button>
                    )
                  })}
              </div>
            </div>

            <Separator />

            <div className="space-y-1.5">
              <Label htmlFor="settle-amount">Amount</Label>
              <Input
                id="settle-amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="settle-note">Note (optional)</Label>
              <Input
                id="settle-note"
                placeholder="e.g., Cash payment"
                value={settleNote}
                onChange={(e) => setSettleNote(e.target.value)}
              />
            </div>

            {settleTarget && (
              <div className="rounded-lg bg-muted p-2 text-center text-sm">
                <p className="font-semibold">
                  {members.find((m) => m.user_id === settlePaidBy)?.profiles?.full_name || 'Payer'} → {settleTarget.name} · {group.currency} {settleAmount || '0.00'}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsSettleOpen(false)}>Cancel</Button>
              <Button onClick={handleSettle} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSettlement ? 'Update Payment' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payments Section */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Payments ({initialSettlements.length})
        </h2>
        {initialSettlements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <CheckCircle2 className="mb-2 h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No payments recorded yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {initialSettlements.map((settlement: any) => {
              const payer = members.find((m) => m.user_id === settlement.paid_by)
              const payee = members.find((m) => m.user_id === settlement.paid_to)
              const isMe = settlement.paid_by === currentUserId || settlement.paid_to === currentUserId
              
              return (
                <Card key={settlement.id}>
                  <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-1 items-start gap-3 min-w-0">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          <span className={isMe ? 'font-bold' : ''}>{payer?.profiles?.full_name ?? payer?.profiles?.email ?? 'Member'}</span>
                          {' paid '}
                          <span className={isMe ? 'font-bold' : ''}>{payee?.profiles?.full_name ?? payee?.profiles?.email ?? 'Member'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(settlement.created_at), 'MMM d, yyyy')}
                          {settlement.notes && ` · ${settlement.notes}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-1 sm:justify-end">
                      <span className="text-sm font-bold shrink-0">{group.currency} {settlement.amount.toFixed(2)}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditSettle(settlement)}
                        className="h-8 w-8 p-0 shrink-0"
                        title="Edit payment"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={async () => {
                          setSaving(true)
                          const result = await deleteSettlement(settlement.id, group.id)
                          setSaving(false)
                          if (result.error) {
                            toast.error(result.error)
                          } else {
                            toast.success('Payment deleted')
                            router.refresh()
                          }
                        }}
                        className="h-8 w-8 p-0 shrink-0"
                        title="Delete payment"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Record group expense to personal budget */}
      {recordingExpense && (
        <AddTransactionDialog
          open={!!recordingExpense}
          onOpenChange={(v) => { if (!v) setRecordingExpense(null) }}
          categories={budgetCategories}
          groupExpenses={expenses.map((exp) => ({
            id: exp.id,
            title: exp.title,
            expense_date: exp.expense_date,
            currency: group.currency,
            expense_groups: { name: group.name },
            expense_splits: exp.expense_splits?.filter((s: any) => s.user_id === currentUserId) ?? [],
          }))}
          defaultType="expense"
          prefilledGroupExpenseId={recordingExpense.id}
          prefilledAmount={recordingExpense.splitAmount}
          prefilledTitle={recordingExpense.title}
        />
      )}

      {/* Sticky bottom bar — mobile only, sits above the bottom tab nav (h-16) */}
      <div className="fixed bottom-16 left-0 right-0 z-50 sm:hidden bg-background border-t border-border px-3 py-2.5">
        <Button
          size="lg"
          onClick={() => setIsAddExpenseOpen(true)}
          className="w-full text-base font-semibold gap-3"
        >
          <Plus className="h-5 w-5" />
          Add Expense
        </Button>
      </div>
    </div>
  )
}
