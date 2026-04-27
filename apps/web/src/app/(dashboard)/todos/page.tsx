import { Suspense } from 'react'
import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { TodosClient } from '@/components/todos/todos-client'
import TodosLoading from './loading'

export const metadata: Metadata = { title: 'Todos' }

const VALID_STATUSES = new Set(['todo', 'in_progress', 'done', 'cancelled'])

async function TodosList({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; priority?: string; tag?: string }>
}) {
  const { view, priority, tag } = await searchParams
  const supabase = await createClient()
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

  if (view && VALID_STATUSES.has(view)) {
    query = query.eq('status', view)
  }
  if (priority) query = query.eq('priority', priority)
  if (tag) query = query.contains('tags', [tag])

  const { data: todos } = await query

  return <TodosClient todos={todos ?? []} view={view ?? 'all'} />
}

export default function TodosPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; priority?: string; tag?: string }>
}) {
  return (
    <Suspense fallback={<TodosLoading />}>
      <TodosList searchParams={searchParams} />
    </Suspense>
  )
}
