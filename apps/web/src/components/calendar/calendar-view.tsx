'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import {
  format,
  addDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
  isToday,
  eachDayOfInterval,
  isBefore,
  isAfter,
} from 'date-fns'
import { ChevronLeft, ChevronRight, LayoutGrid, List, Columns3, CalendarDays } from 'lucide-react'
import { Button, cn } from '@planningo/ui'

// ─── public types ─────────────────────────────────────────

export interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay?: boolean
  color?: string
  location?: string | null
}

export type CalViewType = 'month' | 'week' | 'agenda'

interface CalendarViewProps {
  events: CalEvent[]
  view: CalViewType
  date: Date
  onNavigate: (date: Date) => void
  onViewChange: (view: CalViewType) => void
  /** Called when user clicks an empty slot; create event for this time. */
  onSlotClick: (start: Date, end: Date, allDay?: boolean) => void
  /** Called when user clicks an existing event. */
  onEventClick: (eventId: string) => void
}

// ─── helpers ──────────────────────────────────────────────

function getMonthDays(date: Date): Date[] {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 0 })
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 0 })
  return eachDayOfInterval({ start, end })
}

function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 0 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/**
 * Returns events that fall on `day`.
 * All-day events use exclusive end (stored as next-day midnight), so we subtract 1ms.
 * Timed events are matched by start date only.
 */
function getEventsForDay(events: CalEvent[], day: Date): CalEvent[] {
  const dayStr = format(day, 'yyyy-MM-dd')
  return events
    .filter((e) => {
      if (e.allDay) {
        const s = format(e.start, 'yyyy-MM-dd')
        const inclusiveEnd = new Date(e.end.getTime() - 1)
        const en = format(inclusiveEnd, 'yyyy-MM-dd')
        return dayStr >= s && dayStr <= en
      }
      return format(e.start, 'yyyy-MM-dd') === dayStr
    })
    .sort((a, b) => {
      // All-day events first
      if (a.allDay && !b.allDay) return -1
      if (!a.allDay && b.allDay) return 1
      return a.start.getTime() - b.start.getTime()
    })
}

const HOUR_H = 56 // px per hour in week view
const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEK_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── EventPill ────────────────────────────────────────────

function EventPill({
  event,
  onClick,
  compact = false,
}: {
  event: CalEvent
  onClick: (e: React.MouseEvent) => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(e) }}
      className={cn(
        'w-full overflow-hidden rounded text-left text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-white',
        compact ? 'px-1 py-0.5 text-[11px] leading-tight' : 'px-1.5 py-0.5 text-[11px] leading-snug',
      )}
      style={{ backgroundColor: event.color ?? '#3B82F6' }}
    >
      <span className="block truncate font-medium">
        {!event.allDay && !compact && (
          <span className="mr-1 font-normal opacity-75">{format(event.start, 'h:mm')}</span>
        )}
        {event.title}
      </span>
    </button>
  )
}

// ─── MonthView ────────────────────────────────────────────

const MAX_PILLS = 3

