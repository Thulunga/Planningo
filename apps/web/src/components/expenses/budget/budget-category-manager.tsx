'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2, Check, Pencil } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Separator,
} from '@planningo/ui'
import {
  createCategory,
  updateCategory,
  archiveCategory,
  upsertBudget,
  deleteBudget,
} from '@/lib/actions/budget'

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

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  categories: Category[]
  budgets: Budget[]
  currentMonth: number
  currentYear: number
}

const PRESET_COLORS = [
  '#f97316', '#3b82f6', '#ec4899', '#8b5cf6',
  '#eab308', '#06b6d4', '#10b981', '#6366f1',
  '#f43f5e', '#64748b', '#22c55e', '#a855f7',
  '#0ea5e9', '#f59e0b', '#94a3b8',
]

const PRESET_ICONS = [
  '🍽️', '🚗', '🛍️', '🎬', '💡', '🏠', '🏥', '📚', '💆',
  '👥', '💼', '💻', '📈', '🎁', '📦', '✈️', '🎮', '🎵',
  '🏋️', '🐾', '💒', '🔧', '📱', '🌐', '🍺',
]

export function BudgetCategoryManager({
  open,
  onOpenChange,
  categories,
  budgets,
  currentMonth,
  currentYear,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<'categories' | 'budgets'>('budgets')
  const [editBudgetId, setEditBudgetId] = useState<string | null>(null)

  // New category form
  const [newCat, setNewCat] = useState({
    name: '',
    icon: '📦',
    color: '#6366f1',
    type: 'expense' as 'income' | 'expense' | 'both',
  })

  // Budget amounts keyed by category id
  const [budgetAmounts, setBudgetAmounts] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    budgets.forEach((b) => { map[b.category_id] = String(b.amount) })
    return map
  })

  function handleCreateCategory() {
    if (!newCat.name.trim()) {
      toast.error('Category name required')
      return
    }
    startTransition(async () => {
      const result = await createCategory(newCat)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Category created')
        setNewCat({ name: '', icon: '📦', color: '#6366f1', type: 'expense' })
      }
    })
  }

  function handleArchiveCategory(id: string) {
    startTransition(async () => {
      const result = await archiveCategory(id)
      if (result.error) toast.error(result.error)
      else toast.success('Category removed')
    })
  }

  function handleSaveBudget(categoryId: string) {
    const amount = parseFloat(budgetAmounts[categoryId] ?? '')
    if (!amount || amount <= 0) {
      toast.error('Enter a valid budget amount')
      return
    }
    startTransition(async () => {
      const result = await upsertBudget({
        category_id: categoryId,
        amount,
        month: currentMonth,
        year: currentYear,
      })
      if (result.error) toast.error(result.error)
      else {
        toast.success('Budget saved')
        setEditBudgetId(null)
      }
    })
  }

  function handleDeleteBudget(budgetId: string, categoryId: string) {
    startTransition(async () => {
      const result = await deleteBudget(budgetId)
      if (result.error) toast.error(result.error)
      else {
        toast.success('Budget removed')
        setBudgetAmounts((p) => { const n = { ...p }; delete n[categoryId]; return n })
      }
    })
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both')
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Manage Budget & Categories</SheetTitle>
        </SheetHeader>

        {/* Tabs */}
        <div className="mt-4 flex rounded-lg border border-border p-1 gap-1">
          {(['budgets', 'categories'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'budgets' ? `Budgets (${MONTH_NAMES[currentMonth - 1]} ${currentYear})` : 'Categories'}
            </button>
          ))}
        </div>

        {/* Budgets tab */}
        {activeTab === 'budgets' && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              Set monthly spending limits per category. Progress will show on the dashboard.
            </p>
            {expenseCategories.map((cat) => {
              const budget = budgets.find((b) => b.category_id === cat.id)
              const isEditing = editBudgetId === cat.id || !budget

              return (
                <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-2.5">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: cat.color + '22', color: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cat.name}</p>
                  </div>
                  {isEditing || editBudgetId === cat.id ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Amount"
                        value={budgetAmounts[cat.id] ?? ''}
                        onChange={(e) => setBudgetAmounts((p) => ({ ...p, [cat.id]: e.target.value }))}
                        className="h-7 w-24 text-sm"
                      />
                      <Button
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleSaveBudget(cat.id)}
                        disabled={isPending}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        ₹{budget!.amount.toLocaleString('en-IN')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => {
                          setEditBudgetId(cat.id)
                          setBudgetAmounts((p) => ({ ...p, [cat.id]: String(budget!.amount) }))
                        }}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteBudget(budget!.id, cat.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Categories tab */}
        {activeTab === 'categories' && (
          <div className="mt-4 space-y-4">
            {/* Existing categories */}
            <div className="space-y-1.5">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                    style={{ backgroundColor: cat.color + '22', color: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{cat.type}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleArchiveCategory(cat.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>

            <Separator />

            {/* Add new category */}
            <div>
              <p className="text-sm font-semibold mb-3">Add New Category</p>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="Category name"
                    value={newCat.name}
                    onChange={(e) => setNewCat((p) => ({ ...p, name: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={newCat.type}
                    onValueChange={(v) => setNewCat((p) => ({ ...p, type: v as typeof newCat.type }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Icon</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {PRESET_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewCat((p) => ({ ...p, icon }))}
                        className={`flex h-8 w-8 items-center justify-center rounded-md text-base transition-colors ${
                          newCat.icon === icon ? 'bg-primary/20 ring-2 ring-primary' : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Color</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewCat((p) => ({ ...p, color }))}
                        className={`h-6 w-6 rounded-full transition-transform ${
                          newCat.color === color ? 'scale-125 ring-2 ring-offset-2 ring-foreground/40' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full text-lg"
                    style={{ backgroundColor: newCat.color + '33' }}
                  >
                    {newCat.icon}
                  </div>
                  <span className="text-sm font-medium">{newCat.name || 'Preview'}</span>
                </div>
                <Button
                  onClick={handleCreateCategory}
                  disabled={isPending || !newCat.name.trim()}
                  className="w-full"
                >
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Create Category
                </Button>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
