import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/server'
import { initializePortfolio } from '@/lib/trading/paper-trader'

/**
 * Admin gate for /trading routes.
 * Middleware already blocks non-admins at the edge,
 * but this server component is a belt-and-suspenders check.
 */
export default async function TradingLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    redirect('/')
  }

  // Ensure the admin's paper portfolio exists
  await initializePortfolio(user.id)

  return <>{children}</>
}
