import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@planningo/ui'
import FeedbackClient from '@/components/settings/feedback-client'

export const metadata: Metadata = {
  title: 'Feedback & Bug Reports',
}

export default async function FeedbackPage() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Feedback & Bug Reports</h1>
        <p className="text-sm text-muted-foreground">
          Help us improve Planningo by sharing your feedback, reporting bugs, or suggesting new features
        </p>
      </div>

      <FeedbackClient />
    </div>
  )
}
