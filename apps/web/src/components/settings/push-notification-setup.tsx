'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff, Loader2, CheckCircle2 } from 'lucide-react'
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@planningo/ui'
import { getSupabaseClient } from '@/lib/supabase/client'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

type Status = 'idle' | 'checking' | 'subscribed' | 'unsubscribed' | 'unsupported'

export function PushNotificationSetup() {
  const [status, setStatus] = useState<Status>('checking')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        setStatus(sub ? 'subscribed' : 'unsubscribed')
      })
    })
  }, [])

  async function subscribe() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) throw new Error('VAPID key not configured')

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const { endpoint, keys } = subscription.toJSON() as {
        endpoint: string
        keys: { p256dh: string; auth: string }
      }

      const supabase = getSupabaseClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        user_agent: navigator.userAgent,
      }, { onConflict: 'endpoint' })

      if (error) throw error

      setStatus('subscribed')
      toast.success('Push notifications enabled!')
    } catch (err) {
      toast.error('Failed to enable push notifications')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function unsubscribe() {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        const supabase = getSupabaseClient()
        await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
        await subscription.unsubscribe()
      }
      setStatus('unsubscribed')
      toast.success('Push notifications disabled')
    } catch {
      toast.error('Failed to disable push notifications')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4" />
          Browser Push Notifications
        </CardTitle>
        <CardDescription>
          Receive reminder notifications in your browser, even when the tab is in the background.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'checking' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking status...
          </div>
        ) : status === 'unsupported' ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BellOff className="h-4 w-4" />
            Push notifications are not supported in this browser.
          </div>
        ) : status === 'subscribed' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Push notifications are enabled on this device.
            </div>
            <Button variant="outline" size="sm" onClick={unsubscribe} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Disable on this device
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Enable push notifications to get reminder alerts on this device.
            </p>
            <Button size="sm" onClick={subscribe} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Bell className="mr-2 h-4 w-4" />
              Enable Push Notifications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
