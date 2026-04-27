'use client'

import { format } from 'date-fns'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Button, Input, Label, Switch, Textarea, cn } from '@planningo/ui'
import { useState } from 'react'
import type { Tables } from '@planningo/database'

const EVENT_COLORS = [
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#06B6D4', // cyan
  '#6B7280', // gray
]

export interface EventFormData {
  title: string
  description?: string
  location?: string
  start_time: string
  end_time: string
  all_day: boolean
  color: string
}

interface EventFormProps {
  defaultStart?: Date
  defaultEnd?: Date
  initial?: Tables<'calendar_events'>
  onSubmit: (data: EventFormData) => void
  onCancel: () => void
  isSaving?: boolean
  submitLabel?: string
}

function toDatetimeLocal(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

function toDateInput(date: Date) {
  return format(date, 'yyyy-MM-dd')
}

/**
 * For all-day events we encode the start as 00:00 local and end as the
 * NEXT day's 00:00 local (exclusive end). This keeps Google/iCal-style
 * all-day semantics and avoids the off-by-one timezone bug.
 */
function buildAllDayBoundaries(startDate: string, endDate: string) {
  // Both inputs are yyyy-MM-dd. Build local-midnight ISO strings.
  const start = new Date(`${startDate}T00:00:00`)
  // End date is INCLUSIVE in the UI; we store exclusive end (next day 00:00).
  const endExclusive = new Date(`${endDate}T00:00:00`)
  endExclusive.setDate(endExclusive.getDate() + 1)
  return {
    start_time: start.toISOString(),
    end_time: endExclusive.toISOString(),
  }
}

export function EventForm({
  defaultStart,
  defaultEnd,
  initial,
  onSubmit,
  onCancel,
  isSaving,
  submitLabel,
}: EventFormProps) {
  const initialStart = initial ? new Date(initial.start_time) : (defaultStart ?? new Date())
  const initialEnd = initial
    ? new Date(initial.end_time)
    : (defaultEnd ?? new Date(initialStart.getTime() + 60 * 60 * 1000))

  // For all-day events stored as exclusive end, convert to inclusive end date for the picker
  const initialAllDay = initial?.all_day ?? false
  const inclusiveEndDate = initialAllDay
    ? (() => {
        const d = new Date(initialEnd)
        d.setDate(d.getDate() - 1)
        return d
      })()
    : initialEnd

  const [data, setData] = useState({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    location: initial?.location ?? '',
    start_time: toDatetimeLocal(initialStart),
    end_time: toDatetimeLocal(initialEnd),
    start_date: toDateInput(initialStart),
    end_date: toDateInput(inclusiveEndDate),
    all_day: initialAllDay,
    color: initial?.color ?? '#3B82F6',
  })
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const title = data.title.trim()
    if (!title) {
      setError('Title is required')
      return
    }

    let payload: EventFormData
    if (data.all_day) {
      if (data.start_date > data.end_date) {
        setError('End date must be on or after start date')
        return
      }
      const { start_time, end_time } = buildAllDayBoundaries(data.start_date, data.end_date)
      payload = {
        title,
        description: data.description || undefined,
        location: data.location || undefined,
        start_time,
        end_time,
        all_day: true,
        color: data.color,
      }
    } else {
      if (new Date(data.start_time) >= new Date(data.end_time)) {
        setError('End must be after start')
        return
      }
      payload = {
        title,
        description: data.description || undefined,
        location: data.location || undefined,
        start_time: new Date(data.start_time).toISOString(),
        end_time: new Date(data.end_time).toISOString(),
        all_day: false,
        color: data.color,
      }
    }

    setError(null)
    onSubmit(payload)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="evt-title">Title *</Label>
        <Input
          id="evt-title"
          placeholder="Event title"
          value={data.title}
          onChange={(e) => setData((p) => ({ ...p, title: e.target.value }))}
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="evt-desc">Description</Label>
        <Textarea
          id="evt-desc"
          placeholder="Optional description"
          rows={2}
          value={data.description}
          onChange={(e) => setData((p) => ({ ...p, description: e.target.value }))}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="evt-loc">Location</Label>
        <Input
          id="evt-loc"
          placeholder="Where?"
          value={data.location}
          onChange={(e) => setData((p) => ({ ...p, location: e.target.value }))}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="all-day"
          checked={data.all_day}
          onCheckedChange={(v) => setData((p) => ({ ...p, all_day: v }))}
        />
        <Label htmlFor="all-day">All day</Label>
      </div>

      {!data.all_day ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="evt-start">Start</Label>
            <Input
              id="evt-start"
              type="datetime-local"
              value={data.start_time}
              onChange={(e) => setData((p) => ({ ...p, start_time: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evt-end">End</Label>
            <Input
              id="evt-end"
              type="datetime-local"
              value={data.end_time}
              onChange={(e) => setData((p) => ({ ...p, end_time: e.target.value }))}
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="evt-start-date">Start Date</Label>
            <Input
              id="evt-start-date"
              type="date"
              value={data.start_date}
              onChange={(e) => setData((p) => ({ ...p, start_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evt-end-date">End Date</Label>
            <Input
              id="evt-end-date"
              type="date"
              value={data.end_date}
              onChange={(e) => setData((p) => ({ ...p, end_date: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Color picker */}
      <div className="space-y-1.5">
        <Label>Color</Label>
        <div className="flex gap-2">
          {EVENT_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              aria-label={`Color ${color}`}
              className={cn(
                'h-7 w-7 rounded-full transition-transform hover:scale-110',
                data.color === color &&
                  'ring-2 ring-white ring-offset-1 ring-offset-background scale-110'
              )}
              style={{ backgroundColor: color }}
              onClick={() => setData((p) => ({ ...p, color }))}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !data.title.trim()}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel ?? (initial ? 'Save Changes' : 'Create Event')}
        </Button>
      </div>
    </form>
  )
}
