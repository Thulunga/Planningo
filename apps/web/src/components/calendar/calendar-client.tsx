'use client'

import { useState, useCallback, useMemo, useTransition, useRef, useEffect } from 'react'
import {
  Calendar,
  dateFnsLocalizer,
  type View,
  type SlotInfo,
} from 'react-big-calendar'
import withDragAndDrop, {
  type EventInteractionArgs,
} from 'react-big-calendar/lib/addons/dragAndDrop'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus, Search, X, Loader2 } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
} from '@planningo/ui'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  restoreCalendarEvent,
  getEventsInRange,
} from '@/lib/actions/calendar'
import { EventForm, type EventFormData } from './event-form'
import { EventDetail } from './event-detail'
import type { Tables } from '@planningo/database'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const locales = { 'en-US': enUS }
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
})

interface RBCEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  color?: string
  resource?: Tables<'calendar_events'>
}

const DnDCalendar = withDragAndDrop<RBCEvent>(Calendar as never)

interface CalendarClientProps {
  initialEvents: Tables<'calendar_events'>[]
  initialRangeStart: string
  initialRangeEnd: string
  timezone?: string
}

function toRBCEvent(event: Tables<'calendar_events'>): RBCEvent {
  return {
    id: event.id,
    title: event.title,
    start: new Date(event.start_time),
    end: new Date(event.end_time),
    allDay: event.all_day,
    color: event.color,
    resource: event,
  }
}

