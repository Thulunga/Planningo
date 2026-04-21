import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ShieldAlert } from 'lucide-react'
import { Button } from '@planningo/ui'
import { getUser } from '@/lib/supabase/server'
import { getExpensesAdminDashboard } from '@/lib/actions/expenses-admin'
import { ExpensesAdminClient } from '@/components/expenses/expenses-admin-client'

export const metadata: Metadata = { title: 'Expenses Admin' }

export default async function ExpensesAdminPage() {
  const user = await getUser()
  const isAdmin = !!(
    user?.email &&
    process.env.ADMIN_EMAIL &&
    user.email === process.env.ADMIN_EMAIL
  )

  if (!isAdmin) redirect('/')

  const data = await getExpensesAdminDashboard()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
            <Link href="/expenses">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to Expenses
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Expenses Admin</h1>
          <p className="text-sm text-muted-foreground">Global expense moderation and admin controls</p>
        </div>
      </div>

      {data.error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="h-4 w-4" />
            Admin dashboard unavailable
          </div>
          <p className="mt-1 text-xs">
            {data.error}
          </p>
        </div>
      ) : (
        <ExpensesAdminClient
          stats={data.stats}
          groups={data.groups as any}
          expenses={data.expenses as any}
          personalTransactions={data.personalTransactions as any}
        />
      )}
    </div>
  )
}
