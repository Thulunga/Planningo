'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, User } from 'lucide-react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from '@planningo/ui'
import { createClient } from '@/lib/supabase/server'
import { useRouter } from 'next/navigation'
import type { Tables } from '@planningo/database'
import { getSupabaseClient } from '@/lib/supabase/client'

const TIMEZONES = [
  'UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
  'Asia/Kolkata', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Australia/Sydney',
]

interface ProfileFormProps {
  profile: Tables<'profiles'>
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState({
    full_name: profile.full_name ?? '',
    timezone: profile.timezone ?? 'UTC',
    locale: profile.locale ?? 'en',
  })

  const initials = profile.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?'

  async function handleSave() {
    setSaving(true)
    const supabase = getSupabaseClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: data.full_name,
        timezone: data.timezone,
        locale: data.locale,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)

    setSaving(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Profile updated')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{profile.full_name ?? 'No name set'}</p>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Full Name</Label>
          <Input
            id="full-name"
            value={data.full_name}
            onChange={(e) => setData((p) => ({ ...p, full_name: e.target.value }))}
            placeholder="Your name"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={profile.email} disabled className="opacity-60" />
          <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
        </div>

        <div className="space-y-1.5">
          <Label>Timezone</Label>
          <Select
            value={data.timezone}
            onValueChange={(v) => setData((p) => ({ ...p, timezone: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz} value={tz}>{tz.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Used to display your clock and format dates
          </p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Changes
      </Button>
    </div>
  )
}
