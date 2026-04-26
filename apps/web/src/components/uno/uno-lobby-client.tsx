'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Loader2, Plus, LogIn, Users, ArrowLeft } from 'lucide-react'
import { Button, Card, CardContent, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@planningo/ui'
import { createUnoRoom, joinUnoRoom } from '@/lib/actions/uno'

export function UnoLobbyClient() {
  const router = useRouter()
  const [creating, startCreate] = useTransition()
  const [joining, startJoin] = useTransition()
  const [maxPlayers, setMaxPlayers] = useState('4')
  const [code, setCode] = useState('')

  function handleCreate() {
    startCreate(async () => {
      const r = await createUnoRoom({ maxPlayers: parseInt(maxPlayers, 10) })
      if (r.error || !r.code) {
        toast.error(r.error ?? 'Failed to create room')
        return
      }
      router.push(`/games/uno/${r.code}`)
    })
  }

  function handleJoin() {
    if (!code.trim()) {
      toast.error('Enter a room code')
      return
    }
    startJoin(async () => {
      const r = await joinUnoRoom(code.trim())
      if (r.error || !r.code) {
        toast.error(r.error ?? 'Failed to join')
        return
      }
      router.push(`/games/uno/${r.code}`)
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
          <Link href="/games"><ArrowLeft className="mr-1 h-4 w-4" /> Back to Games</Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">UNO Clash</h1>
        <p className="text-sm text-muted-foreground">Real-time multiplayer UNO with friends. Create a room or join with a code.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Create */}
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Plus className="h-4 w-4 text-primary" /> Create a new room
            </div>
            <div className="space-y-1.5">
              <Label>Max players</Label>
              <Select value={maxPlayers} onValueChange={setMaxPlayers}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} players</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={creating} className="w-full gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
              Create Room
            </Button>
          </CardContent>
        </Card>

        {/* Join */}
        <Card>
          <CardContent className="space-y-4 py-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <LogIn className="h-4 w-4 text-primary" /> Join with a code
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uno-code">Room code</Label>
              <Input
                id="uno-code"
                placeholder="ABCD23"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                className="uppercase tracking-widest font-mono"
                maxLength={12}
              />
            </div>
            <Button onClick={handleJoin} disabled={joining} className="w-full gap-2" variant="secondary">
              {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
              Join Room
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
        Tip: share the room code (or the page URL) with friends — they will land directly in the lobby.
      </section>
    </div>
  )
}
