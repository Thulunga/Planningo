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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  )
}
