import type { Card, CardColor, CardValue } from './types'

const COLORS: Exclude<CardColor, 'wild'>[] = ['red', 'yellow', 'green', 'blue']

let cardSeq = 0
function makeId(): string {
  cardSeq += 1
  return `c_${Date.now().toString(36)}_${cardSeq.toString(36)}`
}

/**
 * Build a standard 108-card UNO deck.
 *  - Each color: one 0, two each of 1-9, two skip, two reverse, two draw2 → 25 each (×4 = 100)
 *  - 4 wild + 4 wild4
 */
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const color of COLORS) {
    deck.push({ id: makeId(), color, value: '0' })
    const numbered: CardValue[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
    for (const v of numbered) {
      deck.push({ id: makeId(), color, value: v })
      deck.push({ id: makeId(), color, value: v })
    }
    for (const v of ['skip', 'reverse', 'draw2'] as CardValue[]) {
      deck.push({ id: makeId(), color, value: v })
      deck.push({ id: makeId(), color, value: v })
    }
  }
  for (let i = 0; i < 4; i += 1) {
    deck.push({ id: makeId(), color: 'wild', value: 'wild' })
    deck.push({ id: makeId(), color: 'wild', value: 'wild4' })
  }
  return deck
}

/** Fisher–Yates shuffle. Mutates the array in-place and returns it. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = arr[i] as T
    arr[i] = arr[j] as T
    arr[j] = tmp
  }
  return arr
}

/** Return true if `played` is legal on top of `top` for the given active color. */
export function canPlay(played: Card, top: Card | null, activeColor: CardColor): boolean {
  if (played.color === 'wild') return true
  if (!top) return true
  if (played.color === activeColor) return true
  if (top.value === played.value) return true
  return false
}
