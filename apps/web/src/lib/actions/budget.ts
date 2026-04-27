'use server'

import { cache } from 'react'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, getCachedUser } from '@/lib/supabase/server'

// ── Default categories seeded for new users ───────────────────────────────────
const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Dining', icon: '🍽️', color: '#f97316', type: 'expense', sort_order: 1 },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', type: 'expense', sort_order: 2 },
  { name: 'Shopping', icon: '🛍️', color: '#ec4899', type: 'expense', sort_order: 3 },
  { name: 'Entertainment', icon: '🎬', color: '#8b5cf6', type: 'expense', sort_order: 4 },
  { name: 'Utilities', icon: '💡', color: '#eab308', type: 'expense', sort_order: 5 },
  { name: 'Housing', icon: '🏠', color: '#06b6d4', type: 'expense', sort_order: 6 },
  { name: 'Health', icon: '🏥', color: '#10b981', type: 'expense', sort_order: 7 },
  { name: 'Education', icon: '📚', color: '#6366f1', type: 'expense', sort_order: 8 },
  { name: 'Personal Care', icon: '💆', color: '#f43f5e', type: 'expense', sort_order: 9 },
  { name: 'Group Split', icon: '👥', color: '#64748b', type: 'expense', sort_order: 10 },
  { name: 'Salary', icon: '💼', color: '#22c55e', type: 'income', sort_order: 11 },
  { name: 'Freelance', icon: '💻', color: '#0ea5e9', type: 'income', sort_order: 12 },
  { name: 'Investment', icon: '📈', color: '#a855f7', type: 'income', sort_order: 13 },
  { name: 'Gift', icon: '🎁', color: '#f59e0b', type: 'both', sort_order: 14 },
  { name: 'Other', icon: '📦', color: '#94a3b8', type: 'both', sort_order: 15 },
] as const

// ── Seed default categories for a user if they have none ─────────────────────
// Cache the count check per user per render so multiple callers in the same
// request (getCategories + getBudgetDashboard) only hit the DB once.
const _checkHasCategories = cache(async (userId: string) => {
  const supabase = await createClient()
  const { count } = await supabase
    .from('budget_categories')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
  return (count ?? 0) > 0
})

export async function seedDefaultCategories(userId: string) {
  const hasCategories = await _checkHasCategories(userId)
  if (hasCategories) return { seeded: false }

  const supabase = await createClient()
  const { error } = await supabase.from('budget_categories').insert(
    DEFAULT_EXPENSE_CATEGORIES.map((c) => ({ ...c, user_id: userId }))
  )
  if (error) return { error: error.message }
  return { seeded: true }
}

// ── Get categories ────────────────────────────────────────────────────────────
export async function getCategories() {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated', categories: [] }
  const supabase = await createClient()

  await seedDefaultCategories(user.id)

  const { data, error } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_archived', false)
    .order('sort_order')

  return { categories: data ?? [], error: error?.message }
}

// ── Create category ───────────────────────────────────────────────────────────
const categorySchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(10),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  type: z.enum(['income', 'expense', 'both']),
})

export async function createCategory(data: z.infer<typeof categorySchema>) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase.from('budget_categories').insert({
    ...data,
    user_id: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Update category ───────────────────────────────────────────────────────────
export async function updateCategory(id: string, data: Partial<z.infer<typeof categorySchema>>) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('budget_categories')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Archive category ──────────────────────────────────────────────────────────
export async function archiveCategory(id: string) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('budget_categories')
    .update({ is_archived: true })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Upsert budget ─────────────────────────────────────────────────────────────
const budgetSchema = z.object({
  category_id: z.string().uuid(),
  amount: z.number().positive(),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020),
})

export async function upsertBudget(data: z.infer<typeof budgetSchema>) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('budgets')
    .upsert(
      { ...data, user_id: user.id },
      { onConflict: 'user_id,category_id,month,year' }
    )
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Delete budget ─────────────────────────────────────────────────────────────
export async function deleteBudget(id: string) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('budgets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Create personal transaction ───────────────────────────────────────────────
const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  title: z.string().min(1).max(200),
  notes: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  expense_category: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  transaction_date: z.string(),
  linked_group_expense_id: z.string().uuid().optional().nullable(),
})

export async function createTransaction(data: z.infer<typeof transactionSchema>) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase.from('personal_transactions').insert({
    ...data,
    user_id: user.id,
  })
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Update personal transaction ───────────────────────────────────────────────
export async function updateTransaction(id: string, data: Partial<z.infer<typeof transactionSchema>>) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('personal_transactions')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Delete personal transaction ───────────────────────────────────────────────
export async function deleteTransaction(id: string) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }
  const supabase = await createClient()

  const { error } = await supabase
    .from('personal_transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  revalidatePath('/expenses/budget')
  return { success: true }
}

// ── Get budget dashboard data ─────────────────────────────────────────────────
export async function getBudgetDashboard(month: number, year: number) {
  const user = await getCachedUser()
  if (!user) return null
  const supabase = await createClient()

  await seedDefaultCategories(user.id)

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]! // last day of month

  const [
    { data: transactions },
    { data: categories },
    { data: budgets },
    { data: groupExpenses },
  ] = await Promise.all([
    supabase
      .from('personal_transactions')
      .select('*, budget_categories(id, name, icon, color, type)')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .is('deleted_at', null)
      .order('transaction_date', { ascending: false }),
    supabase
      .from('budget_categories')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_archived', false)
      .order('sort_order'),
    supabase
      .from('budgets')
      .select('*, budget_categories(id, name, icon, color)')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year),
    // Group expenses where user has a split (for linking)
    supabase
      .from('expense_splits')
      .select('amount, expenses(id, title, expense_date, amount, currency, expense_groups(name))')
      .eq('user_id', user.id)
      .gte('expenses.expense_date', startDate)
      .lte('expenses.expense_date', endDate),
  ])

  return {
    transactions: transactions ?? [],
    categories: categories ?? [],
    budgets: budgets ?? [],
    groupExpenses: groupExpenses ?? [],
  }
}

// ── Get all transactions (with filters) ──────────────────────────────────────
export async function getTransactions(filters: {
  month?: number
  year?: number
  type?: 'income' | 'expense'
  categoryId?: string
  search?: string
}) {
  const user = await getCachedUser()
  if (!user) return { transactions: [] }
  const supabase = await createClient()

  let query = supabase
    .from('personal_transactions')
    .select('*, budget_categories(id, name, icon, color)')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('transaction_date', { ascending: false })
    .limit(200)

  if (filters.month && filters.year) {
    const startDate = `${filters.year}-${String(filters.month).padStart(2, '0')}-01`
    const endDate = new Date(filters.year, filters.month, 0).toISOString().split('T')[0]!
    query = query.gte('transaction_date', startDate).lte('transaction_date', endDate)
  }
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  const { data, error } = await query
  return { transactions: data ?? [], error: error?.message }
}

// ── Get group expenses for linking ────────────────────────────────────────────
export async function getGroupExpensesForLinking() {
  const user = await getCachedUser()
  if (!user) return { expenses: [] }
  const supabase = await createClient()

  // Get group memberships
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', user.id)

  const groupIds = (memberships ?? []).map((m) => m.group_id)
  if (groupIds.length === 0) return { expenses: [] }

  const { data } = await supabase
    .from('expenses')
    .select('id, title, expense_date, amount, currency, expense_groups(name), expense_splits!inner(amount)')
    .in('group_id', groupIds)
    .eq('expense_splits.user_id', user.id)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })
    .limit(100)

  return { expenses: data ?? [] }
}
