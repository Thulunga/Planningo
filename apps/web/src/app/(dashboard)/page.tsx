import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Skeleton } from '@planningo/ui'
import { createClient, getUserProfile, getUser } from '@/lib/supabase/server'
import { DashboardHero, DashboardBody } from '@/components/dashboard/dashboard-overview'

export const metadata: Metadata = {
  title: 'Dashboard',
}

export default function DashboardPage() {
  // Two independent streaming sections: the greeting hero paints as soon as the
  // (fast, cached) profile resolves, while the data-heavy body streams in after.
  return (
    <div className="space-y-4 md:space-y-6">
      <Suspense fallback={<HeroFallback />}>
        <HeroSection />
      </Suspense>
      <Suspense fallback={<BodyFallback />}>
        <BodySection />
      </Suspense>
    </div>
  )
}

async function HeroSection() {
  const profile = await getUserProfile()
  if (!profile) return null
  return <DashboardHero profile={profile} />
}

async function BodySection() {
  const supabase = await createClient()
  // Only the user id is needed to scope queries (profile.id === auth user id),
  // so use the cached auth user and skip waiting on the profiles table query.
  const user = await getUser()
  if (!user) return null

  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  // Run all three queries in parallel - cuts fetch time by ~2/3
  const [{ data: todaysTodos }, { data: upcomingEvents }, { data: todaysPlanner }] =
    await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .neq('status', 'done')
        .neq('status', 'cancelled')
        .is('deleted_at', null)
        .order('priority', { ascending: false })
        .limit(5),

      supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('start_time', now)
        .lte('start_time', nextWeek)
        .is('deleted_at', null)
        .order('start_time', { ascending: true })
        .limit(5),

      supabase
        .from('planner_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', today)
        .order('start_time', { ascending: true })
        .limit(20),
    ])

  return (
    <DashboardBody
      todaysTodos={todaysTodos ?? []}
      upcomingEvents={upcomingEvents ?? []}
      todaysPlanner={todaysPlanner ?? []}
    />
  )
}

function HeroFallback() {
  return (
    <div className="flex flex-col gap-4 overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-5 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
      <div className="flex justify-center sm:justify-start sm:shrink-0">
        <div className="h-[110px] w-[110px] rounded-full border-2 border-primary/20 bg-card/50" />
      </div>
      <div className="hidden sm:block w-px self-stretch bg-border/50" />
      <div className="block sm:hidden h-px w-full bg-border/50" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
  )
}

function BodyFallback() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats strip */}
      <div className="flex gap-3 overflow-x-auto pb-1 sm:overflow-visible">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[62px] min-w-[130px] flex-1 rounded-xl sm:min-w-0" />
        ))}
      </div>
      {/* 3-column card grid */}
      <div className="grid gap-3 md:gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-4 rounded-xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 shrink-0 rounded-full" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
