'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { Plus, Plane, MapPin, Calendar, DollarSign, Loader2, ArrowRight } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@planningo/ui'
import { createTrip } from '@/lib/actions/trips'
import type { Tables } from '@planningo/database'
import { useRouter } from 'next/navigation'
import { FeedbackCta } from '@/components/feedback/feedback-cta'

const statusConfig = {
  planning: { label: 'Planning', variant: 'secondary' as const },
  confirmed: { label: 'Confirmed', variant: 'default' as const },
  ongoing: { label: 'Ongoing', variant: 'success' as const },
  completed: { label: 'Completed', variant: 'secondary' as const },
  cancelled: { label: 'Cancelled', variant: 'destructive' as const },
}

interface TripsClientProps {
  trips: Tables<'trips'>[]
}

export function TripsClient({ trips }: TripsClientProps) {
  const router = useRouter()
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newTrip, setNewTrip] = useState({
    title: '',
    destination: '',
    description: '',
    start_date: '',
    end_date: '',
    budget: '',
    currency: 'USD',
  })

  async function handleCreate() {
    if (!newTrip.title.trim() || !newTrip.start_date || !newTrip.end_date) {
      toast.error('Title, start date and end date are required')
      return
    }
    setSaving(true)
    const result = await createTrip({
      title: newTrip.title.trim(),
      destination: newTrip.destination || null,
      description: newTrip.description || null,
      start_date: newTrip.start_date,
      end_date: newTrip.end_date,
      budget: newTrip.budget ? parseFloat(newTrip.budget) : null,
      currency: newTrip.currency,
    })
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Trip created!')
      setIsCreateOpen(false)
      if (result.trip) router.push(`/trips/${result.trip.id}`)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trips</h1>
          <p className="text-sm text-muted-foreground">{trips.length} trip(s)</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          New Trip
        </Button>
      </div>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plane className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No trips planned yet</p>
            <Button variant="ghost" className="mt-2" onClick={() => setIsCreateOpen(true)}>
              Plan your first trip
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const duration = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1
            const statusCfg = statusConfig[trip.status]

            return (
              <Card key={trip.id} className="group overflow-hidden transition-shadow hover:shadow-md">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{trip.title}</CardTitle>
                    <Badge variant={statusCfg.variant} className="shrink-0 text-xs">
                      {statusCfg.label}
                    </Badge>
                  </div>
                  {trip.destination && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {trip.destination}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 pb-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(trip.start_date), 'MMM d')} –{' '}
                    {format(new Date(trip.end_date), 'MMM d, yyyy')} · {duration} days
                  </div>
                  {trip.budget && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      Budget: {trip.currency} {trip.budget.toLocaleString()}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                      <Link href={`/trips/${trip.id}`}>
                        Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                      <Link href={`/trips/${trip.id}/itinerary`}>
                        Itinerary
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <FeedbackCta
        heading="Feedback for Trips."
        description="Share trip-planning ideas, report itinerary issues, or request new travel tools."
      />

      {/* Create Trip Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Plan a New Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Trip Name *</Label>
              <Input
                placeholder="e.g. Tokyo 2025"
                value={newTrip.title}
                onChange={(e) => setNewTrip((p) => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <Input
                placeholder="e.g. Tokyo, Japan"
                value={newTrip.destination}
                onChange={(e) => setNewTrip((p) => ({ ...p, destination: e.target.value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={newTrip.start_date}
                  onChange={(e) => setNewTrip((p) => ({ ...p, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>End Date *</Label>
                <Input
                  type="date"
                  value={newTrip.end_date}
                  onChange={(e) => setNewTrip((p) => ({ ...p, end_date: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Budget (optional)</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newTrip.budget}
                  onChange={(e) => setNewTrip((p) => ({ ...p, budget: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select
                  value={newTrip.currency}
                  onValueChange={(v) => setNewTrip((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="What's this trip about?"
                rows={2}
                value={newTrip.description}
                onChange={(e) => setNewTrip((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Trip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
