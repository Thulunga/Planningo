import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { DashboardOverview } from '@/components/dashboard/dashboard-overview'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const profile = await getUserProfile()

  if (!profile) return null

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Run all three queries in parallel - cuts fetch time by ~2/3
  const [{ data: todaysTodos }, { data: upcomingEvents }, { data: todaysPlanner }] =
    await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .eq('user_id', profile.id)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .is('deleted_at', null)
        .order('priority', { ascending: false })
        .limit(5),

      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', profile.id)
        .gte('start_time', now)
        .lte('start_time', nextWeek)
        .is('deleted_at', null)
        .order('start_time', { ascending: true })
        .limit(5),

      supabase
        .from('planner_entries')
        .select('*')
        .eq('user_id', profile.id)
        .eq('plan_date', today)
        .order('start_time', { ascending: true })
        .limit(20),
    ])

  return (
    <DashboardOverview
      profile={profile}
      todaysTodos={todaysTodos ?? []}
      upcomingEvents={upcomingEvents ?? []}
      todaysPlanner={todaysPlanner ?? []}
    />
  )
}
