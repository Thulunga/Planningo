import type { Metadata } from 'next'
import AdminFeedbackManager from '@/components/admin/feedback-manager'

export const metadata: Metadata = {
  title: 'Feedback Management - Admin',
}

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Feedback Management</h1>
        <p className="text-muted-foreground mt-2">
          Review, prioritize, and manage all user feedback submissions
        </p>
      </div>

      <AdminFeedbackManager />
    </div>
  )
}
