'use client'

import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { Button, Input, Label, Switch, Textarea } from '@planningo/ui'
import { useState } from 'react'

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

interface EventFormProps {
  defaultStart?: Date
  defaultEnd?: Date
  onSubmit: (data: {
    title: string
    description?: string
    location?: string
    start_time: string
    end_time: string
    all_day: boolean
    color: string
  }) => void
  onCancel: () => void
  isSaving?: boolean
}

function toDatetimeLocal(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm")
}

export function EventForm({
  defaultStart,
  defaultEnd,
  onSubmit,
  onCancel,
  isSaving,
}: EventFormProps) {
  const now = defaultStart ?? new Date()
  const end = defaultEnd ?? new Date(now.getTime() + 60 * 60 * 1000)

  const [data, setData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: toDatetimeLocal(now),
    end_time: toDatetimeLocal(end),
    all_day: false,
    color: '#3B82F6',
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!data.title.trim()) return
    onSubmit({
      ...data,
      title: data.title.trim(),
      description: data.description || undefined,
      location: data.location || undefined,
    })
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

      {!data.all_day && (
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
      )}

      {data.all_day && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="evt-start-date">Start Date</Label>
            <Input
              id="evt-start-date"
              type="date"
              value={data.start_time.split('T')[0]}
              onChange={(e) =>
                setData((p) => ({ ...p, start_time: `${e.target.value}T00:00` }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="evt-end-date">End Date</Label>
            <Input
              id="evt-end-date"
              type="date"
              value={data.end_time.split('T')[0]}
              onChange={(e) =>
                setData((p) => ({ ...p, end_time: `${e.target.value}T23:59` }))
              }
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
              className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                data.color === color ? 'ring-2 ring-white ring-offset-1 ring-offset-background scale-110' : ''
              }`}
              style={{ backgroundColor: color }}
              onClick={() => setData((p) => ({ ...p, color }))}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving || !data.title.trim()}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Event
        </Button>
      </div>
    </form>
  )
}
