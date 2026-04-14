import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { PlannerClient } from '@/components/planner/planner-client'

export const metadata: Metadata = { title: 'Day Planner' }

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const supabase = createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  const targetDate = searchParams.date ?? new Date().toISOString().split('T')[0]

  const { data: entries } = await supabase
    .from('planner_entries')
    .select('*')
    .eq('user_id', profile.id)
    .eq('plan_date', targetDate)
    .order('start_time', { ascending: true })

  return <PlannerClient initialEntries={entries ?? []} initialDate={targetDate} />
}
