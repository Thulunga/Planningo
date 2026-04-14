import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { TodosClient } from '@/components/todos/todos-client'

export const metadata: Metadata = { title: 'Todos' }

export default async function TodosPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; tag?: string }
}) {
  const supabase = createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  let query = supabase
    .from('todos')
    .select('*')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .order('priority', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)
  if (searchParams.tag) query = query.contains('tags', [searchParams.tag])

  const { data: todos } = await query

  return <TodosClient todos={todos ?? []} />
}
