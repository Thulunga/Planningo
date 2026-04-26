// Shared UNO types — used by both server engine and client UI.

export type CardColor = 'red' | 'yellow' | 'green' | 'blue' | 'wild'

export type CardValue =
  | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
  | 'skip' | 'reverse' | 'draw2'
  | 'wild' | 'wild4'

export interface Card {
  id: string
  color: CardColor
  value: CardValue
}

export type GameStatus = 'playing' | 'ended'

// Authoritative server-side state. Persisted in uno_state.state jsonb.
export interface FullState {
  status: GameStatus
  // seat order is the array index in `seats`
  seats: string[]              // user_ids in seat order
  hands: Record<string, Card[]> // keyed by user_id
  deck: Card[]
  discard: Card[]              // top of pile is last element
  currentSeat: number
  direction: 1 | -1
  currentColor: Exclude<CardColor, 'wild'>  // active color (for wilds)
  pendingDraw: number          // accumulated draws to apply to next player
  winnerSeat: number | null
  lastAction: LastAction | null
  startedAt: string
}

export type LastAction =
  | { kind: 'PLAY'; seat: number; userId: string; card: Card; chosenColor?: CardColor }
  | { kind: 'DRAW'; seat: number; userId: string; count: number }
  | { kind: 'PASS'; seat: number; userId: string }
  | { kind: 'START'; dealerSeat: number }

// Sanitized view returned to clients via the uno_get_view RPC.
export interface ClientView {
  status: GameStatus
  currentSeat: number
  direction: 1 | -1
  currentColor: Exclude<CardColor, 'wild'>
  pendingDraw: number
  discardTop: Card | null
  deckCount: number
  winnerSeat: number | null
  lastAction: LastAction | null
  handCounts: Record<string, number> // keyed by user_id
  myHand: Card[]
  version: number
}
