import type { Metadata } from 'next'
import { UnoLobbyClient } from '@/components/uno/uno-lobby-client'

export const metadata: Metadata = { title: 'UNO Clash' }

export default function UnoLobbyPage() {
  return <UnoLobbyClient />
}
