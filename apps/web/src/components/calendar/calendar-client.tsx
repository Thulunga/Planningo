'use client'

import { useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, type View, type SlotInfo } from 'react-big-calendar'
import { format, parse, startOfWeek, getDay } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@planningo/ui'
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from '@/lib/actions/calendar'
import { EventForm } from './event-form'
import { EventDetail } from './event-detail'
import type { Tables } from '@planningo/database'
import 'react-big-calendar/lib/css/react-big-calendar.css'

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

interface CalendarClientProps {
  initialEvents: Tables<'calendar_events'>[]
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

export function CalendarClient({ initialEvents }: CalendarClientProps) {
  const [events, setEvents] = useState<Tables<'calendar_events'>[]>(initialEvents)
  const [view, setView] = useState<View>('month')
  const [date, setDate] = useState(new Date())
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Tables<'calendar_events'> | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const rbcEvents = events.map(toRBCEvent)

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot({ start: slotInfo.start, end: slotInfo.end })
    setIsCreateOpen(true)
  }, [])

  const handleSelectEvent = useCallback((event: RBCEvent) => {
    if (event.resource) {
      setSelectedEvent(event.resource)
    }
  }, [])

  async function handleCreateEvent(data: {
    title: string
    description?: string
    location?: string
    start_time: string
    end_time: string
    all_day: boolean
    color: string
  }) {
    setIsSaving(true)
    const result = await createCalendarEvent(data)
    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
    } else if (result.event) {
      setEvents((prev) => [...prev, result.event!])
      setIsCreateOpen(false)
      setSelectedSlot(null)
      toast.success('Event created')
    }
  }

  async function handleDeleteEvent(id: string) {
    const result = await deleteCalendarEvent(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setEvents((prev) => prev.filter((e) => e.id !== id))
      setSelectedEvent(null)
      toast.success('Event deleted')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full gap-2 sm:w-auto">
          <Plus className="h-4 w-4" />
          New Event
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="min-w-[720px]" style={{ height: 640 }}>
          <Calendar
            localizer={localizer}
            events={rbcEvents}
            view={view}
            date={date}
            onView={setView}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            popup
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

      {/* Create Event Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open)
        if (!open) setSelectedSlot(null)
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Event</DialogTitle>
          </DialogHeader>
          <EventForm
            defaultStart={selectedSlot?.start}
            defaultEnd={selectedSlot?.end}
            onSubmit={handleCreateEvent}
            onCancel={() => { setIsCreateOpen(false); setSelectedSlot(null) }}
            isSaving={isSaving}
          />
        </DialogContent>
      </Dialog>

      {/* Event Detail Dialog */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onDelete={handleDeleteEvent}
        />
      )}
    </div>
  )
}
