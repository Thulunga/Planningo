import type { Metadata } from 'next'
import AdminExpensesManager from '@/components/admin/expenses-manager'

export const metadata: Metadata = {
  title: 'Expenses Management - Admin',
}

export default function AdminExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Expenses Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor expenses and settlements across all groups
        </p>
      </div>

      <AdminExpensesManager />
    </div>
  )
}
