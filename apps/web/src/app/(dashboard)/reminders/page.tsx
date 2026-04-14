import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { RemindersClient } from '@/components/reminders/reminders-client'

export const metadata: Metadata = { title: 'Reminders' }

export default async function RemindersPage() {
  const supabase = createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  const { data: reminders } = await supabase
    .from('reminders')
    .select(`
      *,
      calendar_events (id, title, start_time),
      todos (id, title)
    `)
    .eq('user_id', profile.id)
    .neq('status', 'cancelled')
    .order('remind_at', { ascending: true })

  return <RemindersClient reminders={reminders ?? []} />
}
