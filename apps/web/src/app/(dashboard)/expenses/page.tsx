import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { ExpensesClient } from '@/components/expenses/expenses-client'
import { getUser } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Expenses' }

export default async function ExpensesPage() {
  const supabase = await createClient()
  const [profile, user] = await Promise.all([getUserProfile(), getUser()])
  if (!profile) return null

  const isAdmin = !!(
    user?.email &&
    process.env.ADMIN_EMAIL &&
    user.email === process.env.ADMIN_EMAIL
  )

  // Get groups where user is a member
  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', profile.id)

  const groupIds = (memberships ?? []).map((m) => m.group_id)

  const { data: groups } = groupIds.length
    ? await supabase
        .from('expense_groups')
        .select('*, group_members(user_id, role)')
        .in('id', groupIds)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false })
    : { data: [] }

  return <ExpensesClient groups={groups ?? []} userId={profile.id} isAdmin={isAdmin} />
}
