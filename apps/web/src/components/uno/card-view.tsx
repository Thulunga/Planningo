'use client'

import type { Card } from '@/lib/uno/types'

const COLOR_BG: Record<string, string> = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-400',
  green: 'bg-emerald-500',
  blue: 'bg-blue-500',
  wild: 'bg-gradient-to-br from-red-500 via-yellow-400 to-blue-500',
}

const COLOR_TEXT: Record<string, string> = {
  red: 'text-red-600',
  yellow: 'text-yellow-500',
  green: 'text-emerald-600',
  blue: 'text-blue-600',
  wild: 'text-zinc-900',
}

function valueLabel(v: Card['value']): string {
  switch (v) {
    case 'skip': return 'Ø'
    case 'reverse': return '⇄'
    case 'draw2': return '+2'
    case 'wild': return 'W'
    case 'wild4': return '+4'
    default: return v
  }
}

interface CardViewProps {
  card: Card | null
  size?: 'sm' | 'md' | 'lg'
  faceDown?: boolean
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}

export function CardView({ card, size = 'md', faceDown, selected, onClick, disabled }: CardViewProps) {
  const dims =
    size === 'lg' ? 'h-32 w-22 text-3xl'
    : size === 'sm' ? 'h-16 w-12 text-base'
    : 'h-24 w-16 text-2xl'

  if (faceDown || !card) {
    return (
      <div
        className={`relative ${dims} shrink-0 rounded-lg border-2 border-white/70 bg-zinc-800 shadow-md ` +
          'flex items-center justify-center'}
      >
        <span className="text-base font-black tracking-wider text-red-500" style={{ transform: 'rotate(-12deg)' }}>UNO</span>
      </div>
    )
  }

  const bg = COLOR_BG[card.color] ?? 'bg-zinc-700'
  const text = COLOR_TEXT[card.color] ?? 'text-white'
  const interactive = onClick && !disabled

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      className={`relative ${dims} shrink-0 rounded-lg border-2 border-white/80 ${bg} shadow-md ` +
        'flex items-center justify-center transition-transform ' +
        (selected ? '-translate-y-3 ring-2 ring-primary ' : '') +
        (interactive ? 'hover:-translate-y-2 cursor-pointer ' : 'cursor-default ') +
        (disabled ? 'opacity-60 ' : '')
      }
      aria-label={`${card.color} ${card.value}`}
    >
      <div className="absolute inset-1 rounded-md bg-white/85 flex items-center justify-center">
        <span className={`font-black ${text}`}>{valueLabel(card.value)}</span>
      </div>
      <span className={`absolute top-0.5 left-1 text-[10px] font-bold ${text}`}>{valueLabel(card.value)}</span>
      <span className={`absolute bottom-0.5 right-1 text-[10px] font-bold ${text}`}>{valueLabel(card.value)}</span>
    </button>
  )
}
