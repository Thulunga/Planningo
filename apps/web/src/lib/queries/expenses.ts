import { queryOptions } from '@tanstack/react-query'
import { getExpenseGroups } from '@/lib/actions/expenses'

export const expenseKeys = {
  all: ['expenses'] as const,
  groups: () => [...expenseKeys.all, 'groups'] as const,
}

export function expenseGroupsQuery() {
  return queryOptions({
    queryKey: expenseKeys.groups(),
    queryFn: () => getExpenseGroups(),
  })
}
