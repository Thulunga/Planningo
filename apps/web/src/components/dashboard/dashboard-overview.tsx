'use client'

import Link from 'next/link'
import { format, isToday, isTomorrow } from 'date-fns'
import {
  CheckSquare,
  Calendar,
  Clock3,
  ArrowRight,
  Circle,
  CheckCircle2,
  AlertCircle,
  Plane,
  DollarSign,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
} from '@planningo/ui'
import type { Tables } from '@planningo/database'

interface DashboardOverviewProps {
  profile: Tables<'profiles'>
  todaysTodos: Tables<'todos'>[]
  upcomingEvents: Tables<'calendar_events'>[]
  todaysPlanner: Tables<'planner_entries'>[]
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  medium: { label: 'Medium', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  high: { label: 'High', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

function formatEventTime(startTime: string) {
  const date = new Date(startTime)
  if (isToday(date)) return `Today ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'h:mm a')}`
  return format(date, 'EEE MMM d, h:mm a')
}

export function DashboardOverview({
  profile,
  todaysTodos,
  upcomingEvents,
  todaysPlanner,
}: DashboardOverviewProps) {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = profile.full_name?.split(' ')[0] ?? 'there'

  return (
    <div className="space-y-6">
      {/* Greeting — gradient banner */}
      <div className="rounded-xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
        <h1 className="text-2xl font-bold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {format(new Date(), 'EEEE, MMMM d')} &middot; Here&apos;s what&apos;s on your plate today.
        </p>
      </div>

      <div className="grid gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Today's Todos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckSquare className="h-4 w-4 text-primary" />
              Open Todos
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
              <Link href="/todos">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todaysTodos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500/50" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {todaysTodos.map((todo) => (
                  <li key={todo.id} className="flex items-start gap-2">
                    <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{todo.title}</p>
                      {todo.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Due {format(new Date(todo.due_date), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${
                        priorityConfig[todo.priority].color
                      }`}
                    >
                      {priorityConfig[todo.priority].label}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-primary" />
              Upcoming Events
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
              <Link href="/calendar">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Calendar className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {upcomingEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-2">
                    <div
                      className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: event.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatEventTime(event.start_time)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Today's Planner */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock3 className="h-4 w-4 text-primary" />
              Today&apos;s Schedule
            </CardTitle>
            <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
              <Link href="/planner">
                Plan <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todaysPlanner.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Clock3 className="mb-2 h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Nothing planned yet</p>
                <Button variant="ghost" size="sm" asChild className="mt-2 text-xs">
                  <Link href="/planner">Plan your day</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {todaysPlanner.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-2">
                    <div
                      className="h-6 w-1 shrink-0 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{entry.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.start_time} – {entry.end_time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href="/todos">
              <CheckSquare className="mr-2 h-3.5 w-3.5" />
              Add Todo
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/calendar">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              New Event
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/planner">
              <Clock3 className="mr-2 h-3.5 w-3.5" />
              Plan Today
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/trips">
              <Plane className="mr-2 h-3.5 w-3.5" />
              Plan a Trip
            </Link>
          </Button>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/expenses">
              <DollarSign className="mr-2 h-3.5 w-3.5" />
              Track Expense
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
