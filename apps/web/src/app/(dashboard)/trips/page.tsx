import type { Metadata } from 'next'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { TripsClient } from '@/components/trips/trips-client'

export const metadata: Metadata = { title: 'Trips' }

export default async function TripsPage() {
  const supabase = createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  const { data: trips } = await supabase
    .from('trips')
    .select('*')
    .eq('user_id', profile.id)
    .is('deleted_at', null)
    .order('start_date', { ascending: true })

  return <TripsClient trips={trips ?? []} />
}
