import type { Metadata } from 'next'
import { HydrationBoundary, dehydrate } from '@tanstack/react-query'
import { getQueryClient } from '@/lib/query/get-query-client'
import { expenseGroupsQuery } from '@/lib/queries/expenses'
import { ExpensesClient } from '@/components/expenses/expenses-client'

export const metadata: Metadata = { title: 'Expenses' }

export default function ExpensesPage() {
  const queryClient = getQueryClient()
  // Non-blocking prefetch: the RSC doesn't await the DB, so back/forward nav
  // completes instantly and the client renders from the React Query cache.
  void queryClient.prefetchQuery(expenseGroupsQuery())

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ExpensesClient />
    </HydrationBoundary>
  )
}
