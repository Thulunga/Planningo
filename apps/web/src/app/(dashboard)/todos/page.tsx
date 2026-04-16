import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { TodosClient } from '@/components/todos/todos-client'
import TodosLoading from './loading'

export const metadata: Metadata = { title: 'Todos' }

async function TodosList({
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
    .limit(200)

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.priority) query = query.eq('priority', searchParams.priority)
  if (searchParams.tag) query = query.contains('tags', [searchParams.tag])

  const { data: todos } = await query

  return <TodosClient todos={todos ?? []} />
}

export default function TodosPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; tag?: string }
}) {
  return (
    <Suspense fallback={<TodosLoading />}>
      <TodosList searchParams={searchParams} />
    </Suspense>
  )
}