function MonthView({
  events,
  date,
  onSlotClick,
  onEventClick,
}: {
  events: CalEvent[]
  date: Date
  onSlotClick: (start: Date, end: Date, allDay?: boolean) => void
  onEventClick: (id: string) => void
}) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const days = useMemo(() => getMonthDays(date), [date])

  // Clear selection when month changes
  useEffect(() => { setSelectedDay(null) }, [date])

  const selectedDayEvents = useMemo(
    () => (selectedDay ? getEventsForDay(events, selectedDay) : []),
    [events, selectedDay],
  )

  function handleDayClick(day: Date, dayEvents: CalEvent[]) {
    if (dayEvents.length === 0) {
      // No events → immediately open create dialog
      onSlotClick(day, addDays(day, 1), true)
    } else {
      // Has events → toggle the mobile detail panel
      setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day)
    }
  }

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 border-b border-border/60">
        {WEEK_LABELS.map((d) => (
          <div key={d} className="py-2 text-center">
            <span className="hidden text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
              {d}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:hidden">
              {d[0]}
            </span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(events, day)
          const isCurrentMonth = isSameMonth(day, date)
          const isTodayDay = isToday(day)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const visible = dayEvents.slice(0, MAX_PILLS)
          const overflow = dayEvents.length - MAX_PILLS

          return (
            <div
              key={idx}
              role="gridcell"
              tabIndex={0}
              aria-label={format(day, 'EEEE MMMM d')}
              onClick={() => handleDayClick(day, dayEvents)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleDayClick(day, dayEvents)
                }
              }}
              className={cn(
                'relative min-h-[72px] cursor-pointer border-b border-r border-border/40 p-1 transition-colors focus:outline-none sm:min-h-[96px]',
                !isCurrentMonth && 'bg-muted/20',
                isTodayDay && !isSelected && 'bg-primary/5',
                isSelected && 'bg-primary/10 ring-inset ring-1 ring-primary/40',
                'hover:bg-accent/30',
              )}
            >
              {/* Date number */}
              <div className="flex justify-end">
                <span
                  className={cn(
                    'mb-0.5 flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isTodayDay
                      ? 'bg-primary font-bold text-primary-foreground'
                      : isCurrentMonth
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground/40',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>

              {/* Desktop: event pills */}
              <div className="hidden flex-col gap-0.5 sm:flex">
                {visible.map((e) => (
                  <EventPill
                    key={e.id}
                    event={e}
                    compact
                    onClick={() => onEventClick(e.id)}
                  />
                ))}
                {overflow > 0 && (
                  <span className="cursor-pointer px-1 text-[10px] text-muted-foreground hover:text-foreground">
                    +{overflow} more
                  </span>
                )}
              </div>

              {/* Mobile: colored dots only */}
              <div className="flex flex-wrap gap-0.5 sm:hidden">
                {visible.map((e) => (
                  <div
                    key={e.id}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: e.color ?? '#3B82F6' }}
                  />
                ))}
                {overflow > 0 && (
                  <span className="text-[9px] leading-none text-muted-foreground">
                    +{overflow}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: selected day detail panel */}
      {selectedDay && (
        <div className="border-t border-border/60 sm:hidden">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="text-sm font-semibold">
              {format(selectedDay, 'EEEE, MMMM d')}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs text-primary"
              onClick={() => onSlotClick(selectedDay, addDays(selectedDay, 1), true)}
              aria-label="Add event"
            >
              + Add event
            </Button>
          </div>
          {selectedDayEvents.length === 0 ? (
            <p className="px-3 pb-3 text-xs text-muted-foreground">
              No events — tap &quot;+ Add event&quot; to create one.
            </p>
          ) : (
            <ul className="space-y-1.5 px-3 pb-3">
              {selectedDayEvents.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => onEventClick(e.id)}
                    className="flex w-full items-center gap-2.5 rounded-lg border border-border/50 bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent"
                    aria-label={`View ${e.title}`}
                  >
                    <div
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: e.color ?? '#3B82F6' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.allDay
                          ? 'All day'
                          : `${format(e.start, 'h:mm a')} – ${format(e.end, 'h:mm a')}`}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ─── WeekView ─────────────────────────────────────────────

function WeekView({
  events,
  date,
  onSlotClick,
  onEventClick,
}: {
  events: CalEvent[]
  date: Date
  onSlotClick: (start: Date, end: Date) => void
  onEventClick: (id: string) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const weekDays = useMemo(() => getWeekDays(date), [date])

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current) return
    const now = new Date()
    scrollRef.current.scrollTop = Math.max(0, (now.getHours() - 1) * HOUR_H)
  }, [])

  const allDayRows = useMemo(
    () => weekDays.map((day) => getEventsForDay(events, day).filter((e) => e.allDay)),
    [events, weekDays],
  )
  const hasAllDay = allDayRows.some((r) => r.length > 0)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        {/* Day headers */}
        <div
          className="grid border-b border-border/60"
          style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
        >
          <div className="border-r border-border/40" />
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={cn(
                'border-r border-border/40 py-2 text-center last:border-r-0',
                isToday(day) && 'bg-primary/5',
              )}
            >
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">
                {format(day, 'EEE')}
              </p>
              <span
                className={cn(
                  'mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium',
                  isToday(day)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>

        {/* All-day row */}
        {hasAllDay && (
          <div
            className="grid border-b border-border/60"
            style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
          >
            <div className="flex items-center justify-end border-r border-border/40 px-1.5">
              <span className="text-[9px] uppercase text-muted-foreground">all‑day</span>
            </div>
            {allDayRows.map((dayEvts, i) => (
              <div
                key={i}
                className="flex min-h-[24px] flex-col gap-0.5 border-r border-border/40 p-0.5 last:border-r-0"
              >
                {dayEvts.map((e) => (
                  <EventPill key={e.id} event={e} compact onClick={() => onEventClick(e.id)} />
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Scrollable time grid */}
        <div ref={scrollRef} className="relative overflow-y-auto" style={{ maxHeight: 528 }}>
          <div
            className="grid"
            style={{
              gridTemplateColumns: '52px repeat(7, 1fr)',
              height: `${24 * HOUR_H}px`,
            }}
          >
            {/* Time gutter */}
            <div className="relative border-r border-border/40">
              {HOURS.map((h) => (
                <div
                  key={h}
                  className="absolute inset-x-0 flex items-start justify-end pr-2"
                  style={{ top: h * HOUR_H, height: HOUR_H }}
                >
                  {h > 0 && (
                    <span className="mt-[-0.5em] text-[10px] text-muted-foreground">
                      {h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, colIdx) => {
              const dayEvents = getEventsForDay(events, day).filter((e) => !e.allDay)
              return (
                <div
                  key={colIdx}
                  className={cn(
                    'relative border-r border-border/40 last:border-r-0',
                    isToday(day) && 'bg-primary/5',
                  )}
                >
                  {/* Hour slot click targets */}
                  {HOURS.map((h) => (
                    <button
                      key={h}
                      type="button"
                      aria-label={`Add event at ${h}:00 on ${format(day, 'EEE d')}`}
                      className="absolute inset-x-0 border-t border-border/30 hover:bg-accent/30 focus:outline-none"
                      style={{ top: h * HOUR_H, height: HOUR_H }}
                      onClick={() => {
                        const start = new Date(day)
                        start.setHours(h, 0, 0, 0)
                        const end = new Date(start.getTime() + 60 * 60 * 1000)
                        onSlotClick(start, end)
                      }}
                    />
                  ))}

                  {/* Events */}
                  {dayEvents.map((e) => {
                    const startMin = e.start.getHours() * 60 + e.start.getMinutes()
                    const endMin = e.end.getHours() * 60 + e.end.getMinutes()
                    const top = (startMin / 60) * HOUR_H
                    const height = Math.max(((endMin - startMin) / 60) * HOUR_H, 24)
                    return (
                      <button
                        key={e.id}
                        type="button"
                        aria-label={`${e.title}`}
                        onClick={() => onEventClick(e.id)}
                        className="absolute inset-x-0.5 z-10 overflow-hidden rounded text-left text-white transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                        style={{ top, height, backgroundColor: e.color ?? '#3B82F6' }}
                      >
                        <div className="truncate px-1.5 py-0.5 text-[11px] font-semibold leading-tight">
                          {e.title}
                        </div>
                        {height > 38 && (
                          <div className="px-1.5 text-[10px] opacity-80">
                            {format(e.start, 'h:mm a')}
                          </div>
                        )}
                      </button>
                    )
                  })}

                  {/* Current-time indicator */}
                  {isToday(day) && (() => {
                    const now = new Date()
                    const top = ((now.getHours() * 60 + now.getMinutes()) / 60) * HOUR_H
                    return (
                      <div
                        className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                        style={{ top }}
                      >
                        <div className="h-2 w-2 rounded-full bg-red-500 ring-2 ring-red-500/25" />
                        <div className="h-px flex-1 bg-red-500" />
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AgendaView ───────────────────────────────────────────

function AgendaView({
  events,
  date,
  onEventClick,
}: {
  events: CalEvent[]
  date: Date
  onEventClick: (id: string) => void
}) {
  const windowStart = startOfMonth(date)
  const windowEnd = addDays(endOfMonth(date), 60)

  const grouped = useMemo(() => {
    const inRange = events
      .filter((e) => !isBefore(e.start, windowStart) && !isAfter(e.start, windowEnd))
      .sort((a, b) => a.start.getTime() - b.start.getTime())

    const map = new Map<string, CalEvent[]>()
    for (const e of inRange) {
      const key = format(e.start, 'yyyy-MM-dd')
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return Array.from(map.entries())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, date])

  if (grouped.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
        <CalendarDays className="mb-3 h-10 w-10 opacity-30" />
        <p className="text-sm font-medium">No events in this period</p>
        <p className="mt-1 text-xs">Use &quot;New Event&quot; to add one.</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-border/50">
      {grouped.map(([dateKey, dayEvents]) => {
        // Use noon to avoid any DST edge cases
        const dayDate = new Date(`${dateKey}T12:00:00`)
        const todayHighlight = isToday(dayDate)
        return (
          <div key={dateKey} className="flex">
            {/* Date column */}
            <div className="w-16 shrink-0 py-3 pr-3 text-right sm:w-20 sm:pr-4">
              <p
                className={cn(
                  'text-[10px] font-semibold uppercase',
                  todayHighlight ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {format(dayDate, 'EEE')}
              </p>
              <p
                className={cn(
                  'text-2xl font-semibold leading-none',
                  todayHighlight ? 'text-primary' : 'text-foreground',
                )}
              >
                {format(dayDate, 'd')}
              </p>
              <p className="text-[10px] text-muted-foreground">{format(dayDate, 'MMM')}</p>
            </div>

            {/* Events column */}
            <div className="flex-1 space-y-1.5 py-3 pr-3">
              {dayEvents.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onEventClick(e.id)}
                  aria-label={`Event: ${e.title}`}
                  className="flex w-full items-stretch gap-0 rounded-xl border border-border/50 bg-card text-left transition-colors hover:bg-accent focus:outline-none focus-visible:ring-1 focus-visible:ring-ring overflow-hidden"
                >
                  {/* Color stripe */}
                  <div
                    className="w-1 shrink-0"
                    style={{ backgroundColor: e.color ?? '#3B82F6' }}
                  />
                  <div className="flex-1 px-3 py-2.5">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {e.allDay
                        ? 'All day'
                        : `${format(e.start, 'h:mm a')} – ${format(e.end, 'h:mm a')}`}
                    </p>
                    {e.location && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground/70">
                        {e.location}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── CalendarView (main) ──────────────────────────────────

export function CalendarView({
  events,
  view,
  date,
  onNavigate,
  onViewChange,
  onSlotClick,
  onEventClick,
}: CalendarViewProps) {
  function navigate(dir: 'prev' | 'next') {
    if (view === 'month' || view === 'agenda') {
      onNavigate(dir === 'prev' ? subMonths(date, 1) : addMonths(date, 1))
    } else {
      onNavigate(dir === 'prev' ? subWeeks(date, 1) : addWeeks(date, 1))
    }
  }

  function getTitle() {
    if (view === 'agenda' || view === 'month') return format(date, 'MMMM yyyy')
    const start = startOfWeek(date, { weekStartsOn: 0 })
    const end = endOfWeek(date, { weekStartsOn: 0 })
    if (isSameMonth(start, end)) return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
  }

  const views: { value: CalViewType; label: string; Icon: React.ElementType }[] = [
    { value: 'month', label: 'Month', Icon: LayoutGrid },
    { value: 'week', label: 'Week', Icon: Columns3 },
    { value: 'agenda', label: 'List', Icon: List },
  ]

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Navigation header */}
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2.5 sm:px-4">
        {/* Prev / Today / Next */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('prev')}
            aria-label="Previous"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs font-semibold"
            onClick={() => onNavigate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('next')}
            aria-label="Next"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Title */}
        <h2 className="flex-1 text-center text-sm font-semibold sm:text-base">
          {getTitle()}
        </h2>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border/80 p-0.5">
          {views.map(({ value, label, Icon }) => (
            <Button
              key={value}
              variant={view === value ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'h-7 gap-1.5 px-2 text-xs',
                // Week view is complex on very small screens — keep it for sm+
                value === 'week' && 'hidden sm:inline-flex',
              )}
              onClick={() => onViewChange(value)}
              aria-label={label}
              aria-pressed={view === value}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* View body */}
      {view === 'month' && (
        <MonthView
          events={events}
          date={date}
          onSlotClick={onSlotClick}
          onEventClick={onEventClick}
        />
      )}
      {view === 'week' && (
        <WeekView
          events={events}
          date={date}
          onSlotClick={onSlotClick}
          onEventClick={onEventClick}
        />
      )}
      {view === 'agenda' && (
        <AgendaView events={events} date={date} onEventClick={onEventClick} />
      )}
    </div>
  )
}
