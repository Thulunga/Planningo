import { redirect } from 'next/navigation'
import { getUserProfile } from '@/lib/supabase/server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Header } from '@/components/dashboard/header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getUserProfile()

  if (!profile) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Fixed sidebar */}
      <Sidebar profile={profile} />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header with persistent clock */}
        <Header profile={profile} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
