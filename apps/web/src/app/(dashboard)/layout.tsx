import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { getUserProfile, getUser } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { BottomTabBar } from '@/components/dashboard/bottom-tab-bar'

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // No top-level await here: the static shell + page content stream immediately.
  // Profile-dependent chrome (sidebar/header) fills in via Suspense once auth resolves.
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Fixed sidebar - hidden on mobile, visible md+ */}
      <Suspense fallback={<SidebarSkeleton />}>
        <SidebarSlot />
      </Suspense>

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header with clock, hamburger (mobile), theme toggle */}
        <Suspense fallback={<HeaderSkeleton />}>
          <HeaderSlot />
        </Suspense>

        {/* Page content - extra bottom padding on mobile for tab bar clearance */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
          <div className="mx-auto w-full max-w-screen-2xl p-4 pb-24 md:p-6 md:pb-6">{children}</div>
        </main>
      </div>

      {/* Fixed bottom tab bar - mobile only */}
      <BottomTabBar />
    </div>
  )
}

async function getLayoutAuth() {
  const [profile, user] = await Promise.all([getUserProfile(), getUser()])
  if (!profile) redirect('/login')
  const isAdmin = !!(
    user?.email &&
    process.env.ADMIN_EMAIL &&
    user.email === process.env.ADMIN_EMAIL
  )
  return { profile, isAdmin }
}

async function SidebarSlot() {
  const { profile, isAdmin } = await getLayoutAuth()
  return <Sidebar profile={profile} isAdmin={isAdmin} />
}

async function HeaderSlot() {
  const { profile, isAdmin } = await getLayoutAuth()
  return <Header profile={profile} isAdmin={isAdmin} />
}

function SidebarSkeleton() {
  return (
    <aside className="relative hidden h-screen w-60 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="h-8 w-8 shrink-0 rounded-lg bg-primary/30" />
        <div className="h-4 w-24 rounded bg-sidebar-accent/40" />
      </div>
      <nav className="flex-1 py-3">
        <ul className="space-y-0.5 px-2">
          {Array.from({ length: 9 }).map((_, i) => (
            <li key={i} className="flex h-11 items-center gap-3 rounded-md px-3">
              <div className="h-4 w-4 shrink-0 rounded bg-sidebar-accent/40" />
              <div className="h-4 w-28 rounded bg-sidebar-accent/30" />
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function HeaderSkeleton() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur md:static md:inset-x-auto">
      <div className="h-8 w-8 rounded-lg bg-muted md:hidden" />
      <div className="hidden md:flex" />
      <div className="flex items-center gap-2">
        <div className="hidden h-8 w-24 rounded bg-muted sm:block" />
        <div className="h-8 w-8 rounded-md bg-muted" />
      </div>
    </header>
  )
}
