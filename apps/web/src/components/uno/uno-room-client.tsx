'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Check, Copy, LogOut, Play, Send, Trophy, Users } from 'lucide-react'
import {
  Avatar, AvatarFallback, AvatarImage,
  Button, Card, CardContent, Input, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@planningo/ui'
import { getSupabaseClient } from '@/lib/supabase/client'
import { drawUnoCard, leaveUnoRoom, playUnoCard, sendUnoChat, startUnoGame } from '@/lib/actions/uno'
import { CardView } from './card-view'
import type { Card as UnoCard, CardColor, ClientView } from '@/lib/uno/types'

interface PlayerRow {
  id: string
  user_id: string
  seat: number
  left_at: string | null
  profile?: {
    id: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

interface ChatRow {
  id: string
  user_id: string
  message: string
  created_at: string
  author_name?: string | null
  author_avatar?: string | null
}

interface Props {
  roomId: string
  code: string
  hostId: string
  maxPlayers: number
  currentUserId: string
  currentUserName: string
}

const COLOR_DOT: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
}

export function UnoRoomClient({ roomId, code, hostId, maxPlayers, currentUserId, currentUserName }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseClient(), [])
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [chat, setChat] = useState<ChatRow[]>([])
  const [view, setView] = useState<ClientView | null>(null)
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'playing' | 'ended'>('waiting')
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [chatMsg, setChatMsg] = useState('')
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null)
  const [copied, setCopied] = useState(false)
  const [actionPending, startAction] = useTransition()
  const chatEndRef = useRef<HTMLDivElement>(null)

  const isHost = currentUserId === hostId

  // ── data loaders ──────────────────────────────────────────────────────────

  const refreshPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('uno_players')
      .select('id, user_id, seat, left_at, profile:profiles!uno_players_user_id_fkey(id, full_name, avatar_url)')
      .eq('room_id', roomId)
      .order('seat', { ascending: true })
    setPlayers(((data ?? []) as unknown) as PlayerRow[])
  }, [roomId, supabase])

  const refreshRoom = useCallback(async () => {
    const { data } = await supabase
      .from('uno_rooms')
      .select('status, winner_id')
      .eq('id', roomId)
      .single()
    if (data) {
      setRoomStatus(data.status as 'waiting' | 'playing' | 'ended')
      setWinnerId((data.winner_id as string) ?? null)
    }
  }, [roomId, supabase])

  const refreshView = useCallback(async () => {
    const { data, error } = await supabase.rpc('uno_get_view', { p_room_id: roomId })
    if (error) {
      // Game may not have started yet; that's fine.
      setView(null)
      return
    }
    if (!data) { setView(null); return }
    setView(data as unknown as ClientView)
  }, [roomId, supabase])

  const refreshChat = useCallback(async () => {
    const { data } = await supabase
      .from('uno_chat')
      .select('id, user_id, message, created_at, author:profiles!uno_chat_user_id_fkey(full_name, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(200)
    const rows: ChatRow[] = (data ?? []).map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      message: r.message,
      created_at: r.created_at,
      author_name: r.author?.full_name ?? null,
      author_avatar: r.author?.avatar_url ?? null,
    }))
    setChat(rows)
  }, [roomId, supabase])

  // initial load
  useEffect(() => {
    refreshPlayers()
    refreshRoom()
    refreshView()
    refreshChat()
  }, [refreshPlayers, refreshRoom, refreshView, refreshChat])

  // ── realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel(`uno:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uno_players', filter: `room_id=eq.${roomId}` },
        () => { refreshPlayers() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'uno_rooms', filter: `id=eq.${roomId}` },
        () => { refreshRoom(); refreshView() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'uno_events', filter: `room_id=eq.${roomId}` },
        () => { refreshView() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'uno_chat', filter: `room_id=eq.${roomId}` },
        () => { refreshChat() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [roomId, supabase, refreshPlayers, refreshRoom, refreshView, refreshChat])

  // auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.length])

  // ── derived ───────────────────────────────────────────────────────────────

  const activePlayers = players.filter((p) => !p.left_at)
  const mySeat = activePlayers.find((p) => p.user_id === currentUserId)?.seat ?? null
  const seatToPlayer = useMemo(() => {
    const map: Record<number, PlayerRow> = {}
    for (const p of activePlayers) map[p.seat] = p
    return map
  }, [activePlayers])
  const isMyTurn = view?.currentSeat === mySeat && roomStatus === 'playing'

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // ── actions ───────────────────────────────────────────────────────────────

  function handleStart() {
    startAction(async () => {
      const r = await startUnoGame(roomId)
      if (r.error) toast.error(r.error)
    })
  }

  function handleLeave() {
    startAction(async () => {
      await leaveUnoRoom(roomId)
      router.push('/games/uno')
    })
  }

  function handleDraw() {
    if (!isMyTurn) { toast.error('Not your turn'); return }
    startAction(async () => {
      const r = await drawUnoCard(roomId)
      if (r.error) toast.error(r.error)
    })
  }

  function handlePlay(card: UnoCard, chosenColor?: CardColor) {
    if (!isMyTurn) { toast.error('Not your turn'); return }
    if ((card.value === 'wild' || card.value === 'wild4') && !chosenColor) {
      setPendingWild(card)
      return
    }
    startAction(async () => {
      const r = await playUnoCard({
        roomId,
        cardId: card.id,
        ...(chosenColor ? { chosenColor: chosenColor as 'red' | 'yellow' | 'green' | 'blue' } : {}),
      })
      if (r.error) toast.error(humanizeError(r.error))
    })
  }

  function handleSendChat() {
    const msg = chatMsg.trim()
    if (!msg) return
    setChatMsg('')
    startAction(async () => {
      const r = await sendUnoChat(roomId, msg)
      if (r.error) toast.error(r.error)
    })
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 pb-20 sm:pb-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/games/uno"><ArrowLeft className="mr-1 h-4 w-4" /> Lobby</Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight">UNO Room</h1>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono tracking-widest">{code}</span> · {activePlayers.length}/{maxPlayers} players · {roomStatus}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="text-xs">{copied ? 'Copied' : 'Share Code'}</span>
          </Button>
          {roomStatus === 'waiting' && isHost && (
            <Button size="sm" disabled={actionPending || activePlayers.length < 2} onClick={handleStart} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Start Game
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleLeave} className="gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Leave
          </Button>
        </div>
      </div>

      {/* Players */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="inline h-3.5 w-3.5 mr-1" /> Players
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: maxPlayers }).map((_, seat) => {
            const p = seatToPlayer[seat]
            const isCurrentTurn = view?.currentSeat === seat && roomStatus === 'playing'
            const handCount = p && view?.handCounts ? (view.handCounts[p.user_id] ?? 0) : 0
            return (
              <Card
                key={seat}
                className={isCurrentTurn ? 'border-primary ring-1 ring-primary/40' : ''}
              >
                <CardContent className="flex items-center gap-2 py-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={p?.profile?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs">
                      {p?.profile?.full_name?.[0] ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {p ? (p.profile?.full_name ?? 'Player') : <span className="text-muted-foreground">Empty</span>}
                      {p?.user_id === hostId && <span className="ml-1 text-[10px] text-primary">(host)</span>}
                      {p?.user_id === currentUserId && <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Seat {seat + 1}
                      {roomStatus === 'playing' && p && ` · ${handCount} cards`}
                    </p>
                  </div>
                  {isCurrentTurn && <span className="text-[10px] font-bold text-primary">TURN</span>}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Game board */}
        <div className="space-y-4">
          {roomStatus === 'waiting' ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Waiting for players. Share the code <span className="font-mono font-semibold">{code}</span>.
                {isHost && activePlayers.length >= 2 && (
                  <p className="mt-2 text-xs">You can start the game any time.</p>
                )}
              </CardContent>
            </Card>
          ) : roomStatus === 'ended' ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <Trophy className="h-10 w-10 text-amber-400" />
                <p className="text-base font-semibold">
                  {winnerId === currentUserId
                    ? 'You won! 🎉'
                    : `${players.find((p) => p.user_id === winnerId)?.profile?.full_name ?? 'A player'} wins!`}
                </p>
                <Button asChild size="sm" variant="outline" className="mt-2">
                  <Link href="/games/uno">Back to Lobby</Link>
                </Button>
              </CardContent>
            </Card>
          ) : view ? (
            <>
              <div className="rounded-2xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">Active color</div>
                    <span className={`inline-block h-5 w-5 rounded-full ${COLOR_DOT[view.currentColor] ?? 'bg-zinc-500'}`} />
                    {view.pendingDraw > 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                        Pending draw +{view.pendingDraw}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Direction: {view.direction === 1 ? '→' : '←'} · Deck: {view.deckCount}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-center gap-6">
                  <div className="flex flex-col items-center gap-1">
                    <CardView card={null} faceDown size="lg" onClick={isMyTurn ? handleDraw : undefined} disabled={!isMyTurn} />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Draw pile</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <CardView card={view.discardTop} size="lg" />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Discard</span>
                  </div>
                </div>
                <div className="mt-3 text-center text-xs text-muted-foreground">
                  {isMyTurn ? <span className="font-semibold text-primary">Your turn</span> : 'Waiting for opponent…'}
                </div>
              </div>

              {/* My hand */}
              <div>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your hand ({view.myHand.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {view.myHand.length === 0 && (
                    <p className="text-sm text-muted-foreground">No cards in hand.</p>
                  )}
                  {view.myHand.map((card) => (
                    <CardView
                      key={card.id}
                      card={card}
                      onClick={() => handlePlay(card)}
                      disabled={!isMyTurn || actionPending}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Loading game…
              </CardContent>
            </Card>
          )}
        </div>

        {/* Chat */}
        <div className="rounded-2xl border border-border bg-card flex flex-col h-[480px] lg:h-auto">
          <div className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chat
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {chat.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-6">No messages yet.</p>
            )}
            {chat.map((m) => (
              <div key={m.id} className="flex items-start gap-2 text-sm">
                <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                  <AvatarImage src={m.author_avatar ?? undefined} />
                  <AvatarFallback className="text-[10px]">{m.author_name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">
                    {m.user_id === currentUserId ? currentUserName : (m.author_name ?? 'Player')}
                  </p>
                  <p className="break-words">{m.message}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="border-t border-border p-2 flex items-center gap-2">
            <Input
              placeholder="Type a message…"
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendChat() } }}
              maxLength={500}
            />
            <Button size="sm" onClick={handleSendChat} disabled={actionPending || !chatMsg.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Wild color picker */}
      <Dialog open={!!pendingWild} onOpenChange={(v) => { if (!v) setPendingWild(null) }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Pick a color</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(['red', 'yellow', 'green', 'blue'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`h-16 rounded-lg ${COLOR_DOT[c]} font-semibold text-white shadow-md`}
                onClick={() => {
                  const card = pendingWild
                  setPendingWild(null)
                  if (card) handlePlay(card, c)
                }}
              >
                {c.toUpperCase()}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function humanizeError(code: string): string {
  switch (code) {
    case 'not_your_turn': return 'It is not your turn'
    case 'illegal_move': return 'That card cannot be played here'
    case 'must_draw_pending': return 'You must draw the pending cards first'
    case 'color_required': return 'Pick a color for the wild card'
    case 'card_not_in_hand': return 'Card not in your hand'
    case 'not_in_game': return 'You are not seated in this game'
    case 'not_playing': return 'Game is not in progress'
    default: return code
  }
}
