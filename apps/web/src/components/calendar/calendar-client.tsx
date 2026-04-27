'use client'

import { useState, useMemo, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Search, X, Loader2 } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input } from '@planningo/ui'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  restoreCalendarEvent,
  getEventsInRange,
} from '@/lib/actions/calendar'
import { CalendarView, type CalEvent, type CalViewType } from './calendar-view'
import { EventForm, type EventFormData } from './event-form'
import { EventDetail } from './event-detail'
import type { Tables } from '@planningo/database'

interface CalendarClientProps {
  initialEvents: Tables<'calendar_events'>[]
  initialRangeStart: string
  initialRangeEnd: string
  timezone?: string
}

function toCalEvent(e: Tables<'calendar_events'>): CalEvent {
  return {
    id: e.id,
    title: e.title,
    start: new Date(e.start_time),
    end: new Date(e.end_time),
    allDay: e.all_day,
    color: e.color,
    location: e.location,
  }
}

export function CalendarClient({
  initialEvents,
  initialRangeStart,
  initialRangeEnd,
}: CalendarClientProps) {
  const [events, setEvents] = useState<Tables<'calendar_events'>[]>(initialEvents)
  const [view, setView] = useState<CalViewType>('month')
  const [date, setDate] = useState(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Tables<'calendar_events'> | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; allDay?: boolean } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Tables<'calendar_events'> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [lazyLoading, setLazyLoading] = useState(false)
  const [, startTransition] = useTransition()

  const loadedRangeRef = useRef<{ start: number; end: number }>({
    start: new Date(initialRangeStart).getTime(),
    end: new Date(initialRangeEnd).getTime(),
  })

  // ─── filtered view events ────────────────────────────────

  const calEvents = useMemo<CalEvent[]>(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? events.filter((e) =>
          [e.title, e.location, e.description]
            .filter(Boolean)
            .some((t) => (t as string).toLowerCase().includes(q))
        )
      : events
    return filtered.map(toCalEvent)
  }, [events, search])

  // ─── lazy range fetch ────────────────────────────────────

  useEffect(() => {
    const visibleStart = new Date(date)
    const visibleEnd = new Date(date)
    if (view === 'month' || view === 'agenda') {
      visibleStart.setDate(1)
      visibleStart.setMonth(visibleStart.getMonth() - 1)
      visibleEnd.setMonth(visibleEnd.getMonth() + 2)
      visibleEnd.setDate(0)
    } else {
      visibleStart.setDate(date.getDate() - 7)
      visibleEnd.setDate(date.getDate() + 14)
    }

    const needStart = visibleStart.getTime()
    const needEnd = visibleEnd.getTime()
    const loaded = loadedRangeRef.current
    if (needStart >= loaded.start && needEnd <= loaded.end) return

    const fetchStart = new Date(Math.min(needStart, loaded.start))
    const fetchEnd = new Date(Math.max(needEnd, loaded.end))

    setLazyLoading(true)
    let cancelled = false
    getEventsInRange(fetchStart.toISOString(), fetchEnd.toISOString())
      .then(({ events: fresh }) => {
        if (cancelled) return
        setEvents((prev) => {
          const map = new Map<string, Tables<'calendar_events'>>()
          for (const e of prev) map.set(e.id, e)
          for (const e of fresh) map.set(e.id, e)
          return Array.from(map.values())
        })
        loadedRangeRef.current = { start: fetchStart.getTime(), end: fetchEnd.getTime() }
      })
      .finally(() => !cancelled && setLazyLoading(false))

    return () => { cancelled = true }
  }, [date, view])

  // ─── slot / event handlers ───────────────────────────────

  function handleSlotClick(start: Date, end: Date, allDay?: boolean) {
    setSelectedSlot({ start, end, allDay })
    setEditingEvent(null)
    setIsFormOpen(true)
  }

  function handleEventClick(id: string) {
    const evt = events.find((e) => e.id === id)
    if (evt) setSelectedEvent(evt)
  }

  // ─── form submit (create + edit) ─────────────────────────

  async function handleFormSubmit(data: EventFormData) {
    setIsSaving(true)

    if (editingEvent) {
      const optimistic: Tables<'calendar_events'> = {
        ...editingEvent,
        ...data,
        description: data.description ?? null,
        location: data.location ?? null,
        updated_at: new Date().toISOString(),
      }
      setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? optimistic : e)))

      const result = await updateCalendarEvent(editingEvent.id, data)
      setIsSaving(false)
      if (result.error) {
        setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? editingEvent : e)))
        toast.error(result.error)
        return
      }
      if (result.event) {
        setEvents((prev) => prev.map((e) => (e.id === result.event!.id ? result.event! : e)))
      }
      toast.success('Event updated')
      setIsFormOpen(false)
      setEditingEvent(null)
      setSelectedEvent(null)
    } else {
      const result = await createCalendarEvent(data)
      setIsSaving(false)
      if (result.error) { toast.error(result.error); return }
      if (result.event) setEvents((prev) => [...prev, result.event!])
      toast.success('Event created')
      setIsFormOpen(false)
      setSelectedSlot(null)
    }
  }

  // ─── delete + undo ───────────────────────────────────────

  async function handleDeleteEvent(id: string) {
    const original = events.find((e) => e.id === id)
    if (!original) return

    setEvents((prev) => prev.filter((e) => e.id !== id))
    setSelectedEvent(null)

    const result = await deleteCalendarEvent(id)
    if (result.error) {
      setEvents((prev) => [...prev, original])
      toast.error(result.error)
      return
    }

    toast.success('Event deleted', {
      action: {
        label: 'Undo',
        onClick: async () => {
          const restored = await restoreCalendarEvent(id)
          if (restored.error) { toast.error(restored.error); return }
          if (restored.event) setEvents((prev) => [...prev, restored.event!])
          toast.success('Event restored')
        },
      },
    })
  }

  // ─── render ──────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Outer toolbar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Calendar</h1>
          {lazyLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-8 pr-7 sm:w-56"
              aria-label="Search events"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Button
            onClick={() => {
              setEditingEvent(null)
              setSelectedSlot(null)
              setIsFormOpen(true)
            }}
            className="shrink-0 gap-1.5"
            aria-label="New event"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Event</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {search && (
        <p className="text-xs text-muted-foreground">
          {calEvents.length} result{calEvents.length === 1 ? '' : 's'} for &ldquo;{search}&rdquo;
        </p>
      )}

      <CalendarView
        events={calEvents}
        view={view}
        date={date}
        onNavigate={setDate}
        onViewChange={setView}
        onSlotClick={handleSlotClick}
        onEventClick={handleEventClick}
      />

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) { setSelectedSlot(null); setEditingEvent(null) }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
          </DialogHeader>
          <EventForm
            initial={editingEvent ?? undefined}
            defaultStart={selectedSlot?.start}
            defaultEnd={selectedSlot?.end}
            onSubmit={handleFormSubmit}
            onCancel={() => { setIsFormOpen(false); setSelectedSlot(null); setEditingEvent(null) }}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEdit={() => {
            setEditingEvent(selectedEvent)
            setSelectedEvent(null)
            setIsFormOpen(true)
          }}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  )
}
