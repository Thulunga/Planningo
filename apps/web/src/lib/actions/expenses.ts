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
  paid_by_override: z.string().uuid().optional(), // allow specifying who paid
  link_to_personal: z.boolean().optional().default(false), // auto-track caller's share in personal expenses
  splits: z.array(z.object({
    user_id: z.string().uuid(),
    amount: z.number(),
    percentage: z.number().optional(),
    shares: z.number().int().optional(),
  })),
})

/**
 * Sync the *current user's* auto-linked personal transaction with a group
 * expense. RLS guarantees we can only ever read/write the caller's own
 * personal_transactions rows, so this never touches other members' data.
 *
 * Behaviour matrix:
 *   - enabled && share > 0  -> upsert (create or update title/amount/etc.)
 *   - !enabled || share <= 0 -> soft-delete any existing auto-linked row
 */
async function syncCurrentUserAutoLink(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  groupExpense: {
    id: string
    title: string
    category: string
    currency: string
    expense_date: string
  },
  myShare: number,
  enabled: boolean,
): Promise<{ error?: string }> {
  // Look up an existing auto-linked active row for this (user, expense)
  const { data: existing, error: lookupErr } = await supabase
    .from('personal_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('linked_group_expense_id', groupExpense.id)
    .eq('auto_linked', true)
    .is('deleted_at', null)
    .maybeSingle()

  if (lookupErr) return { error: lookupErr.message }

  const wantsRow = enabled && myShare > 0

  if (!wantsRow) {
    if (existing) {
      const { error: delErr } = await supabase
        .from('personal_transactions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', existing.id)
        .eq('user_id', userId)
      if (delErr) return { error: delErr.message }
    }
    return {}
  }

  // Round to 2dp to match the rest of the system
  const safeShare = Math.round(myShare * 100) / 100

  if (existing) {
    const { error: updErr } = await supabase
      .from('personal_transactions')
      .update({
        type: 'expense',
        amount: safeShare,
        currency: groupExpense.currency,
        title: groupExpense.title,
        expense_category: groupExpense.category,
        transaction_date: groupExpense.expense_date,
      })
      .eq('id', existing.id)
      .eq('user_id', userId)
    if (updErr) return { error: updErr.message }
  } else {
    const { error: insErr } = await supabase.from('personal_transactions').insert({
      user_id: userId,
      type: 'expense',
      amount: safeShare,
      currency: groupExpense.currency,
      title: groupExpense.title,
      expense_category: groupExpense.category,
      transaction_date: groupExpense.expense_date,
      linked_group_expense_id: groupExpense.id,
      auto_linked: true,
      tags: [],
    })
    if (insErr) return { error: insErr.message }
  }

  return {}
}

export async function createExpense(data: z.infer<typeof expenseSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { splits, paid_by_override, link_to_personal, ...expenseData } = data
  const paidBy = paid_by_override ?? user.id

  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({ paid_by: paidBy, ...expenseData })
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

  // Auto-link caller's share to personal expenses if requested
  if (link_to_personal) {
    const myShare = splits.find((s) => s.user_id === user.id)?.amount ?? 0
    const syncRes = await syncCurrentUserAutoLink(
      supabase,
      user.id,
      {
        id: expense.id,
        title: expense.title,
        category: expense.category,
        currency: expense.currency,
        expense_date: expense.expense_date,
      },
      myShare,
      true,
    )
    if (syncRes.error) {
      // Don't fail the whole create -- group expense was saved successfully.
      // Surface a soft warning so the UI can toast it.
      revalidatePath(`/expenses/${data.group_id}`)
      revalidatePath('/expenses')
      revalidatePath('/expenses/budget')
      return {
        success: true,
        expense,
        warning: `Group expense saved, but couldn't add to personal expenses: ${syncRes.error}`,
      }
    }
  }

  revalidatePath(`/expenses/${data.group_id}`)
  revalidatePath('/expenses')
  revalidatePath('/expenses/budget')
  return { success: true, expense }
}

export async function deleteExpense(id: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is a group member before allowing delete
  const { data: membership } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { error: 'Not a member of this group' }

  const { error } = await supabase
    .from('expenses')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('group_id', groupId)

  if (error) return { error: error.message }

  // Soft-delete the *current user's* auto-linked personal transaction (if any).
  // RLS prevents touching other users' rows; their auto-links will simply
  // dangle until they next open the dialog or are cleaned up by FK on hard
  // delete. Manually-linked rows (auto_linked=false) are left alone.
  await supabase
    .from('personal_transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('linked_group_expense_id', id)
    .eq('auto_linked', true)
    .is('deleted_at', null)

  revalidatePath(`/expenses/${groupId}`)
  revalidatePath('/expenses/budget')
  return { success: true }
}

export async function updateExpense(
  id: string,
  groupId: string,
  data: {
    title: string
    amount: number
    category: string
    expense_date: string
    paid_by: string
    currency?: string
    link_to_personal?: boolean
  },
  splits: { user_id: string; amount: number }[],
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify user is a group member
  const { data: membership } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)
    .eq('user_id', user.id)
    .single()
  if (!membership) return { error: 'Not a member of this group' }

  const { error } = await supabase
    .from('expenses')
    .update({
      title: data.title,
      amount: data.amount,
      category: data.category,
      expense_date: data.expense_date,
      paid_by: data.paid_by,
    })
    .eq('id', id)
    .eq('group_id', groupId)

  if (error) return { error: error.message }

  const { error: deleteErr } = await supabase.from('expense_splits').delete().eq('expense_id', id)
  if (deleteErr) return { error: deleteErr.message }

  const { error: insertErr } = await supabase.from('expense_splits').insert(
    splits.map((s) => ({ expense_id: id, user_id: s.user_id, amount: s.amount }))
  )
  if (insertErr) return { error: insertErr.message }

  // Sync caller's auto-linked personal transaction. We always run sync (even
  // when link_to_personal === false) so that turning the toggle OFF in edit
  // mode soft-deletes the previously auto-created personal row.
  const myShare = splits.find((s) => s.user_id === user.id)?.amount ?? 0
  let currency = data.currency
  if (!currency) {
    const { data: groupRow } = await supabase
      .from('expense_groups')
      .select('currency')
      .eq('id', groupId)
      .single()
    currency = groupRow?.currency ?? 'USD'
  }
  const syncRes = await syncCurrentUserAutoLink(
    supabase,
    user.id,
    {
      id,
      title: data.title,
      category: data.category,
      currency,
      expense_date: data.expense_date,
    },
    myShare,
    Boolean(data.link_to_personal),
  )

  revalidatePath(`/expenses/${groupId}`)
  revalidatePath('/expenses/budget')

  if (syncRes.error) {
    return {
      success: true as const,
      warning: `Group expense saved, but personal-expense sync failed: ${syncRes.error}`,
    }
  }
  return { success: true }
}

/**
 * Returns whether the *current user* already has an active auto-linked
 * personal transaction for the given group expense. Used by the edit dialog
 * to pre-set the "Track my share" toggle.
 */
export async function getMyAutoLinkStatus(expenseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { autoLinked: false }

  const { data } = await supabase
    .from('personal_transactions')
    .select('id')
    .eq('user_id', user.id)
    .eq('linked_group_expense_id', expenseId)
    .eq('auto_linked', true)
    .is('deleted_at', null)
    .maybeSingle()

  return { autoLinked: Boolean(data) }
}

export async function createSettlement(data: {
  group_id: string
  paid_by?: string  // defaults to current user if omitted
  paid_to: string
  amount: number
  currency: string
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const paidBy = data.paid_by || user.id
  if (paidBy === data.paid_to) return { error: 'Payer and payee cannot be the same person' }

  const { error } = await supabase.from('settlements').insert({
    paid_by: paidBy,
    paid_to: data.paid_to,
    group_id: data.group_id,
    amount: data.amount,
    currency: data.currency,
    notes: data.notes,
  })

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${data.group_id}`)
  return { success: true }
}

export async function updateSettlement(id: string, groupId: string, data: {
  paid_by: string
  paid_to: string
  amount: number
  notes?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (data.paid_by === data.paid_to) return { error: 'Payer and payee cannot be the same person' }

  const { error } = await supabase
    .from('settlements')
    .update({ paid_by: data.paid_by, paid_to: data.paid_to, amount: data.amount, notes: data.notes })
    .eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

export async function deleteSettlement(id: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('settlements').delete().eq('id', id)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

/**
 * Get group info from invite code (public, no auth required)
 */
export async function getInviteGroupInfo(inviteCode: string) {
  const supabase = await createClient()

  try {
    // Find the invitation
    const { data: invitation, error } = await supabase
      .from('group_invitations')
      .select('id, group_id, status, expires_at')
      .eq('invite_code', inviteCode)
      .single()

    if (error || !invitation) {
      return { error: 'Invalid invite code' }
    }

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return { error: 'Invite code has expired' }
    }

    // Check if already used
    if (invitation.status === 'accepted') {
      return { error: 'This invite code has already been used' }
    }

    // Get group info separately
    const { data: group, error: groupError } = await supabase
      .from('expense_groups')
      .select('id, name, currency')
      .eq('id', invitation.group_id)
      .single()

    if (groupError || !group) {
      return { error: 'Group not found' }
    }

    return { 
      success: true, 
      group,
      groupId: invitation.group_id
    }
  } catch (err: any) {
    console.error('Get invite info error:', err)
    return { error: 'Failed to retrieve group information' }
  }
}

/**
 * Search for users by name or email (excluding current user and existing members)
 */
export async function searchGroupUsers(groupId: string, query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', users: [] }

  if (!query.trim()) return { users: [] }

  // Get existing members in the group
  const { data: existingMembers } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', groupId)

  const existingMemberIds = existingMembers?.map((m) => m.user_id) || []

  // Search profiles - get all users first, filter client-side
  const { data: allUsers, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, avatar_url')
    .neq('id', user.id)
    .limit(100)

  if (error) {
    console.error('Search profiles error:', error)
    console.error('Error details:', { code: error.code, message: error.message })
    return { error: `Failed to search profiles: ${error.message}`, users: [] }
  }

  if (!allUsers) {
    console.warn('No profiles data returned')
    return { users: [] }
  }

  console.log(`Total profiles fetched: ${allUsers.length}`)

  if (allUsers.length === 0) {
    console.warn('Profiles table appears to be empty')
    return { users: [] }
  }

  // Filter based on search query (client-side for better matching)
  const q = query.toLowerCase().trim()
  console.log(`Searching for: "${q}" among ${allUsers.length} profiles`)
  
  const filtered = allUsers.filter((u) => {
    // Skip existing members
    if (existingMemberIds.includes(u.id)) {
      console.log(`Skipping ${u.email} - already in group`)
      return false
    }
    
    const name = (u.full_name || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    
    const matches = name.includes(q) || email.includes(q)
    if (matches) {
      console.log(`Match found: ${u.full_name} (${u.email})`)
    }
    // Match name or email
    return matches
  }).slice(0, 10)

  console.log(`Search complete: ${filtered.length} matches found`)

  return { users: filtered }
}

/**
 * Generate an invite code for the group
 */
export async function generateGroupInviteCode(groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  try {
    // Check if user is admin of the group
    const { data: member, error: memberError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single()

    if (memberError || !member || member.role !== 'admin') {
      return { error: 'Only group admins can generate invites' }
    }

    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 10) + Date.now().toString(36)

    const { data: invitation, error } = await supabase
      .from('group_invitations')
      .insert({
        group_id: groupId,
        created_by: user.id,
        invite_code: inviteCode,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select('invite_code')
      .single()

    if (error) {
      console.error('Invite creation error:', error)
      return { error: error.message }
    }

    revalidatePath(`/expenses/${groupId}`)
    return { success: true, inviteCode: invitation?.invite_code || inviteCode }
  } catch (err: any) {
    console.error('Generate invite error:', err)
    return { error: 'Failed to generate invite code' }
  }
}

/**
 * Join a group using an invite code
 */
export async function joinGroupWithInviteCode(inviteCode: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Find the invitation
  const { data: invitation } = await supabase
    .from('group_invitations')
    .select('id, group_id, status, expires_at')
    .eq('invite_code', inviteCode)
    .single()

  if (!invitation) {
    return { error: 'Invalid invite code' }
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    return { error: 'Invite code has expired' }
  }

  // Check if already used
  if (invitation.status === 'accepted') {
    return { error: 'This invite code has already been used' }
  }

  // Check if user is already in group
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('user_id')
    .eq('group_id', invitation.group_id)
    .eq('user_id', user.id)
    .single()

  if (existingMember) {
    return { error: 'You are already a member of this group' }
  }

  // Add user to group
  const { error: memberError } = await supabase.from('group_members').insert({
    group_id: invitation.group_id,
    user_id: user.id,
    role: 'member',
  })

  if (memberError) {
    return { error: memberError.message }
  }

  // Update invitation status
  const { error: updateError } = await supabase
    .from('group_invitations')
    .update({
      status: 'accepted',
      accepted_by: user.id,
    })
    .eq('id', invitation.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath(`/expenses/${invitation.group_id}`)
  revalidatePath('/expenses')
  return { success: true, groupId: invitation.group_id }
}
