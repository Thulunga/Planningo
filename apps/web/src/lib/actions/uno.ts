'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient } from '@planningo/database'
import { drawCard as engineDraw, playCard as enginePlay, startGame, UnoError } from '@/lib/uno/engine'
import type { FullState } from '@/lib/uno/types'

// ── helpers ─────────────────────────────────────────────────────────────────

function admin() {
  return createSupabaseServiceClient()
}

function genCode(): string {
  // 6-char A-Z 2-9 (no I/O/0/1 to reduce confusion)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

async function authedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function loadFullState(roomId: string): Promise<{ state: FullState; version: number } | null> {
  const sv = admin()
  const { data, error } = await sv.rpc('uno_get_full_state', { p_room_id: roomId })
  if (error || !data) return null
  const obj = data as { state: FullState; version: number }
  return { state: obj.state, version: obj.version }
}

async function applyState(args: {
  roomId: string
  expectedVersion: number
  newState: FullState
  eventKind: string
  actorId: string | null
  payload: Record<string, unknown>
}): Promise<{ error?: string; version?: number }> {
  const sv = admin()
  const { data, error } = await sv.rpc('uno_apply', {
    p_room_id: args.roomId,
    p_expected_version: args.expectedVersion,
    p_new_state: args.newState as unknown as Record<string, unknown>,
    p_event_kind: args.eventKind,
    p_event_actor: args.actorId,
    p_event_payload: args.payload,
  })
  if (error) return { error: error.message }
  return { version: data as number }
}

// ── actions ─────────────────────────────────────────────────────────────────

export async function createUnoRoom(input: { maxPlayers?: number } = {}) {
  const user = await authedUser()
  if (!user) return { error: 'Not authenticated' }

  const max = Math.min(8, Math.max(2, input.maxPlayers ?? 4))
  const sv = admin()

  // Try a few codes in case of (rare) collision.
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = genCode()
    const { data: room, error } = await sv
      .from('uno_rooms')
      .insert({ code, host_id: user.id, max_players: max })
      .select('id, code')
      .single()
    if (error) {
      if (attempt < 4) continue
      return { error: error.message }
    }

    // Seat the host at seat 0.
    const { error: pErr } = await sv.from('uno_players').insert({
      room_id: room.id, user_id: user.id, seat: 0,
    })
    if (pErr) return { error: pErr.message }

    revalidatePath('/games/uno')
    return { code: room.code, roomId: room.id }
  }
  return { error: 'Could not generate a room code' }
}

const codeSchema = z.string().trim().min(4).max(12).transform((s) => s.toUpperCase())

export async function joinUnoRoom(rawCode: string) {
  const user = await authedUser()
  if (!user) return { error: 'Not authenticated' }
  const code = codeSchema.safeParse(rawCode)
  if (!code.success) return { error: 'Invalid code' }

  const sv = admin()
  const { data: room } = await sv
    .from('uno_rooms')
    .select('id, status, max_players')
    .eq('code', code.data)
    .single()
  if (!room) return { error: 'Room not found' }
  if (room.status === 'ended') return { error: 'Game has ended' }

  const { data: existing } = await sv
    .from('uno_players')
    .select('id, seat, left_at')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    if (existing.left_at) {
      await sv.from('uno_players').update({ left_at: null }).eq('id', existing.id)
    }
    return { code: code.data, roomId: room.id }
  }

  if (room.status !== 'waiting') return { error: 'Game already in progress' }

  const { data: seated } = await sv
    .from('uno_players')
    .select('seat')
    .eq('room_id', room.id)
    .is('left_at', null)
    .order('seat', { ascending: true })

  const taken = new Set((seated ?? []).map((p) => p.seat as number))
  if (taken.size >= room.max_players) return { error: 'Room is full' }

  let seat = 0
  while (taken.has(seat)) seat += 1

  const { error: insErr } = await sv.from('uno_players').insert({
    room_id: room.id, user_id: user.id, seat,
  })
  if (insErr) return { error: insErr.message }

  return { code: code.data, roomId: room.id }
}

