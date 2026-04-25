import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarDays,
  CheckSquare,
  Clock3,
  Bell,
  Plane,
  DollarSign,
  Calendar,
  ArrowRight,
  Globe,
  Smartphone,
  Monitor,
  ShieldCheck,
  Zap,
  Users,
  X,
  Check,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Planningo — Your life, organized from anywhere',
  description:
    'Replace scattered spreadsheets with one smart platform. Todos, calendar, day planner, reminders, trips, and expenses — all in your pocket.',
}

const features = [
  {
    icon: CheckSquare,
    label: 'Todos',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    desc: 'Prioritized tasks with due dates, tags, and statuses. Never drop the ball again.',
  },
  {
    icon: Calendar,
    label: 'Calendar',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    desc: 'Visual monthly/weekly view with color-coded events synced to your schedule.',
  },
  {
    icon: Clock3,
    label: 'Day Planner',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    desc: 'Time-block your day like a pro. Drag-and-drop blocks with color coding.',
  },
  {
    icon: Bell,
    label: 'Reminders',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    desc: 'Push notifications so important moments never slip through the cracks.',
  },
  {
    icon: Plane,
    label: 'Trip Planner',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    desc: 'Plan multi-day itineraries with stops, notes, and budgets — all in one place.',
  },
  {
    icon: DollarSign,
    label: 'Expenses & Budget',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    desc: 'Split group expenses, track personal budgets, and keep finances stress-free.',
  },
]

const compareRows = [
  { label: 'Access from any device', excel: false, planningo: true },
  { label: 'Real-time sync across devices', excel: false, planningo: true },
  { label: 'Shared group expenses', excel: false, planningo: true },
  { label: 'Push reminders & notifications', excel: false, planningo: true },
  { label: 'Trip itinerary builder', excel: false, planningo: true },
  { label: 'Time-blocking day planner', excel: false, planningo: true },
  { label: 'Manual data entry everywhere', excel: true, planningo: false },
  { label: 'Version conflicts & email chains', excel: true, planningo: false },
]

const devices = [
  { icon: Smartphone, label: 'Mobile' },
  { icon: Monitor, label: 'Desktop' },
  { icon: Globe, label: 'Any Browser' },
]

