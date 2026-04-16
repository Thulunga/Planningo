'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const expenseGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().optional().nullable(),
  currency: z.string().default('USD'),
  category: z.string().default('general'),
})

export async function createExpenseGroup(data: z.infer<typeof expenseGroupSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Generate the group ID here so we can skip RETURNING on the INSERT.
  // PostgreSQL 15 evaluates the SELECT policy on RETURNING rows before the
  // creator has been added to group_members, which triggers an RLS violation.
  // By supplying the ID we avoid RETURNING entirely.
  const groupId = crypto.randomUUID()

  const { error } = await supabase
    .from('expense_groups')
    .insert({ id: groupId, created_by: user.id, ...data })

  if (error) return { error: error.message }

  // Auto-add creator as admin member
  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: user.id,
    role: 'admin',
  })

  if (memberError) return { error: memberError.message }

  revalidatePath('/expenses')
  return { success: true, group: { id: groupId } }
}

export async function addGroupMember(groupId: string, userEmail: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Look up user by email
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', userEmail)
    .single()

  if (!targetProfile) {
    return { error: 'No Planningo account found with that email. They need to sign up first.' }
  }

  const { error } = await supabase.from('group_members').insert({
    group_id: groupId,
    user_id: targetProfile.id,
    role: 'member',
  })

  if (error) {
    if (error.code === '23505') return { error: 'User is already in this group' }
    return { error: error.message }
  }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

const expenseSchema = z.object({
  group_id: z.string().uuid(),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  category: z.string().default('general'),
  split_type: z.enum(['equal', 'exact', 'percentage', 'shares']).default('equal'),
  expense_date: z.string().default(() => new Date().toISOString().split('T')[0]!),
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number(),
    percentage: z.number().optional(),
    shares: z.number().int().optional(),
  })),
})

export async function createExpense(data: z.infer<typeof expenseSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { splits, ...expenseData } = data

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ paid_by: user.id, ...expenseData })
    .select()
    .single()

  if (error) return { error: error.message }

  // Insert splits
  const { error: splitsError } = await supabase.from('expense_splits').insert(
    splits.map((split) => ({
      expense_id: expense.id,
      ...split,
    }))
  )

  if (splitsError) return { error: splitsError.message }

  revalidatePath(`/expenses/${data.group_id}`)
  revalidatePath('/expenses')
  return { success: true, expense }
}

export async function deleteExpense(id: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('paid_by', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

export async function createSettlement(data: {
  group_id: string
  paid_to: string
  amount: number
  currency: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('settlements').insert({
    paid_by: user.id,
    ...data,
  })

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${data.group_id}`)
  return { success: true }
}
