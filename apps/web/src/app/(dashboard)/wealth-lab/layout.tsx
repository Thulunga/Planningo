import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'

/**
 * Admin gate for /wealth-lab routes.
 * Middleware blocks non-admin users at the edge,
 * and this server component keeps the route protected in-app as well.
 */
export default async function WealthLabLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/')
  }

  return <>{children}</>
}
