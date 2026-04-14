'use client'

import { useState } from 'react'
import { format, addDays, parseISO, differenceInDays } from 'date-fns'
import { toast } from 'sonner'
import { Plus, MapPin, Clock, DollarSign, Trash2, Loader2, ExternalLink } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
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
import { createItineraryItem, deleteItineraryItem } from '@/lib/actions/trips'
import type { Tables } from '@planningo/database'
import { useRouter } from 'next/navigation'

const categoryConfig: Record<string, { label: string; color: string }> = {
  transport: { label: 'Transport', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  accommodation: { label: 'Stay', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  activity: { label: 'Activity', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
  restaurant: { label: 'Food', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  sightseeing: { label: 'Sightseeing', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  other: { label: 'Other', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
}

interface ItineraryClientProps {
  trip: Tables<'trips'>
  items: Tables<'itinerary_items'>[]
}

export function ItineraryClient({ trip, items: initialItems }: ItineraryClientProps) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState({
    day_number: 1,
    category: 'activity' as const,
    title: '',
    description: '',
    location: '',
    start_time: '',
    cost: '',
    booking_ref: '',
    url: '',
    notes: '',
  })

  const duration = differenceInDays(new Date(trip.end_date), new Date(trip.start_date)) + 1
  const days = Array.from({ length: duration }, (_, i) => i + 1)

  async function handleCreate() {
    if (!newItem.title.trim()) {
      toast.error('Title is required')
      return
    }
    setSaving(true)
    const result = await createItineraryItem({
      trip_id: trip.id,
      day_number: newItem.day_number,
      category: newItem.category,
      title: newItem.title.trim(),
      description: newItem.description || null,
      location: newItem.location || null,
      start_time: newItem.start_time || null,
      cost: newItem.cost ? parseFloat(newItem.cost) : null,
      booking_ref: newItem.booking_ref || null,
      url: newItem.url || null,
      notes: newItem.notes || null,
    })
    setSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Item added')
      setIsCreateOpen(false)
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    const result = await deleteItineraryItem(id, trip.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id))
      toast.success('Item removed')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Itinerary</h1>
          <p className="text-sm text-muted-foreground">{trip.title} · {duration} days</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No itinerary items yet</p>
            <Button variant="ghost" className="mt-2" onClick={() => setIsCreateOpen(true)}>
              Start planning
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {days.map((day) => {
            const dayItems = items.filter((i) => i.day_number === day)
            if (dayItems.length === 0) return null

            const dayDate = addDays(parseISO(trip.start_date), day - 1)

            return (
              <section key={day}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {day}
                  </span>
                  Day {day} · {format(dayDate, 'EEEE, MMM d')}
                </h2>
                <div className="space-y-2">
                  {dayItems.map((item) => {
                    const catCfg = categoryConfig[item.category] ?? categoryConfig.other!

                    return (
                      <Card key={item.id}>
                        <CardContent className="flex items-start gap-3 py-3">
                          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${catCfg.color}`}>
                            {catCfg.label}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-3">
                              {item.location && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <MapPin className="h-3 w-3" />
                                  {item.location}
                                </span>
                              )}
                              {item.start_time && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(item.start_time), 'h:mm a')}
                                </span>
                              )}
                              {item.cost && (
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <DollarSign className="h-3 w-3" />
                                  {item.currency} {item.cost}
                                </span>
                              )}
                              {item.booking_ref && (
                                <span className="text-xs text-muted-foreground">
                                  Ref: {item.booking_ref}
                                </span>
                              )}
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Link
                                </a>
                              )}
                            </div>
                            {item.notes && (
                              <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>
                            )}
                          </div>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="shrink-0 rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Itinerary Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Day *</Label>
                <Select
                  value={String(newItem.day_number)}
                  onValueChange={(v) => setNewItem((p) => ({ ...p, day_number: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map((d) => (
                      <SelectItem key={d} value={String(d)}>Day {d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(v) => setNewItem((p) => ({ ...p, category: v as typeof newItem.category }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryConfig).map(([value, { label }]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                placeholder="What are you doing?"
                value={newItem.title}
                onChange={(e) => setNewItem((p) => ({ ...p, title: e.target.value }))}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                placeholder="Where?"
                value={newItem.location}
                onChange={(e) => setNewItem((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="datetime-local"
                  value={newItem.start_time}
                  onChange={(e) => setNewItem((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newItem.cost}
                  onChange={(e) => setNewItem((p) => ({ ...p, cost: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Booking Ref</Label>
              <Input
                placeholder="Confirmation code"
                value={newItem.booking_ref}
                onChange={(e) => setNewItem((p) => ({ ...p, booking_ref: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Item
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
