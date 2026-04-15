import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'
import { BottomTabBar } from '@/components/dashboard/bottom-tab-bar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Fixed sidebar — hidden on mobile, visible md+ */}
      <Sidebar profile={profile} />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header with clock, hamburger (mobile), theme toggle */}
        <Header profile={profile} />

        {/* Page content — extra bottom padding on mobile for tab bar clearance */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
          <div className="mx-auto w-full max-w-screen-2xl p-4 pb-24 md:p-6 md:pb-6">{children}</div>
        </main>
      </div>

      {/* Fixed bottom tab bar — mobile only */}
      <BottomTabBar />
    </div>
  )
}
