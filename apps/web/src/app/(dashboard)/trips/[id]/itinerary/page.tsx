import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { Button } from '@planningo/ui'
import { ArrowLeft } from 'lucide-react'
import { ItineraryClient } from '@/components/trips/itinerary-client'

export const metadata: Metadata = { title: 'Itinerary' }

export default async function ItineraryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (!trip) notFound()

  const { data: items } = await supabase
    .from('itinerary_items')
    .select('*')
    .eq('trip_id', id)
    .order('day_number', { ascending: true })
    .order('sort_order', { ascending: true })

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/trips/${id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {trip.title}
          </Link>
        </Button>
      </div>
      <ItineraryClient trip={trip} items={items ?? []} />
    </div>
  )
}
