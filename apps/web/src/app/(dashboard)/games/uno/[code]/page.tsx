import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient, getUserProfile } from '@/lib/supabase/server'
import { UnoRoomClient } from '@/components/uno/uno-room-client'

export const metadata: Metadata = { title: 'UNO Room' }

interface Props {
  params: Promise<{ code: string }>
}

export default async function UnoRoomPage({ params }: Props) {
  const { code } = await params
  const upper = code.toUpperCase()
  const profile = await getUserProfile()
  if (!profile) return null
  const supabase = await createClient()

  const { data: room } = await supabase
    .from('uno_rooms')
    .select('id, code, host_id, status, max_players')
    .eq('code', upper)
    .single()
  if (!room) notFound()

  return <UnoRoomClient roomId={room.id} code={room.code} hostId={room.host_id} maxPlayers={room.max_players} currentUserId={profile.id} currentUserName={profile.full_name ?? 'Player'} />
}
