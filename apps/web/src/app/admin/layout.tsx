import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/supabase/admin'
import AdminSidebar from '@/components/admin/sidebar'

export const metadata: Metadata = {
  title: 'Admin Dashboard - Planningo',
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await isAdmin()

  if (!admin) {
    redirect('/')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar (desktop) + mobile top bar/drawer are inside AdminSidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Spacer for mobile top bar */}
        <div className="md:hidden h-14" />
        <div className="mx-auto w-full max-w-screen-xl p-4 md:p-6">{children}</div>
      </main>
    </div>
  )
}
