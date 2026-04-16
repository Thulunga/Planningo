import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { CalendarClient } from '@/components/calendar/calendar-client'

export const metadata: Metadata = { title: 'Calendar' }

export default async function CalendarPage() {
  const supabase = await createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  // Fetch events for the current month ± 1 month buffer
  const rangeStart = new Date()
  rangeStart.setMonth(rangeStart.getMonth() - 1)
  rangeStart.setDate(1)

  const rangeEnd = new Date()
  rangeEnd.setMonth(rangeEnd.getMonth() + 2)
  rangeEnd.setDate(0)

  const { data: events } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', profile.id)
    .gte('start_time', rangeStart.toISOString())
    .lte('end_time', rangeEnd.toISOString())
    .is('deleted_at', null)
    .order('start_time', { ascending: true })

  return <CalendarClient initialEvents={events ?? []} />
}