const whyItems = [
  {
    icon: Globe,
    title: 'Manage from anywhere',
    desc: 'Your data lives in the cloud. Open Planningo on your phone, tablet, or laptop — always up to date, always in sync.',
  },
  {
    icon: Zap,
    title: 'Everything in one place',
    desc: 'Stop juggling 6 different apps. Todos, calendar, planner, reminders, trips, and expenses under one roof.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & secure',
    desc: 'Powered by Supabase — enterprise-grade auth and row-level security. Your data is yours alone.',
  },
  {
    icon: Users,
    title: 'Built for real life',
    desc: 'Share trip costs with friends, plan family events, or just stay on top of your own busy schedule.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">Planningo</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Get Started
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pt-32">
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[500px] opacity-20"
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 50% -10%, hsl(var(--primary)) 0%, transparent 70%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Zap className="h-3 w-3" />
            All-in-one productivity — no spreadsheets needed
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Your life, organized.
            <br />
            <span className="bg-gradient-to-r from-primary to-violet-400 bg-clip-text text-transparent">
              From anywhere.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
            Ditch the Excel chaos. Planningo keeps your todos, calendar, day
            planner, reminders, trips, and expenses in perfect sync — on every
            device you own.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              Start for free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-semibold transition-colors hover:bg-accent sm:w-auto"
            >
              Sign in to your account
            </Link>
          </div>
          {/* Device badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {devices.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-1.5 rounded-full bg-muted/60 px-3 py-1 text-xs text-muted-foreground"
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mock UI strip (visual teaser) ── */}
      <section className="px-4 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
          {/* Fake browser chrome */}
          <div className="flex h-9 items-center gap-2 border-b border-border/60 bg-muted/40 px-4">
            <span className="h-3 w-3 rounded-full bg-red-500/60" />
            <span className="h-3 w-3 rounded-full bg-amber-500/60" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
            <span className="ml-3 flex-1 rounded bg-background/60 px-3 py-0.5 text-xs text-muted-foreground">
              app.planningo.com
            </span>
          </div>
          {/* Fake dashboard grid */}
          <div className="grid gap-px bg-border/40 sm:grid-cols-3">
            {[
              { label: 'Open Todos', value: '4', icon: CheckSquare, color: 'text-blue-400' },
              { label: "Today's Events", value: '3', icon: Calendar, color: 'text-violet-400' },
              { label: 'Planned blocks', value: '6', icon: Clock3, color: 'text-emerald-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center gap-3 bg-card px-5 py-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className={`h-5 w-5 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid gap-px bg-border/40 sm:grid-cols-2">
            <div className="bg-card px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming
              </p>
              {['Team standup — 10:00 AM', 'Dentist — 2:30 PM', 'Gym — 6:00 PM'].map((e) => (
                <div key={e} className="flex items-center gap-2 py-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-violet-400" />
                  <span className="text-sm">{e}</span>
                </div>
              ))}
            </div>
            <div className="bg-card px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Quick actions
              </p>
              <div className="flex flex-wrap gap-2">
                {['Add Todo', 'New Event', 'Plan Today', 'Log Expense'].map((a) => (
                  <span
                    key={a}
                    className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features grid ── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Six tools. One home.
          </h2>
          <p className="mt-3 text-muted-foreground">
            Everything you track in separate apps or spreadsheets — unified.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, label, color, bg, desc }) => (
            <div
              key={label}
              className="group rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card/80"
            >
              <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <h3 className="mb-1 font-semibold">{label}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Why Planningo ── */}
      <section className="border-y border-border/60 bg-muted/30 px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Why Planningo?
            </h2>
            <p className="mt-3 text-muted-foreground">
              Built for the way you actually work — mobile-first, real-time, and always with you.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {whyItems.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex flex-col gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table: Planningo vs Excel ── */}
      <section className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Ditch the spreadsheet
          </h2>
          <p className="mt-3 text-muted-foreground">
            Manual Excel sheets belong in 2005. Here&apos;s what you&apos;re missing.
          </p>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Header */}
          <div className="grid grid-cols-3 border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div className="px-4 py-3">Feature</div>
            <div className="border-l border-border px-4 py-3 text-center">Excel / Sheets</div>
            <div className="border-l border-border px-4 py-3 text-center text-primary">Planningo</div>
          </div>
          {compareRows.map(({ label, excel, planningo }, i) => (
            <div
              key={label}
              className={`grid grid-cols-3 text-sm ${i !== compareRows.length - 1 ? 'border-b border-border/50' : ''}`}
            >
              <div className="px-4 py-3 text-muted-foreground">{label}</div>
              <div className="flex items-center justify-center border-l border-border/50 px-4 py-3">
                {excel ? (
                  <Check className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <X className="h-4 w-4 text-destructive/70" />
                )}
              </div>
              <div className="flex items-center justify-center border-l border-border/50 px-4 py-3">
                {planningo ? (
                  <Check className="h-4 w-4 text-emerald-500" />
                ) : (
                  <X className="h-4 w-4 text-destructive/70" />
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Access anywhere CTA strip ── */}
      <section className="px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-violet-500/10 border border-primary/20 px-6 py-12 text-center sm:py-16">
          <div className="mb-3 flex justify-center gap-4">
            {devices.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1 text-muted-foreground"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px]">{label}</span>
              </div>
            ))}
          </div>
          <h2 className="mt-4 text-2xl font-bold sm:text-3xl">
            Open your laptop, pick up your phone.
            <br className="hidden sm:block" />
            <span className="text-primary"> It&apos;s always in sync.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground sm:text-base">
            No more emailing yourself spreadsheets. No more &quot;which version is the
            latest?&quot;. Planningo lives in the cloud and works on every device.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/register"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              Create your free account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Free to use. No credit card required.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border/60 px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/landing" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-semibold">Planningo</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            Your all-in-one productivity platform. Organized. Anywhere.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="hover:text-foreground transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
