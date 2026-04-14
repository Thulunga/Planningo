import type { Metadata } from 'next'
import Link from 'next/link'
import { getUserProfile } from '@/lib/supabase/server'
import { Button } from '@planningo/ui'
import { ArrowLeft } from 'lucide-react'
import { ProfileForm } from '@/components/settings/profile-form'

export const metadata: Metadata = { title: 'Profile Settings' }

export default async function ProfileSettingsPage() {
  const profile = await getUserProfile()
  if (!profile) return null

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
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-sm text-muted-foreground">Update your personal information</p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
