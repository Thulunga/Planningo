'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Eye, TrendingUp, Users } from 'lucide-react'
import {
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@planningo/ui'
import { getAllExpenses, getAllSettlements } from '@/lib/actions/admin'

interface Expense {
  id: string
  group_id: string
  amount: number
  category: string
  description: string
  paid_by: string
  created_at: string
  expense_groups: {
    id: string
    name: string
  }
  profiles: {
    email: string
    full_name: string
  }
}

interface Settlement {
  id: string
  group_id: string
  amount: number
  paid_by: string
  paid_to: string
  created_at: string
  expense_groups: {
    id: string
    name: string
  }
  paid_by_profile: {
    email: string
    full_name: string
  }
  paid_to_profile: {
    email: string
    full_name: string
  }
}

export default function AdminExpensesManager() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setIsLoading(true)
      const [expensesResult, settlementsResult] = await Promise.all([
        getAllExpenses(),
        getAllSettlements(),
      ])

      if (expensesResult.success) {
        setExpenses(expensesResult.expenses)
      } else {
        toast.error('Failed to load expenses')
      }

      if (settlementsResult.success) {
        setSettlements(settlementsResult.settlements)
      } else {
        toast.error('Failed to load settlements')
      }
    } catch (error) {
      toast.error('Error loading data')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0)
  const totalSettlements = settlements.reduce((sum, s) => sum + s.amount, 0)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{expenses.length} expense entries</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Settlements</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSettlements.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{settlements.length} settlement records</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses</CardTitle>
          <CardDescription>All expense entries across all groups</CardDescription>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No expenses recorded</div>
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{expense.description || 'Unnamed Expense'}</h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {expense.expense_groups?.name || 'Unknown Group'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Paid by: {expense.profiles?.full_name || expense.profiles?.email}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(expense.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">₹{expense.amount.toFixed(2)}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedExpense(expense)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settlements */}
      <Card>
        <CardHeader>
          <CardTitle>Settlements</CardTitle>
          <CardDescription>All settlement transactions across all groups</CardDescription>
        </CardHeader>
        <CardContent>
          {settlements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No settlements recorded</div>
          ) : (
            <div className="space-y-3">
              {settlements.map((settlement) => (
                <div key={settlement.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">
                          {settlement.paid_by_profile?.full_name || 'Unknown'} → {settlement.paid_to_profile?.full_name || 'Unknown'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs">
                          {settlement.expense_groups?.name || 'Unknown Group'}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {settlement.paid_by_profile?.email}
                        </span>
                        <span className="text-xs text-muted-foreground">→</span>
                        <span className="text-xs text-muted-foreground">
                          {settlement.paid_to_profile?.email}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {new Date(settlement.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-semibold">₹{settlement.amount.toFixed(2)}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedSettlement(settlement)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense Details Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={(open) => !open && setSelectedExpense(null)}>
        <DialogContent>
          {selectedExpense && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedExpense.description || 'Expense Details'}</DialogTitle>
                <DialogDescription>
                  {selectedExpense.expense_groups?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg">₹{selectedExpense.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Category</p>
                    <p className="font-medium">{selectedExpense.category}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Paid By</p>
                    <p className="font-medium">{selectedExpense.profiles?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedExpense.profiles?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(selectedExpense.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Settlement Details Dialog */}
      <Dialog open={!!selectedSettlement} onOpenChange={(open) => !open && setSelectedSettlement(null)}>
        <DialogContent>
          {selectedSettlement && (
            <>
              <DialogHeader>
                <DialogTitle>Settlement Details</DialogTitle>
                <DialogDescription>
                  {selectedSettlement.expense_groups?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg">₹{selectedSettlement.amount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-medium">{new Date(selectedSettlement.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">From</p>
                    <p className="font-medium">{selectedSettlement.paid_by_profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedSettlement.paid_by_profile?.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">To</p>
                    <p className="font-medium">{selectedSettlement.paid_to_profile?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedSettlement.paid_to_profile?.email}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
