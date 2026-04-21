'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

function isAdmin(email: string | undefined): boolean {
  return !!(email && process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL)
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.email)) return { error: 'Unauthorized', user: null }
  return { error: null, user }
}

function getAdminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!url || !secret) return null

  return createSupabaseClient(url, secret, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export async function getExpensesAdminDashboard() {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const adminDb = getAdminDb()
  if (!adminDb) {
    return { error: 'Missing SUPABASE_SECRET_KEY. Admin dashboard requires service-role access.' }
  }

  const [
    { count: profileCount },
    { count: groupCount },
    { count: activeGroupCount },
    { count: expenseCount },
    { count: personalTxCount },
    { data: groupsRaw },
    { data: expensesRaw },
    { data: personalTxRaw },
  ] = await Promise.all([
    adminDb.from('profiles').select('*', { count: 'exact', head: true }),
    adminDb.from('expense_groups').select('*', { count: 'exact', head: true }),
    adminDb.from('expense_groups').select('*', { count: 'exact', head: true }).eq('is_archived', false),
    adminDb.from('expenses').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    adminDb.from('personal_transactions').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    adminDb
      .from('expense_groups')
      .select('id, name, category, currency, created_by, created_at, is_archived')
      .order('created_at', { ascending: false })
      .limit(20),
    adminDb
      .from('expenses')
      .select('id, group_id, paid_by, title, amount, currency, expense_date, created_at, deleted_at')
      .order('created_at', { ascending: false })
      .limit(30),
    adminDb
      .from('personal_transactions')
      .select('id, user_id, type, title, amount, currency, transaction_date, created_at, deleted_at')
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const groups = groupsRaw ?? []
  const expenses = expensesRaw ?? []
  const personalTransactions = personalTxRaw ?? []

  const profileIds = new Set<string>()
  for (const g of groups) profileIds.add(g.created_by)
  for (const e of expenses) profileIds.add(e.paid_by)
  for (const t of personalTransactions) profileIds.add(t.user_id)

  const groupIds = Array.from(new Set(expenses.map((e) => e.group_id)))

  const [{ data: profilesRaw }, { data: groupsForMapRaw }] = await Promise.all([
    profileIds.size > 0
      ? adminDb.from('profiles').select('id, full_name, email').in('id', Array.from(profileIds))
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null; email: string | null }> }),
    groupIds.length > 0
      ? adminDb.from('expense_groups').select('id, name').in('id', groupIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string }> }),
  ])

  const profiles = new Map((profilesRaw ?? []).map((p) => [p.id, p]))
  const groupsMap = new Map((groupsForMapRaw ?? []).map((g) => [g.id, g]))

  return {
    error: null,
    stats: {
      users: profileCount ?? 0,
      groups: groupCount ?? 0,
      activeGroups: activeGroupCount ?? 0,
      groupExpenses: expenseCount ?? 0,
      personalTransactions: personalTxCount ?? 0,
    },
    groups: groups.map((g) => ({
      ...g,
      creator: profiles.get(g.created_by) ?? null,
    })),
    expenses: expenses.map((e) => ({
      ...e,
      groupName: groupsMap.get(e.group_id)?.name ?? 'Unknown Group',
      paidBy: profiles.get(e.paid_by) ?? null,
    })),
    personalTransactions: personalTransactions.map((t) => ({
      ...t,
      owner: profiles.get(t.user_id) ?? null,
    })),
  }
}

export async function adminToggleGroupArchive(groupId: string, archived: boolean) {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const adminDb = getAdminDb()
  if (!adminDb) return { error: 'Missing SUPABASE_SECRET_KEY' }

  const { error } = await adminDb
    .from('expense_groups')
    .update({ is_archived: archived })
    .eq('id', groupId)

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  revalidatePath('/expenses/admin')
  return { success: true }
}

export async function adminToggleExpenseDeleted(expenseId: string, deleted: boolean) {
  const auth = await requireAdmin()
  if (auth.error) return { error: auth.error }

  const adminDb = getAdminDb()
  if (!adminDb) return { error: 'Missing SUPABASE_SECRET_KEY' }

  const { error } = await adminDb
    .from('expenses')
    .update({ deleted_at: deleted ? new Date().toISOString() : null })
    .eq('id', expenseId)

  if (error) return { error: error.message }

  revalidatePath('/expenses')
  revalidatePath('/expenses/admin')
  return { success: true }
}
