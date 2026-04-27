import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { CalendarClient } from '@/components/calendar/calendar-client'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const supabase = await createClient()

  // Wider initial window so users can navigate ±2 months without a refetch.
  const now = new Date()
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0)

  const [profile, eventsRes] = await Promise.all([
    getUserProfile(),
    supabase
      .from('calendar_events')
      .select('*')
      .gte('start_time', rangeStart.toISOString())
      .lte('end_time', rangeEnd.toISOString())
      .is('deleted_at', null)
      .order('start_time', { ascending: true }),
  ])

  if (!profile) return null

  return (
    <CalendarClient
      initialEvents={eventsRes.data ?? []}
      initialRangeStart={rangeStart.toISOString()}
      initialRangeEnd={rangeEnd.toISOString()}
      timezone={profile.timezone ?? undefined}
    />
  )
}
