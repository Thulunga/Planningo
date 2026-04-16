'use client'

import { useEffect, useState } from 'react'
import { Clock, TrendingUp, Activity } from 'lucide-react'
import { getMarketInfo, formatDuration, type MarketInfo } from '@/lib/trading/market-hours'
import { cn } from '@planningo/ui'

export function MarketStatusBanner() {
  const [info, setInfo] = useState<MarketInfo>(() => getMarketInfo())

  useEffect(() => {
    // Update every second for the clock display
    const interval = setInterval(() => {
      setInfo(getMarketInfo())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const isOpen = info.status === 'OPEN'
  const isPreOpen = info.status === 'PRE_OPEN'

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border px-4 py-3',
        isOpen
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : isPreOpen
            ? 'border-amber-500/30 bg-amber-500/10'
            : 'border-border bg-muted/30'
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div className="relative flex h-3 w-3 items-center justify-center">
          {isOpen && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={cn(
              'relative inline-flex h-2.5 w-2.5 rounded-full',
              isOpen ? 'bg-emerald-500' : isPreOpen ? 'bg-amber-500' : 'bg-muted-foreground'
            )}
          />
        </div>

        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">
            {isOpen ? 'NSE OPEN' : isPreOpen ? 'PRE-OPEN' : 'MARKET CLOSED'}
          </span>
          <span className="text-muted-foreground text-sm hidden sm:inline">
            · {info.openTime} – {info.closeTime} IST
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        {!isOpen && info.msUntilChange > 0 && (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Opens in {formatDuration(info.msUntilChange)}
          </span>
        )}
        {isOpen && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <Clock className="h-3.5 w-3.5" />
            {formatDuration(info.msUntilChange)} left
          </span>
        )}
        <span className="font-mono text-xs hidden md:inline">{info.currentIST} IST</span>
      </div>
    </div>
  )
}
