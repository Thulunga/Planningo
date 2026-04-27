import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { PlannerClient } from '@/components/planner/planner-client'

export const metadata: Metadata = { title: 'Day Planner' }

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const { date } = await searchParams
  const targetDate = date ?? new Date().toISOString().split('T')[0]!

  const supabase = await createClient()
  const dayStart = new Date(`${targetDate}T00:00:00`).toISOString()
  const dayEnd = new Date(`${targetDate}T23:59:59`).toISOString()

  // Fetch profile + entries + linkable sources in parallel
  const [profile, entriesRes, todosRes, eventsRes] = await Promise.all([
    getUserProfile(),
    supabase
      .from('planner_entries')
      .select('*')
      .eq('plan_date', targetDate)
      .order('start_time', { ascending: true }),
    supabase
      .from('todos')
      .select('id, title')
      .is('deleted_at', null)
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('calendar_events')
      .select('id, title')
      .is('deleted_at', null)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time', { ascending: true })
      .limit(50),
  ])

  if (!profile) return null

  return (
    <PlannerClient
      initialEntries={entriesRes.data ?? []}
      initialDate={targetDate}
      linkableTodos={todosRes.data ?? []}
      linkableEvents={eventsRes.data ?? []}
    />
  )
}
