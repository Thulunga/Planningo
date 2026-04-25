import type { Metadata } from 'next'
import Link from 'next/link'
import { generateMetadata, generateWebApplicationSchema } from '@/lib/seo'
import { Button } from '@planningo/ui'
import { CalendarDays, CheckSquare, TrendingUp, Users } from 'lucide-react'

export const metadata: Metadata = generateMetadata(
  undefined,
  'Planningo - Your all-in-one productivity platform for todos, calendar, day planner, reminders, trip planning, and expense splitting.',
  '/'
)

export default function LandingPage() {
  const webAppSchema = generateWebApplicationSchema()

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* JSON-LD Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webAppSchema),
        }}
        suppressHydrationWarning
      />

      {/* Header/Navigation */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="text-xl tracking-tight">Planningo</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Button asChild size="sm">
              <Link href="/register">Get Started</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex flex-1 items-center justify-center px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            All-in-One Productivity Platform
          </h1>
          <p className="mt-6 text-lg text-muted-foreground sm:text-xl">
            Manage your tasks, calendar, day planner, reminders, trips, and expenses — all in one beautiful, intuitive workspace.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Start Free Today</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/50 px-4 py-20 md:px-6">
        <div className="mx-auto max-w-screen-2xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to Stay Organized
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Built for productivity, designed for simplicity.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Todo Management */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Task Management</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Create, organize, and prioritize your tasks with due dates and tags.
              </p>
            </div>

            {/* Calendar */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Calendar & Events</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Schedule events and view your calendar in multiple formats.
              </p>
            </div>

            {/* Day Planner */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Day Planner</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Time-block your day for better focus and productivity.
              </p>
            </div>

            {/* Expense Tracking */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Expense Tracking</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Split expenses and track balances with friends.
              </p>
            </div>

            {/* Trip Planning */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CalendarDays className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Trip Planning</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Plan trips with day-by-day itineraries and cost tracking.
              </p>
            </div>

            {/* Reminders */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Smart Reminders</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Never miss important tasks with push notifications.
              </p>
            </div>

            {/* Dark Mode */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <CheckSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Dark Mode</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Easy on your eyes with our default dark theme.
              </p>
            </div>

            {/* Sync & Collaborate */}
            <div className="rounded-lg border bg-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold">Real-time Sync</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Changes sync instantly across all your devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 md:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Get Organized?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Join thousands of users who have simplified their productivity workflow with Planningo.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href="/register">Create Free Account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50 px-4 py-8 md:px-6">
        <div className="mx-auto max-w-screen-2xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays className="h-4 w-4" />
              </div>
              <span className="font-semibold">Planningo</span>
            </div>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="#" className="hover:text-foreground">
                Terms
              </Link>
              <Link href="#" className="hover:text-foreground">
                Contact
              </Link>
            </nav>
          </div>
          <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2026 Planningo. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