export async function leaveUnoRoom(roomId: string) {
  const user = await authedUser()
  if (!user) return { error: 'Not authenticated' }
  const sv = admin()
  await sv
    .from('uno_players')
    .update({ left_at: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', user.id)
  return { success: true }
}

export async function startUnoGame(roomId: string) {
  const user = await authedUser()
  if (!user) return { error: 'Not authenticated' }
  const sv = admin()

  const { data: room } = await sv
    .from('uno_rooms')
    .select('id, host_id, status')
    .eq('id', roomId)
    .single()
  if (!room) return { error: 'Room not found' }
  if (room.host_id !== user.id) return { error: 'Only the host can start the game' }
  if (room.status !== 'waiting') return { error: 'Game already started' }

  const { data: players } = await sv
    .from('uno_players')
    .select('user_id, seat')
    .eq('room_id', roomId)
    .is('left_at', null)
    .order('seat', { ascending: true })

  const seats = (players ?? []).map((p) => p.user_id as string)
  if (seats.length < 2) return { error: 'Need at least 2 players' }

  let initial: FullState
  try {
    initial = startGame(seats)
  } catch (e) {
    return { error: e instanceof UnoError ? e.code : 'failed_to_start' }
  }

  // Insert state row and flip room status atomically (best effort).
  const { error: stateErr } = await sv
    .from('uno_state')
    .upsert({ room_id: roomId, state: initial as unknown as Record<string, unknown>, version: 1 })
  if (stateErr) return { error: stateErr.message }

  const { error: roomErr } = await sv
    .from('uno_rooms')
    .update({ status: 'playing', started_at: new Date().toISOString() })
    .eq('id', roomId)
  if (roomErr) return { error: roomErr.message }

  // Insert a START event so all clients refetch.
  await sv.from('uno_events').insert({
    room_id: roomId, kind: 'START', actor_id: user.id, payload: {},
  })

  return { success: true }
}

const playSchema = z.object({
  roomId: z.string().uuid(),
  cardId: z.string().min(1),
  chosenColor: z.enum(['red', 'yellow', 'green', 'blue']).optional(),
})

export async function playUnoCard(input: z.infer<typeof playSchema>) {
  const user = await authedUser()
  if (!user) return { error: 'Not authenticated' }
  const parsed = playSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  // Up to 2 attempts to handle optimistic version conflicts.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const loaded = await loadFullState(parsed.data.roomId)
    if (!loaded) return { error: 'Game not started' }
    let next: FullState
    try {
      next = enginePlay(structuredClone(loaded.state), {
        userId: user.id,
        cardId: parsed.data.cardId,
        ...(parsed.data.chosenColor ? { chosenColor: parsed.data.chosenColor } : {}),
      })
    } catch (e) {
      return { error: e instanceof UnoError ? e.code : 'illegal_move' }
    }

    const result = await applyState({
      roomId: parsed.data.roomId,
      expectedVersion: loaded.version,
      newState: next,
      eventKind: 'PLAY_CARD',
      actorId: user.id,
      payload: {
        cardId: parsed.data.cardId,
        ...(parsed.data.chosenColor ? { chosenColor: parsed.data.chosenColor } : {}),
      },
    })
    if (result.error?.includes('version_conflict')) continue
    if (result.error) return { error: result.error }

    if (next.status === 'ended') {
      const sv = admin()
      const winnerUserId = next.seats[next.winnerSeat ?? 0]
      await sv
        .from('uno_rooms')
        .update({
          status: 'ended',
          ended_at: new Date().toISOString(),
          winner_id: winnerUserId,
        })
        .eq('id', parsed.data.roomId)
      await sv.from('uno_events').insert({
        room_id: parsed.data.roomId,
        kind: 'GAME_END',
        actor_id: user.id,
        payload: { winnerUserId, winnerSeat: next.winnerSeat },
      })
    }
    return { success: true, version: result.version }
  }
  return { error: 'version_conflict' }
}

export async function drawUnoCard(roomId: string) {
  const user = await authedUser()
  if (!user) return { error: 'Not authenticated' }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const loaded = await loadFullState(roomId)
    if (!loaded) return { error: 'Game not started' }
    let next: FullState
    try {
      next = engineDraw(structuredClone(loaded.state), { userId: user.id })
    } catch (e) {
      return { error: e instanceof UnoError ? e.code : 'illegal_move' }
    }
    const result = await applyState({
      roomId,
      expectedVersion: loaded.version,
      newState: next,
      eventKind: 'DRAW',
      actorId: user.id,
      payload: {},
    })
    if (result.error?.includes('version_conflict')) continue
    if (result.error) return { error: result.error }
    return { success: true }
  }
  return { error: 'version_conflict' }
}

export async function sendUnoChat(roomId: string, message: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const trimmed = message.trim()
  if (!trimmed) return { error: 'Empty message' }
  if (trimmed.length > 500) return { error: 'Message too long' }
  const { error } = await supabase.from('uno_chat').insert({
    room_id: roomId, user_id: user.id, message: trimmed,
  })
  if (error) return { error: error.message }
  return { success: true }
}
