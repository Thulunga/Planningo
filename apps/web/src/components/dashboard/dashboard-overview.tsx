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
  Plane,
  DollarSign,
  Bell,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@planningo/ui'
import type { Tables } from '@planningo/database'
import { AnalogClock } from '@/components/clock/analog-clock'
import { FeedbackCta } from '@/components/feedback/feedback-cta'

interface DashboardOverviewProps {
  profile: Tables<'profiles'>
  todaysTodos: Tables<'todos'>[]
  upcomingEvents: Tables<'calendar_events'>[]
  todaysPlanner: Tables<'planner_entries'>[]
}

const priorityConfig = {
  low: { label: 'Low', color: 'bg-slate-500/20 text-slate-400 border-slate-500/30' },
  medium: { label: 'Med', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  high: { label: 'High', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  urgent: { label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

function formatEventTime(startTime: string) {
  const date = new Date(startTime)
  if (isToday(date)) return `Today ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow ${format(date, 'h:mm a')}`
  return format(date, 'EEE MMM d, h:mm a')
}

const quickActions = [
  { href: '/todos', icon: CheckSquare, label: 'Add Todo' },
  { href: '/calendar', icon: Calendar, label: 'New Event' },
  { href: '/planner', icon: Clock3, label: 'Plan Today' },
  { href: '/reminders', icon: Bell, label: 'Reminder' },
  { href: '/trips', icon: Plane, label: 'Plan Trip' },
  { href: '/expenses', icon: DollarSign, label: 'Expense' },
]

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
    <div className="space-y-4 md:space-y-6">
      {/* Greeting hero */}
      <div className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        {/* Clock - centered on mobile, shrink-0 on desktop */}
        <div className="flex justify-center sm:justify-start sm:shrink-0">
          <AnalogClock timezone={profile.timezone ?? undefined} size={110} />
        </div>

        <div className="hidden sm:block w-px self-stretch bg-border/50" />
        <div className="block sm:hidden h-px w-full bg-border/50" />

        <div className="text-center sm:text-left">
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d')} &middot; Here&apos;s what&apos;s on your plate today.
          </p>
        </div>
      </div>

      {/* Stats strip - mobile-friendly horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto pb-1 sm:overflow-visible">
        {[
          {
            label: 'Open Todos',
            value: todaysTodos.length,
            icon: CheckSquare,
            color: 'text-blue-400',
            href: '/todos',
          },
          {
            label: 'Events',
            value: upcomingEvents.length,
            icon: Calendar,
            color: 'text-violet-400',
            href: '/calendar',
          },
          {
            label: "Today's Blocks",
            value: todaysPlanner.length,
            icon: Clock3,
            color: 'text-emerald-400',
            href: '/planner',
          },
        ].map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="flex min-w-[130px] flex-1 items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-card/80 sm:min-w-0"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold leading-none">{value}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Main cards - single col on mobile, 2-col on md, 3-col on xl */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* Todos card */}
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

        {/* Events card */}
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

        {/* Planner card */}
        <Card className="md:col-span-2 xl:col-span-1">
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
                        {entry.start_time}-{entry.end_time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions - scrollable chip row on mobile */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Actions
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {quickActions.map(({ href, icon: Icon, label }) => (
            <Button
              key={href}
              variant="secondary"
              size="sm"
              asChild
              className="shrink-0 gap-1.5"
            >
              <Link href={href}>
                <Icon className="h-3.5 w-3.5" />
                <span className="whitespace-nowrap">{label}</span>
              </Link>
            </Button>
          ))}
        </div>
      </div>

      <FeedbackCta
        heading="How is your Dashboard experience?"
        description="Share what is working, report dashboard issues, or request improvements to your home view."
      />
    </div>
  )
}
