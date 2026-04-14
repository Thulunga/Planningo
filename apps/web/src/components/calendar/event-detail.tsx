'use client'

import { format } from 'date-fns'
import { Calendar, MapPin, AlignLeft, Trash2, X } from 'lucide-react'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from '@planningo/ui'
import type { Tables } from '@planningo/database'

interface EventDetailProps {
  event: Tables<'calendar_events'>
  onClose: () => void
  onDelete: (id: string) => void
}

export function EventDetail({ event, onClose, onDelete }: EventDetailProps) {
  const start = new Date(event.start_time)
  const end = new Date(event.end_time)

  const timeDisplay = event.all_day
    ? `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`
    : `${format(start, 'MMM d, yyyy h:mm a')} – ${format(end, 'h:mm a')}`

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: event.color }}
            />
            <DialogTitle className="text-base">{event.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{timeDisplay}</span>
          </div>

          {event.location && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{event.location}</span>
            </div>
          )}

          {event.description && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <AlignLeft className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="leading-relaxed">{event.description}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => onDelete(event.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
