import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { Button, Badge, Card, CardContent, Separator } from '@planningo/ui'
import { ArrowLeft, Plus, Users } from 'lucide-react'
import { GroupExpensesClient } from '@/components/expenses/group-expenses-client'

export const metadata: Metadata = { title: 'Group Expenses' }

export default async function GroupExpensesPage({ params }: { params: { groupId: string } }) {
  const supabase = createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  const { data: group } = await supabase
    .from('expense_groups')
    .select('*, group_members(user_id, role, profiles(id, full_name, email, avatar_url))')
    .eq('id', params.groupId)
    .single()

  if (!group) notFound()

  const { data: expenses } = await supabase
    .from('expenses')
    .select('*, expense_splits(*), profiles!expenses_paid_by_fkey(id, full_name, avatar_url)')
    .eq('group_id', params.groupId)
    .is('deleted_at', null)
    .order('expense_date', { ascending: false })

  const { data: settlements } = await supabase
    .from('settlements')
    .select('*, paid_by_profile:profiles!settlements_paid_by_fkey(id, full_name), paid_to_profile:profiles!settlements_paid_to_fkey(id, full_name)')
    .eq('group_id', params.groupId)
    .order('settled_at', { ascending: false })

  return (
    <GroupExpensesClient
      group={group}
      expenses={expenses ?? []}
      settlements={settlements ?? []}
      currentUserId={profile.id}
    />
  )
}
