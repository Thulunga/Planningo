// Pure UNO game engine. No I/O, no Supabase. Functions take a state and
// return a new state (or throw on illegal moves). Run on the server inside
// authoritative server actions.

import type { Card, CardColor, FullState, LastAction } from './types'
import { canPlay, createDeck, shuffle } from './cards'

export class UnoError extends Error {
  constructor(public code: string, message?: string) {
    super(message ?? code)
    this.name = 'UnoError'
  }
}

const HAND_SIZE = 7

/** Initialise a fresh game from a list of seated user_ids. */
export function startGame(seats: string[]): FullState {
  if (seats.length < 2 || seats.length > 8) {
    throw new UnoError('invalid_seat_count')
  }

  const deck = shuffle(createDeck())
  const hands: Record<string, Card[]> = {}
  for (const userId of seats) hands[userId] = []
  for (let i = 0; i < HAND_SIZE; i += 1) {
    for (const userId of seats) {
      const c = deck.pop()
      if (!c) throw new UnoError('deck_empty_on_deal')
      hands[userId]!.push(c)
    }
  }

  // Flip first card; if wild/wild4, return it and flip again to keep first
  // play simple (common house rule).
  let first = deck.pop()
  while (first && (first.value === 'wild' || first.value === 'wild4')) {
    deck.unshift(first)
    first = deck.pop()
  }
  if (!first) throw new UnoError('no_starter_card')

  const discard: Card[] = [first]
  let currentSeat = 0
  let direction: 1 | -1 = 1
  const currentColor = (first.color === 'wild' ? 'red' : first.color)

  // Apply first-card side effects.
  let pendingDraw = 0
  if (first.value === 'skip') {
    currentSeat = nextSeatIndex(currentSeat, direction, seats.length)
  } else if (first.value === 'reverse') {
    direction = -1
    currentSeat = (seats.length + (currentSeat - 1)) % seats.length
  } else if (first.value === 'draw2') {
    pendingDraw = 2
  }

  return {
    status: 'playing',
    seats,
    hands,
    deck,
    discard,
    currentSeat,
    direction,
    currentColor,
    pendingDraw,
    winnerSeat: null,
    lastAction: { kind: 'START', dealerSeat: 0 },
    startedAt: new Date().toISOString(),
  }
}

function nextSeatIndex(seat: number, dir: 1 | -1, n: number): number {
  return (seat + dir + n) % n
}

/** Re-shuffle the discard (excluding the top) back into the deck if empty. */
function refillDeck(state: FullState): void {
  if (state.deck.length > 0) return
  if (state.discard.length <= 1) return
  const top = state.discard[state.discard.length - 1]!
  const rest = state.discard.slice(0, -1)
  // Reset wild colors when shuffled back into the deck.
  for (const c of rest) {
    if (c.value === 'wild' || c.value === 'wild4') c.color = 'wild'
  }
  state.discard = [top]
  state.deck = shuffle(rest)
}

function drawN(state: FullState, userId: string, n: number): Card[] {
  const drawn: Card[] = []
  for (let i = 0; i < n; i += 1) {
    refillDeck(state)
    const c = state.deck.pop()
    if (!c) break
    drawn.push(c)
  }
  state.hands[userId] = (state.hands[userId] ?? []).concat(drawn)
  return drawn
}

export interface PlayCardArgs {
  userId: string
  cardId: string
  chosenColor?: CardColor // required for wild / wild4
}

export function playCard(state: FullState, args: PlayCardArgs): FullState {
  if (state.status !== 'playing') throw new UnoError('not_playing')

  const seat = state.seats.indexOf(args.userId)
  if (seat === -1) throw new UnoError('not_in_game')
  if (seat !== state.currentSeat) throw new UnoError('not_your_turn')

  // If a draw is pending the player must draw (no stacking in MVP).
  if (state.pendingDraw > 0) throw new UnoError('must_draw_pending')

  const hand = state.hands[args.userId] ?? []
  const idx = hand.findIndex((c) => c.id === args.cardId)
  if (idx === -1) throw new UnoError('card_not_in_hand')
  const card = hand[idx]!

  const top = state.discard[state.discard.length - 1] ?? null
  if (!canPlay(card, top, state.currentColor)) throw new UnoError('illegal_move')

  if ((card.value === 'wild' || card.value === 'wild4')) {
    if (!args.chosenColor || args.chosenColor === 'wild') {
      throw new UnoError('color_required')
    }
  }

  // Remove the card from hand, push to discard.
  hand.splice(idx, 1)
  // For wilds, set the played card's color to the chosen color so the discard
  // pile retains the visual + the active color matches.
  const playedCard: Card = { ...card }
  if (card.value === 'wild' || card.value === 'wild4') {
    playedCard.color = args.chosenColor as Exclude<CardColor, 'wild'>
  }
  state.discard.push(playedCard)
  state.currentColor = (
    card.value === 'wild' || card.value === 'wild4'
      ? (args.chosenColor as Exclude<CardColor, 'wild'>)
      : (card.color as Exclude<CardColor, 'wild'>)
  )

  // Win check (before applying turn advancement).
  if (hand.length === 0) {
    state.status = 'ended'
    state.winnerSeat = seat
    state.lastAction = {
      kind: 'PLAY', seat, userId: args.userId, card: playedCard,
      ...(args.chosenColor ? { chosenColor: args.chosenColor } : {}),
    }
    return state
  }

  // Apply card side-effects + advance turn.
  const n = state.seats.length
  let nextSeat = nextSeatIndex(seat, state.direction, n)

  switch (card.value) {
    case 'skip':
      nextSeat = nextSeatIndex(nextSeat, state.direction, n)
      break
    case 'reverse':
      state.direction = (state.direction === 1 ? -1 : 1)
      // In a 2-player game reverse acts as skip.
      if (n === 2) {
        // re-compute next seat under new direction (skips opponent → back to self)
        nextSeat = seat
        // shift one more so opponent gets skipped
        nextSeat = nextSeatIndex(seat, state.direction, n)
        nextSeat = nextSeatIndex(nextSeat, state.direction, n)
      } else {
        nextSeat = nextSeatIndex(seat, state.direction, n)
      }
      break
    case 'draw2':
      state.pendingDraw = 2
      break
    case 'wild4':
      state.pendingDraw = 4
      break
    default:
      break
  }

  state.currentSeat = nextSeat
  state.lastAction = {
    kind: 'PLAY', seat, userId: args.userId, card: playedCard,
    ...(args.chosenColor ? { chosenColor: args.chosenColor } : {}),
  }

  return state
}

export interface DrawArgs {
  userId: string
}

/**
 * The current player draws. If pendingDraw > 0 they take that many and the
 * turn passes; otherwise they draw exactly one card and the turn passes
 * (MVP: no "play the just-drawn card" option).
 */
export function drawCard(state: FullState, args: DrawArgs): FullState {
  if (state.status !== 'playing') throw new UnoError('not_playing')

  const seat = state.seats.indexOf(args.userId)
  if (seat === -1) throw new UnoError('not_in_game')
  if (seat !== state.currentSeat) throw new UnoError('not_your_turn')

  const n = state.seats.length
  const count = state.pendingDraw > 0 ? state.pendingDraw : 1
  drawN(state, args.userId, count)
  state.pendingDraw = 0

  state.currentSeat = nextSeatIndex(seat, state.direction, n)
  state.lastAction = { kind: 'DRAW', seat, userId: args.userId, count }
  return state
}
