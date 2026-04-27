'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Check, Copy, LogOut, Play, Send, Trophy } from 'lucide-react'
import {
  Avatar, AvatarFallback, AvatarImage,
  Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@planningo/ui'
import { getSupabaseClient } from '@/lib/supabase/client'
import { drawUnoCard, leaveUnoRoom, playUnoCard, sendUnoChat, startUnoGame } from '@/lib/actions/uno'
import { CardView, FaceDownStack } from './card-view'
import type { Card as UnoCard, CardColor, ClientView } from '@/lib/uno/types'

interface PlayerRow {
  id: string
  user_id: string
  seat: number
  left_at: string | null
  profile?: { id: string; full_name: string | null; avatar_url: string | null } | null
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

const COLOR_RING: Record<string, string> = {
  red: 'ring-red-500 bg-red-500',
  yellow: 'ring-yellow-400 bg-yellow-400',
  green: 'ring-emerald-500 bg-emerald-500',
  blue: 'ring-blue-500 bg-blue-500',
}

const COLOR_GLOW: Record<string, string> = {
  red: 'shadow-[0_0_32px_8px_rgba(239,68,68,0.35)]',
  yellow: 'shadow-[0_0_32px_8px_rgba(250,204,21,0.35)]',
  green: 'shadow-[0_0_32px_8px_rgba(16,185,129,0.35)]',
  blue: 'shadow-[0_0_32px_8px_rgba(59,130,246,0.35)]',
}

// Positions around the oval table for up to 8 seats.
// Returned as CSS top/left percentages relative to the table container.
function seatPosition(seat: number, total: number, mySeat: number): { top: string; left: string; labelSide: 'top' | 'bottom' } {
  // Rotate so MY seat is always at the bottom-centre.
  const offset = mySeat ?? 0
  const normalised = ((seat - offset) + total) % total
  // Place seats evenly around an ellipse. My seat (0) is at 270Â° (bottom).
  const angleDeg = 270 + (normalised / total) * 360
  const rad = (angleDeg * Math.PI) / 180
  // Semi-axes (% of container). Wider than tall.
  const rx = 42, ry = 35
  const cx = 50, cy = 50
  const x = cx + rx * Math.cos(rad)
  const y = cy + ry * Math.sin(rad)
  return {
    top: `${y.toFixed(1)}%`,
    left: `${x.toFixed(1)}%`,
    labelSide: y > 50 ? 'bottom' : 'top',
  }
}

export function UnoRoomClient({ roomId, code, hostId, maxPlayers, currentUserId, currentUserName }: Props) {
  const router = useRouter()
  const supabase = getSupabaseClient() // singleton â€” safe outside useMemo
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [chat, setChat] = useState<ChatRow[]>([])
  const [view, setView] = useState<ClientView | null>(null)
  const [roomStatus, setRoomStatus] = useState<'waiting' | 'playing' | 'ended'>('waiting')
  const [winnerId, setWinnerId] = useState<string | null>(null)
  const [chatMsg, setChatMsg] = useState('')
  const [pendingWild, setPendingWild] = useState<UnoCard | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [acting, setActing] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  const isHost = currentUserId === hostId

  // â”€â”€â”€ loaders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const loadPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('uno_players')
      .select('id, user_id, seat, left_at, profile:profiles!uno_players_user_id_fkey(id, full_name, avatar_url)')
      .eq('room_id', roomId)
      .order('seat', { ascending: true })
    if (data) setPlayers(data as unknown as PlayerRow[])
  }, [roomId, supabase])

  const loadRoom = useCallback(async () => {
    const { data } = await (supabase as any)
      .from('uno_rooms')
      .select('status, winner_id')
      .eq('id', roomId)
      .single()
    if (data) {
      setRoomStatus(data.status as 'waiting' | 'playing' | 'ended')
      setWinnerId(data.winner_id as string ?? null)
    }
  }, [roomId, supabase])

  const loadView = useCallback(async () => {
    const { data } = await (supabase as any).rpc('uno_get_view', { p_room_id: roomId })
    setView(data ? (data as unknown as ClientView) : null)
  }, [roomId, supabase])

  const loadChat = useCallback(async () => {
    const { data } = await supabase
      .from('uno_chat')
      .select('id, user_id, message, created_at, author:profiles!uno_chat_user_id_fkey(full_name, avatar_url)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(200)
    if (!data) return
    setChat(data.map((r: any) => ({
      id: r.id,
      user_id: r.user_id,
      message: r.message,
      created_at: r.created_at,
      author_name: r.author?.full_name ?? null,
      author_avatar: r.author?.avatar_url ?? null,
    })))
  }, [roomId, supabase])

  // â”€â”€â”€ initial load â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  useEffect(() => {
    loadPlayers()
    loadRoom()
    loadView()
    loadChat()
  }, [loadPlayers, loadRoom, loadView, loadChat])

  // â”€â”€â”€ realtime â€” single stable channel, never recreated â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    // Remove old channel if any
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const ch = supabase
      .channel(`uno-room-${roomId}`, { config: { broadcast: { self: true } } })
      // Player joins/leaves
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'uno_players', filter: `room_id=eq.${roomId}`,
      }, () => loadPlayers())
      // Room status changes (start / end)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'uno_rooms', filter: `id=eq.${roomId}`,
      }, () => { loadRoom(); loadView() })
      // Game events (every card play, draw, etc.)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'uno_events', filter: `room_id=eq.${roomId}`,
      }, () => { loadView(); loadRoom() })
      // Chat messages
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'uno_chat', filter: `room_id=eq.${roomId}`,
      }, () => loadChat())
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          toast.error('Realtime connection lost â€” trying to reconnectâ€¦')
        }
      })

    channelRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      channelRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]) // only re-subscribe when roomId changes

  // auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat.length])

  // â”€â”€â”€ derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const activePlayers = players.filter((p) => !p.left_at)
  const mySeat = activePlayers.find((p) => p.user_id === currentUserId)?.seat ?? 0
  const seatMap = Object.fromEntries(activePlayers.map((p) => [p.seat, p])) as Record<number, PlayerRow>
  const isMyTurn = view !== null && view.currentSeat === mySeat && roomStatus === 'playing'

  // â”€â”€â”€ canPlay helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  function canPlayCard(card: UnoCard): boolean {
    if (!isMyTurn || !view || view.pendingDraw > 0) return false
    if (card.color === 'wild') return true
    const top = view.discardTop
    if (!top) return true
    return card.color === view.currentColor || top.value === card.value
  }

  // â”€â”€â”€ actions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  function copyCode() {
    navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }

  async function handleStart() {
    setActing(true)
    const r = await startUnoGame(roomId)
    setActing(false)
    if (r.error) toast.error(r.error)
  }

  async function handleLeave() {
    await leaveUnoRoom(roomId)
    router.push('/games/uno')
  }

  async function handleDraw() {
    if (!isMyTurn) { toast.error('Not your turn'); return }
    setActing(true)
    const r = await drawUnoCard(roomId)
    setActing(false)
    if (r.error) toast.error(humanizeError(r.error))
  }

  function handleCardTap(card: UnoCard) {
    if (!isMyTurn) { toast.error('Not your turn'); return }
    if (!canPlayCard(card)) { toast.error('Cannot play that card now'); return }
    if (selectedCardId === card.id) {
      // Second tap â†’ confirm play
      if (card.value === 'wild' || card.value === 'wild4') {
        setPendingWild(card)
        setSelectedCardId(null)
      } else {
        doPlay(card)
      }
    } else {
      setSelectedCardId(card.id)
    }
  }

  async function doPlay(card: UnoCard, chosenColor?: CardColor) {
    setSelectedCardId(null)
    setPendingWild(null)
    setActing(true)
    const r = await playUnoCard({
      roomId, cardId: card.id,
      ...(chosenColor ? { chosenColor: chosenColor as 'red' | 'yellow' | 'green' | 'blue' } : {}),
    })
    setActing(false)
    if (r.error) toast.error(humanizeError(r.error))
  }

  async function handleSendChat() {
    const msg = chatMsg.trim()
    if (!msg) return
    setChatMsg('')
    const r = await sendUnoChat(roomId, msg)
    if (r.error) toast.error(r.error)
  }

  // â”€â”€â”€ render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const activeColor = view?.currentColor ?? 'red'
  const glow = COLOR_GLOW[activeColor] ?? ''
  const colorDot = COLOR_RING[activeColor] ?? ''

  return (
    <div className="flex flex-col gap-0 h-full min-h-[calc(100vh-80px)]" style={{ background: 'radial-gradient(ellipse at 50% 40%, #1a2a1a 0%, #0d1117 100%)' }}>

      {/* â”€â”€ Header bar â”€â”€ */}
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-white/10 bg-black/40 backdrop-blur shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-white/70 hover:text-white">
            <Link href="/games/uno"><ArrowLeft className="mr-1 h-4 w-4" /> Lobby</Link>
          </Button>
          <div>
            <span className="font-mono text-sm font-semibold tracking-widest text-white">{code}</span>
            <span className="ml-2 text-xs text-white/50">{activePlayers.length}/{maxPlayers} Â· {roomStatus}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyCode} className="gap-1.5 border-white/20 text-white/80 hover:text-white hover:bg-white/10">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline text-xs">{copied ? 'Copied' : 'Share'}</span>
          </Button>
          {roomStatus === 'waiting' && isHost && (
            <Button size="sm" disabled={acting || activePlayers.length < 2} onClick={handleStart} className="gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white">
              <Play className="h-3.5 w-3.5" /> Start
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={handleLeave} className="gap-1.5 text-white/60 hover:text-red-400 hover:bg-red-400/10">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* â”€â”€ Main layout: table + chat â”€â”€ */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* â”€â”€ Game area â”€â”€ */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">

          {/* Oval table */}
          <div className="relative flex-1 min-h-0">
            <div className="absolute inset-4 sm:inset-8">

              {/* Green felt table */}
              <div
                className={`absolute inset-0 rounded-[50%] border-4 border-emerald-900 transition-shadow duration-700 ${glow}`}
                style={{ background: 'radial-gradient(ellipse at 50% 50%, #16531a 0%, #0f3d12 60%, #0a2d0d 100%)' }}
              />

              {/* Player seats around the table */}
              {Array.from({ length: maxPlayers }).map((_, seat) => {
                const pos = seatPosition(seat, maxPlayers, mySeat)
                const player = seatMap[seat]
                const isTurn = view?.currentSeat === seat && roomStatus === 'playing'
                const isMe = player?.user_id === currentUserId
                const hc = player && view ? (view.handCounts[player.user_id] ?? 0) : 0

                return (
                  <div
                    key={seat}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10"
                    style={{ top: pos.top, left: pos.left }}
                  >
                    {/* Turn indicator arc above/below avatar */}
                    {isTurn && (
                      <div className={`absolute inset-[-6px] rounded-full ring-2 ring-primary animate-pulse`} />
                    )}
                    <div className={`relative rounded-full p-0.5 ${isTurn ? 'ring-2 ring-primary' : 'ring-1 ring-white/20'}`}>
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                        <AvatarImage src={player?.profile?.avatar_url ?? undefined} />
                        <AvatarFallback className={`text-sm font-bold ${isTurn ? 'bg-primary text-primary-foreground' : 'bg-zinc-700 text-white'}`}>
                          {player?.profile?.full_name?.[0] ?? seat + 1}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className={`text-center ${pos.labelSide === 'bottom' ? 'mt-0.5' : ''}`}>
                      <p className="text-[10px] font-semibold text-white/90 max-w-[64px] truncate leading-tight">
                        {player?.profile?.full_name ?? (player ? 'Player' : `Seat ${seat + 1}`)}
                        {isMe && <span className="text-primary ml-0.5">â˜…</span>}
                      </p>
                      {hc > 0 && (
                        <p className={`text-[9px] font-mono ${hc === 1 ? 'text-red-400 font-bold animate-pulse' : 'text-white/50'}`}>
                          {hc === 1 ? 'UNO! ðŸ”¥' : `${hc} cards`}
                        </p>
                      )}
                      {!player && (
                        <p className="text-[9px] text-white/25">empty</p>
                      )}
                    </div>
                    {/* Mini face-down fan for opponents */}
                    {!isMe && player && roomStatus === 'playing' && hc > 0 && (
                      <div className="flex mt-0.5">
                        {Array.from({ length: Math.min(hc, 5) }).map((_, i) => (
                          <div key={i} className="w-4 h-6 rounded border border-zinc-500 bg-zinc-800 -ml-1.5 first:ml-0 shadow" style={{ transform: `rotate(${(i - Math.min(hc, 5) / 2) * 6}deg)` }}>
                            <div className="w-full h-full rounded flex items-center justify-center">
                              <span className="text-[5px] font-black text-red-600 rotate-[-8deg]">U</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {isTurn && !isMe && (
                      <span className="mt-0.5 rounded-full bg-primary/90 px-2 py-0.5 text-[9px] font-bold text-primary-foreground">TURN</span>
                    )}
                  </div>
                )
              })}

              {/* â”€â”€ Centre: piles + info â”€â”€ */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">

                {roomStatus === 'waiting' ? (
                  <div className="text-center pointer-events-auto">
                    <p className="text-white/70 text-sm">Waiting for playersâ€¦</p>
                    <p className="text-white/40 text-xs mt-1">Code: <span className="font-mono font-bold text-white/80">{code}</span></p>
                    {isHost && activePlayers.length >= 2 && (
                      <Button size="sm" onClick={handleStart} disabled={acting} className="mt-3 bg-emerald-600 hover:bg-emerald-500 text-white gap-2">
                        <Play className="h-3.5 w-3.5" /> Start Game
                      </Button>
                    )}
                  </div>
                ) : roomStatus === 'ended' ? (
                  <div className="text-center pointer-events-auto">
                    <Trophy className="h-10 w-10 text-amber-400 mx-auto mb-2" />
                    <p className="text-white font-bold text-lg">
                      {winnerId === currentUserId ? 'You won! ðŸŽ‰' : `${activePlayers.find(p => p.user_id === winnerId)?.profile?.full_name ?? 'A player'} wins!`}
                    </p>
                    <Button size="sm" asChild variant="outline" className="mt-3 border-white/30 text-white hover:bg-white/10">
                      <Link href="/games/uno">Back to Lobby</Link>
                    </Button>
                  </div>
                ) : view ? (
                  <>
                    {/* Active color indicator */}
                    <div className="flex items-center gap-2 pointer-events-none">
                      <div className={`h-4 w-4 rounded-full ring-2 ring-white/80 ${colorDot}`} />
                      {view.pendingDraw > 0 && (
                        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-zinc-900 animate-bounce">+{view.pendingDraw} DRAW</span>
                      )}
                    </div>
                    {/* Draw + discard piles */}
                    <div className="flex items-end gap-4 sm:gap-6 pointer-events-auto">
                      <div className="flex flex-col items-center gap-1">
                        <FaceDownStack count={view.deckCount} />
                        {isMyTurn && (
                          <button
                            type="button"
                            onClick={handleDraw}
                            disabled={acting}
                            className="mt-1 text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                          >
                            TAP TO DRAW
                          </button>
                        )}
                        <span className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">{view.deckCount} left</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        {view.discardTop ? (
                          <CardView card={view.discardTop} size="lg" />
                        ) : (
                          <div className="w-20 h-28 rounded-xl border-2 border-dashed border-white/20" />
                        )}
                        <span className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">discard</span>
                      </div>
                    </div>
                    {/* Turn label */}
                    <div className="text-center">
                      {isMyTurn ? (
                        <p className="text-sm font-bold text-primary animate-pulse">Your turn â€” tap a card or draw</p>
                      ) : (
                        <p className="text-xs text-white/50">
                          {activePlayers.find(p => p.seat === view.currentSeat)?.profile?.full_name ?? 'Opponent'}&apos;s turn
                        </p>
                      )}
                      <p className="text-[10px] text-white/30 mt-0.5">Direction {view.direction === 1 ? 'â†’' : 'â†'}</p>
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          {/* â”€â”€ My hand (below table) â”€â”€ */}
          {roomStatus === 'playing' && view && (
            <div className="shrink-0 px-3 py-2 border-t border-white/10 bg-black/50 backdrop-blur">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                  Your hand ({view.myHand.length})
                  {view.myHand.length === 1 && <span className="ml-2 text-red-400 font-bold animate-pulse">UNO! ðŸ”¥</span>}
                </span>
                {isMyTurn && selectedCardId && (
                  <span className="text-[10px] text-primary/80">Tap again to play Â· tap another to select</span>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 snap-x snap-mandatory">
                {view.myHand.map((card) => {
                  const playable = canPlayCard(card)
                  const selected = selectedCardId === card.id
                  return (
                    <CardView
                      key={card.id}
                      card={card}
                      size="md"
                      playable={playable && isMyTurn}
                      selected={selected}
                      disabled={!isMyTurn || acting}
                      onClick={() => handleCardTap(card)}
                      className="snap-center"
                    />
                  )
                })}
                {view.myHand.length === 0 && (
                  <p className="text-sm text-white/40 py-2">No cards â€” you won!</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* â”€â”€ Chat sidebar â”€â”€ */}
        <div className="hidden sm:flex w-72 flex-col border-l border-white/10 bg-black/40 backdrop-blur shrink-0">
          <div className="px-3 py-2 border-b border-white/10 text-[10px] font-semibold uppercase tracking-wider text-white/50">Chat</div>
          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
            {chat.length === 0 && (
              <p className="text-center text-xs text-white/30 py-6">No messages yet.</p>
            )}
            {chat.map((m) => (
              <div key={m.id} className="flex items-start gap-2">
                <Avatar className="h-5 w-5 shrink-0 mt-0.5">
                  <AvatarImage src={m.author_avatar ?? undefined} />
                  <AvatarFallback className="text-[8px] bg-zinc-700 text-white">{m.author_name?.[0] ?? '?'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/40 leading-none mb-0.5">
                    {m.user_id === currentUserId ? currentUserName : (m.author_name ?? 'Player')}
                  </p>
                  <p className="text-xs text-white/80 break-words">{m.message}</p>
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-white/10 flex gap-1.5">
            <Input
              placeholder="Messageâ€¦"
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSendChat() } }}
              maxLength={500}
              className="bg-white/5 border-white/20 text-white placeholder:text-white/30 text-sm h-8"
            />
            <Button size="sm" onClick={handleSendChat} disabled={!chatMsg.trim()} className="h-8 w-8 p-0 shrink-0">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* â”€â”€ Wild colour picker â”€â”€ */}
      <Dialog open={!!pendingWild} onOpenChange={(v) => { if (!v) { setPendingWild(null) } }}>
        <DialogContent className="max-w-xs bg-zinc-900 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white">Choose a colour</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {(['red', 'yellow', 'green', 'blue'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={[
                  'h-16 rounded-xl font-bold text-white text-base capitalize shadow-lg transition-transform hover:scale-105 active:scale-95',
                  c === 'red' ? 'bg-red-600 hover:bg-red-500' : '',
                  c === 'yellow' ? 'bg-yellow-400 hover:bg-yellow-300 text-zinc-900' : '',
                  c === 'green' ? 'bg-emerald-600 hover:bg-emerald-500' : '',
                  c === 'blue' ? 'bg-blue-600 hover:bg-blue-500' : '',
                ].join(' ')}
                onClick={() => pendingWild && doPlay(pendingWild, c)}
              >
                {c}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function humanizeError(code: string): string {
  const m: Record<string, string> = {
    not_your_turn: 'Not your turn',
    illegal_move: 'That card cannot be played here',
    must_draw_pending: 'You must draw first',
    color_required: 'Pick a colour for the wild card',
    card_not_in_hand: 'Card not in your hand',
    not_in_game: 'You are not seated in this game',
    not_playing: 'Game is not in progress',
    version_conflict: 'Move conflict â€” please try again',
  }
  return m[code] ?? code
}
