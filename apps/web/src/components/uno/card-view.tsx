'use client'

import type { Card } from '@/lib/uno/types'

const COLOR_CLASS: Record<string, { bg: string; inner: string; text: string; border: string }> = {
  red:    { bg: 'bg-red-600',     inner: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-700' },
  yellow: { bg: 'bg-yellow-400',  inner: 'bg-yellow-50',  text: 'text-yellow-600',  border: 'border-yellow-500' },
  green:  { bg: 'bg-emerald-600', inner: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-700' },
  blue:   { bg: 'bg-blue-600',    inner: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-700' },
  wild:   { bg: 'bg-zinc-800',    inner: 'bg-zinc-900',   text: 'text-white',       border: 'border-zinc-600' },
}

function valueLabel(v: Card['value']): string {
  switch (v) {
    case 'skip':    return '🚫'
    case 'reverse': return '🔄'
    case 'draw2':   return '+2'
    case 'wild':    return '🌈'
    case 'wild4':   return '+4'
    default:        return v
  }
}

interface CardViewProps {
  card: Card | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  faceDown?: boolean
  selected?: boolean
  playable?: boolean
  onClick?: () => void
  disabled?: boolean
  style?: React.CSSProperties
  className?: string
}

export function CardView({ card, size = 'md', faceDown, selected, playable, onClick, disabled, style, className = '' }: CardViewProps) {
  const dims: Record<string, string> = {
    xs: 'w-8 h-12',
    sm: 'w-12 h-16',
    md: 'w-16 h-24',
    lg: 'w-20 h-28',
  }
  const txtSize: Record<string, string> = { xs: 'text-[10px]', sm: 'text-xs', md: 'text-xl', lg: 'text-2xl' }
  const sizeClass = dims[size] ?? dims.md!
  const txtClass  = txtSize[size] ?? txtSize.md!

  if (faceDown || !card) {
    return (
      <div
        style={style}
        className={`${sizeClass} shrink-0 rounded-xl border-2 border-zinc-600 bg-zinc-900 shadow-lg flex items-center justify-center select-none ${className}`}
      >
        <div className="w-[calc(100%-10px)] h-[calc(100%-10px)] rounded-lg border-2 border-red-600/50 flex items-center justify-center">
          <span className="text-[9px] font-black tracking-widest text-red-500 rotate-[-8deg] inline-block">UNO</span>
        </div>
      </div>
    )
  }

  const c = COLOR_CLASS[card.color] ?? COLOR_CLASS.red!
  const interactive = playable && onClick && !disabled
  const isWild = card.color === 'wild'
  const label = valueLabel(card.value)

  return (
    <button
      type="button"
      onClick={interactive ? onClick : undefined}
      disabled={disabled}
      style={style}
      className={[
        sizeClass, 'shrink-0 rounded-xl select-none relative shadow-lg',
        'border-2', c.border, c.bg,
        'transition-all duration-150',
        selected    ? '-translate-y-5 ring-2 ring-white/90 shadow-2xl scale-105' : '',
        interactive ? 'hover:-translate-y-4 hover:scale-105 hover:shadow-2xl cursor-pointer' : 'cursor-default',
        disabled    ? 'opacity-50 grayscale' : '',
        className,
      ].filter(Boolean).join(' ')}
      aria-label={`${card.color} ${card.value}`}
    >
      {isWild ? (
        <div className="absolute inset-[6px] rounded-lg overflow-hidden">
          <div className="absolute inset-0 bg-red-500" style={{ clipPath: 'polygon(0 0,50% 0,50% 50%,0 50%)' }} />
          <div className="absolute inset-0 bg-yellow-400" style={{ clipPath: 'polygon(50% 0,100% 0,100% 50%,50% 50%)' }} />
          <div className="absolute inset-0 bg-blue-600" style={{ clipPath: 'polygon(0 50%,50% 50%,50% 100%,0 100%)' }} />
          <div className="absolute inset-0 bg-emerald-600" style={{ clipPath: 'polygon(50% 50%,100% 50%,100% 100%,50% 100%)' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`${txtClass} font-black text-white drop-shadow`}>{label}</span>
          </div>
        </div>
      ) : (
        <div className={`absolute inset-[6px] rounded-lg ${c.inner} flex items-center justify-center`}>
          <span className={`${txtClass} font-black ${c.text}`}>{label}</span>
        </div>
      )}
      <span className="absolute top-0.5 left-1 text-[9px] font-black text-white/90 leading-none">{label}</span>
      <span className="absolute bottom-0.5 right-1 text-[9px] font-black text-white/90 leading-none rotate-180">{label}</span>
      {playable && !disabled && !selected && (
        <div className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/50" />
      )}
    </button>
  )
}

export function FaceDownStack({ count, className = '' }: { count: number; className?: string }) {
  const layers = Math.min(count, 4)
  return (
    <div className={`relative ${className}`} style={{ width: 80 + layers * 3, height: 112 }}>
      {Array.from({ length: layers }).map((_, i) => (
        <div
          key={i}
          className="absolute w-20 h-28 rounded-xl border-2 border-zinc-600 bg-zinc-900 shadow"
          style={{ left: i * 3, top: -i * 2, zIndex: i }}
        >
          <div className="w-full h-full rounded-xl flex items-center justify-center">
            <div className="w-[calc(100%-10px)] h-[calc(100%-10px)] rounded-md border-2 border-red-600/50 flex items-center justify-center">
              <span className="text-[9px] font-black tracking-widest text-red-500 rotate-[-8deg] inline-block">UNO</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
