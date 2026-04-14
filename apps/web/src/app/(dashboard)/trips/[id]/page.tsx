import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { Button, Badge, Card, CardContent } from '@planningo/ui'
import { MapPin, Calendar, DollarSign, ArrowLeft, Map } from 'lucide-react'

export const metadata: Metadata = { title: 'Trip Details' }

export default async function TripDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const profile = await getUserProfile()
  if (!profile) return null

  const { data: trip } = await supabase
    .from('trips')
    .select('*')
    .eq('id', params.id)
    .is('deleted_at', null)
    .single()

  if (!trip) notFound()

  const duration = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/trips">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Trips
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{trip.title}</h1>
          {trip.destination && (
            <p className="mt-1 flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {trip.destination}
            </p>
          )}
        </div>
        <Badge variant="secondary" className="capitalize">{trip.status}</Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Dates</p>
              <p className="text-sm font-medium">
                {format(new Date(trip.start_date), 'MMM d')} – {format(new Date(trip.end_date), 'MMM d, yyyy')}
              </p>
              <p className="text-xs text-muted-foreground">{duration} days</p>
            </div>
          </CardContent>
        </Card>

        {trip.budget && (
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Budget</p>
                <p className="text-sm font-medium">
                  {trip.currency} {trip.budget.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {trip.description && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wider">Description</h2>
          <p className="text-sm leading-relaxed">{trip.description}</p>
        </div>
      )}

      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/trips/${trip.id}/itinerary`}>
            <Map className="mr-2 h-4 w-4" />
            View Itinerary
          </Link>
        </Button>
      </div>
    </div>
  )
}
