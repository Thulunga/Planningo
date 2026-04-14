'use client'

import { format, isPast } from 'date-fns'
import { Bell, Calendar, CheckSquare, Clock, AlertTriangle } from 'lucide-react'
import { Badge, Card, CardContent } from '@planningo/ui'

interface ReminderWithRelations {
  id: string
  remind_at: string
  channel: string
  status: string
  message: string | null
  calendar_events?: { id: string; title: string; start_time: string } | null
  todos?: { id: string; title: string } | null
}

interface RemindersClientProps {
  reminders: ReminderWithRelations[]
}

export function RemindersClient({ reminders }: RemindersClientProps) {
  const upcoming = reminders.filter((r) => !isPast(new Date(r.remind_at)))
  const past = reminders.filter((r) => isPast(new Date(r.remind_at)))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reminders</h1>
        <p className="text-sm text-muted-foreground">
          {upcoming.length} upcoming · {past.length} past
        </p>
      </div>

      {reminders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="mb-3 h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground">No reminders yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add reminders when creating calendar events or todos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Upcoming
              </h2>
              <div className="space-y-2">
                {upcoming.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Past
              </h2>
              <div className="space-y-2 opacity-60">
                {past.map((reminder) => (
                  <ReminderCard key={reminder.id} reminder={reminder} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ReminderCard({ reminder }: { reminder: ReminderWithRelations }) {
  const label = reminder.calendar_events?.title ?? reminder.todos?.title ?? 'Reminder'
  const Icon = reminder.calendar_events ? Calendar : CheckSquare

  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{label}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(reminder.remind_at), 'MMM d, yyyy h:mm a')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={reminder.status === 'pending' ? 'default' : 'secondary'}
            className="capitalize text-xs"
          >
            {reminder.status}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">{reminder.channel}</span>
        </div>
      </CardContent>
    </Card>
  )
}
