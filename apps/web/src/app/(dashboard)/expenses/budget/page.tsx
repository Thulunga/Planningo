import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@planningo/ui'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile } from '@/lib/supabase/server'
import { getBudgetDashboard } from '@/lib/actions/budget'
import { BudgetDashboard } from '@/components/expenses/budget/budget-dashboard'
import { FeedbackCta } from '@/components/feedback/feedback-cta'

export const metadata: Metadata = { title: 'My Budget' }

interface Props {
  searchParams: Promise<{ month?: string; year?: string }>
}

export default async function BudgetPage({ searchParams }: Props) {
  const profile = await getUserProfile()
  if (!profile) return null

  const params = await searchParams
  const now = new Date()
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear()

  // Get all dashboard data
  const data = await getBudgetDashboard(month, year)
  if (!data) return null

  // Get group expenses for linking (all time, not just this month)
  const supabase = await createClient()

  const { data: memberships } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', profile.id)

  const groupIds = (memberships ?? []).map((m: { group_id: string }) => m.group_id)

  let groupExpenses: {
    id: string
    title: string
    expense_date: string
    amount: number
    currency: string
    expense_groups: { name: string } | null
    expense_splits: { amount: number }[]
  }[] = []

  if (groupIds.length > 0) {
    const { data: gExp } = await supabase
      .from('expenses')
      .select(`
        id, title, expense_date, amount, currency,
        expense_groups(name),
        expense_splits!inner(amount)
      `)
      .in('group_id', groupIds)
      .eq('expense_splits.user_id', profile.id)
      .is('deleted_at', null)
      .order('expense_date', { ascending: false })
      .limit(100)

    groupExpenses = (gExp ?? []).map((e: any) => ({
      ...e,
      expense_groups: Array.isArray(e.expense_groups) ? (e.expense_groups[0] ?? null) : e.expense_groups,
      expense_splits: Array.isArray(e.expense_splits) ? e.expense_splits : [e.expense_splits],
    }))
  }

  return (
    <div className="pb-28 sm:pb-6">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-3 border-b border-border/50 bg-background/95 backdrop-blur px-4 py-2.5 mb-4">
        <Button variant="ghost" size="sm" asChild className="-ml-1.5 h-8 w-8 p-0 shrink-0">
          <Link href="/expenses">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold tracking-tight leading-tight">My Budget</h1>
          <p className="text-[11px] text-muted-foreground leading-tight hidden sm:block">Personal income, expenses &amp; goals</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="text-xs">
            <Link href="/expenses">Groups</Link>
          </Button>
        </div>
      </div>

      <BudgetDashboard
        month={month}
        year={year}
        transactions={data.transactions as any}
        categories={data.categories as any}
        budgets={data.budgets as any}
        groupExpenses={groupExpenses}
      />
      <FeedbackCta
        heading="How can we improve Personal Budget?"
        description="Report budget-tracking bugs, request analytics ideas, or suggest better money-planning features."
        className="mt-4"
      />
    </div>
  )
}