export function CalendarClient({
  initialEvents,
  initialRangeStart,
  initialRangeEnd,
}: CalendarClientProps) {
  const [events, setEvents] = useState<Tables<'calendar_events'>[]>(initialEvents)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Tables<'calendar_events'> | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date; isAllDay?: boolean } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Tables<'calendar_events'> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()

  // Track loaded ranges so we don't double-fetch
  const loadedRangeRef = useRef<{ start: number; end: number }>({
    start: new Date(initialRangeStart).getTime(),
    end: new Date(initialRangeEnd).getTime(),
  })
  const [lazyLoading, setLazyLoading] = useState(false)

  // ───────────────────────── filtered RBC events ─────────────────────────

  const rbcEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = q
      ? events.filter((e) =>
          [e.title, e.location, e.description]
            .filter(Boolean)
            .some((t) => (t as string).toLowerCase().includes(q))
        )
      : events
    return filtered.map(toRBCEvent)
  }, [events, search])

  // ───────────────────────── lazy fetch on navigate ─────────────────────────

  useEffect(() => {
    // Compute visible range based on view
    const visibleStart = new Date(date)
    const visibleEnd = new Date(date)
    if (view === 'month' || view === 'agenda') {
      visibleStart.setDate(1)
      visibleStart.setMonth(visibleStart.getMonth() - 1)
      visibleEnd.setMonth(visibleEnd.getMonth() + 2)
      visibleEnd.setDate(0)
    } else if (view === 'week') {
      visibleStart.setDate(date.getDate() - 7)
      visibleEnd.setDate(date.getDate() + 14)
    } else {
      visibleStart.setDate(date.getDate() - 1)
      visibleEnd.setDate(date.getDate() + 2)
    }

    const needStart = visibleStart.getTime()
    const needEnd = visibleEnd.getTime()
    const loaded = loadedRangeRef.current

    if (needStart >= loaded.start && needEnd <= loaded.end) return // covered

    const fetchStart = new Date(Math.min(needStart, loaded.start))
    const fetchEnd = new Date(Math.max(needEnd, loaded.end))

    setLazyLoading(true)
    let cancelled = false
    getEventsInRange(fetchStart.toISOString(), fetchEnd.toISOString())
      .then(({ events: fresh }) => {
        if (cancelled) return
        // Merge: dedupe by id, prefer fresh
        setEvents((prev) => {
          const map = new Map<string, Tables<'calendar_events'>>()
          for (const e of prev) map.set(e.id, e)
          for (const e of fresh) map.set(e.id, e)
          return Array.from(map.values())
        })
        loadedRangeRef.current = { start: fetchStart.getTime(), end: fetchEnd.getTime() }
      })
      .finally(() => !cancelled && setLazyLoading(false))

    return () => {
      cancelled = true
    }
  }, [date, view])

  // ───────────────────────── slot / event selection ─────────────────────────

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end,
      isAllDay: slotInfo.action === 'select' && view === 'month',
    })
    setEditingEvent(null)
    setIsFormOpen(true)
  }, [view])

  const handleSelectEvent = useCallback((event: RBCEvent) => {
    if (event.resource) setSelectedEvent(event.resource)
  }, [])

  // ───────────────────────── form submit (create + edit) ─────────────────────────

  async function handleFormSubmit(data: EventFormData) {
    setIsSaving(true)

    if (editingEvent) {
      // Optimistic
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
        // Revert
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
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.event) setEvents((prev) => [...prev, result.event!])
      toast.success('Event created')
      setIsFormOpen(false)
      setSelectedSlot(null)
    }
  }

  // ───────────────────────── delete + undo ─────────────────────────

  async function handleDeleteEvent(id: string) {
    const original = events.find((e) => e.id === id)
    if (!original) return

    // Optimistic remove
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
          if (restored.error) {
            toast.error(restored.error)
            return
          }
          if (restored.event) setEvents((prev) => [...prev, restored.event!])
          toast.success('Event restored')
        },
      },
    })
  }

  // ───────────────────────── drag/drop + resize ─────────────────────────

  function applyEventInteraction({ event, start, end, isAllDay }: EventInteractionArgs<RBCEvent>) {
    if (!event.resource) return
    const original = event.resource
    const startDate = typeof start === 'string' ? new Date(start) : start
    const endDate = typeof end === 'string' ? new Date(end) : end

    const optimistic: Tables<'calendar_events'> = {
      ...original,
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      all_day: isAllDay ?? original.all_day,
      updated_at: new Date().toISOString(),
    }

    setEvents((prev) => prev.map((e) => (e.id === original.id ? optimistic : e)))

    startTransition(async () => {
      const result = await updateCalendarEvent(original.id, {
        start_time: optimistic.start_time,
        end_time: optimistic.end_time,
        all_day: optimistic.all_day,
      })
      if (result.error) {
        setEvents((prev) => prev.map((e) => (e.id === original.id ? original : e)))
        toast.error(result.error)
      }
    })
  }

  // ───────────────────────── render ─────────────────────────

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Calendar</h1>
          {lazyLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full pl-8 pr-8 sm:w-64"
              aria-label="Search events"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
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
            className="gap-2"
            aria-label="New event"
          >
            <Plus className="h-4 w-4" />
            New Event
          </Button>
        </div>
      </div>

      {search && (
        <p className="text-xs text-muted-foreground">
          Showing {rbcEvents.length} match{rbcEvents.length === 1 ? '' : 'es'} for &ldquo;{search}&rdquo;
        </p>
      )}

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card p-2 sm:p-4">
        <div className="min-w-[720px]" style={{ height: 640 }}>
          <DnDCalendar
            localizer={localizer}
            events={rbcEvents}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            onEventDrop={applyEventInteraction}
            onEventResize={applyEventInteraction}
            views={['month', 'week', 'day', 'agenda']}
            selectable
            popup
            resizable
            eventPropGetter={(event: RBCEvent) => ({
              style: {
                backgroundColor: event.color ?? '#3B82F6',
                borderColor: 'transparent',
                color: '#fff',
              },
            })}
            style={{ height: '100%' }}
          />
        </div>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) {
            setSelectedSlot(null)
            setEditingEvent(null)
          }
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
            onCancel={() => {
              setIsFormOpen(false)
              setSelectedSlot(null)
              setEditingEvent(null)
            }}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
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
