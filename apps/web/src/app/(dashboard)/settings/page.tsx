import type { Metadata } from 'next'
import Link from 'next/link'
import { getUserProfile } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@planningo/ui'
import { User, Bell, Globe, ArrowRight, MessageSquare, LayoutDashboard } from 'lucide-react'

export const metadata: Metadata = { title: 'Settings' }

export default async function SettingsPage() {
  // Run both in parallel — isAdmin uses getCachedUser so the auth call is shared
  const [profile, admin] = await Promise.all([getUserProfile(), isAdmin()])
  if (!profile) return null

  const sections = [
    {
      href: '/settings/profile',
      icon: User,
      title: 'Profile',
      description: 'Update your name, avatar, and account details',
    },
    {
      href: '/settings/notifications',
      icon: Bell,
      title: 'Notifications',
      description: 'Configure push notifications and reminder preferences',
    },
    {
      href: '/settings/feedback',
      icon: MessageSquare,
      title: 'Feedback & Bug Reports',
      description: 'Share ideas, report bugs, and suggest improvements',
    },
    ...(admin
      ? [
          {
            href: '/admin',
            icon: LayoutDashboard,
            title: 'Admin Dashboard',
            description: 'Manage feedback, expenses, and platform settings',
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <div className="grid gap-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} href={section.href}>
              <Card className="transition-colors hover:bg-accent/50">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{section.title}</p>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="text-xs text-muted-foreground">
        Signed in as <span className="font-medium">{profile.email}</span>
      </div>
    </div>
  )
}
