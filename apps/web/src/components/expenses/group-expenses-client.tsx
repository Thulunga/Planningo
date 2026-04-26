'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Plus, ArrowLeft, UserPlus, DollarSign, Trash2, Loader2, CheckCircle2, Pencil, Copy, Check, Share2 } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Separator,
} from '@planningo/ui'
import { deleteExpense, addGroupMember, createSettlement, updateSettlement, deleteSettlement, searchGroupUsers, generateGroupInviteCode } from '@/lib/actions/expenses'
import { useRouter } from 'next/navigation'
import { AddTransactionDialog } from './budget/add-transaction-dialog'
import { ExpenseFormDialog } from './expense-form-dialog'
import { GroupSummarySheet } from './group-summary-sheet'
import { GroupAnalytics } from './group-analytics'
import { getSupabaseClient } from '@/lib/supabase/client'

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

  // Realtime: refresh when expenses or settlements change for this group
  useEffect(() => {
    const supabase = getSupabaseClient()
    const channel = supabase
      .channel(`group-expenses-${group.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `group_id=eq.${group.id}` }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_splits' }, () => router.refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settlements', filter: `group_id=eq.${group.id}` }, () => router.refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [group.id, router])

  // Dialog state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<any | null>(null)
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
  
  const [isShareOpen, setIsShareOpen] = useState(false)

  // Record to budget (kept for future use)
  const [recordingExpense, setRecordingExpense] = useState<{
    id: string
    title: string
    splitAmount: number
  } | null>(null)

  const members = group.group_members
  const balances = calcBalances(expenses, initialSettlements, currentUserId, members)

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

  async function handleDeleteExpense(id: string) {
    setSaving(true)
    const result = await deleteExpense(id, group.id)
    setSaving(false)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Expense deleted')
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
      {/* Sticky back button — minimal, always visible */}
      <div className="sticky top-0 z-20 -mx-4 bg-background/95 backdrop-blur px-4 py-2 border-b border-border/40">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/expenses">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {/* Group header + action buttons (non-sticky) */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{group.name}</h1>
          <p className="text-xs text-muted-foreground capitalize mt-0.5">{group.category} · {group.currency}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setIsAddMemberOpen(true)} className="gap-1.5">
            <UserPlus className="h-4 w-4" />
            <span className="text-xs">Add Member</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsSettleOpen(true)} className="gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-xs">Settle Up</span>
          </Button>
          {/* Add Expense — desktop only; mobile uses sticky bottom bar */}
          <Button size="sm" onClick={() => setIsAddExpenseOpen(true)} className="hidden sm:flex gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="text-xs">Add Expense</span>
          </Button>
        </div>
      </div>

      {/* Hero Stats Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/8 to-indigo-500/10">
        <div className="flex items-start justify-between gap-4 px-4 pt-4 pb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Spent</p>
            <p className="text-3xl font-black tracking-tight tabular-nums mt-0.5">{group.currency} {totalExpenses.toFixed(2)}</p>
            <p className="mt-1 text-xs text-muted-foreground">{expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Balance</p>
            <p className={`text-2xl font-black tabular-nums mt-0.5 ${myBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {myBalance >= 0 ? '+' : ''}{group.currency} {Math.abs(myBalance).toFixed(2)}
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {myBalance > 0.01 ? 'owed to you' : myBalance < -0.01 ? 'you owe' : 'all settled ✓'}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 7).map((m) => (
                <Avatar key={m.user_id} className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={m.profiles?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[9px]">{m.profiles?.full_name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            {members.length > 7 && <span className="text-xs text-muted-foreground">+{members.length - 7}</span>}
          </div>
          <p className="text-xs text-muted-foreground shrink-0">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Analytics Dashboard ── */}
      <GroupAnalytics
        expenses={expenses}
        members={members}
        balances={balances}
        currency={group.currency}
        currentUserId={currentUserId}
      />

      {/* Balances */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">Balances</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
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
                      {/* Show edit/delete to the payer or any group member */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Edit expense"
                          onClick={() => setEditingExpense(exp)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Delete expense"
                          onClick={() => handleDeleteExpense(exp.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Expense Dialog — new advanced form */}
      <ExpenseFormDialog
        open={isAddExpenseOpen}
        onOpenChange={setIsAddExpenseOpen}
        mode="add"
        group={group}
        members={members}
        currentUserId={currentUserId}
        onSuccess={() => router.refresh()}
      />
      <ExpenseFormDialog
        open={!!editingExpense}
        onOpenChange={(v) => { if (!v) setEditingExpense(null) }}
        mode="edit"
        group={group}
        members={members}
        currentUserId={currentUserId}
        expense={editingExpense}
        onSuccess={() => { setEditingExpense(null); router.refresh() }}
      />

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

      {/* ── Share & Export Summary ── */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 via-purple-500/8 to-indigo-500/8 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600">
            <Share2 className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold">Share Group Summary</p>
            <p className="text-xs text-muted-foreground">Charts · Balances · Settle-up guide</p>
          </div>
        </div>
        <Button
          onClick={() => setIsShareOpen(true)}
          className="w-full gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0 font-semibold"
        >
          <Share2 className="h-4 w-4" />
          Generate &amp; Share Summary
        </Button>
      </div>

      <GroupSummarySheet
        open={isShareOpen}
        onOpenChange={setIsShareOpen}
        group={group}
        expenses={expenses}
        settlements={initialSettlements}
        members={members}
        balances={balances}
      />

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
