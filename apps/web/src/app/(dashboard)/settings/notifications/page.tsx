import type { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@planningo/ui'
import { ArrowLeft } from 'lucide-react'
import { PushNotificationSetup } from '@/components/settings/push-notification-setup'

export const metadata: Metadata = { title: 'Notification Settings' }

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/settings">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Settings
          </Link>
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground">Configure how you receive reminders</p>
      </div>
      <PushNotificationSetup />
    </div>
  )
}
