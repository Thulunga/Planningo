'use client'

/**
 * EngineStatus — shows Railway trading engine health in real time.
 * Subscribes to `service_heartbeat` via Supabase Realtime.
 *
 * States:
 *   ONLINE / RUNNING  — engine is alive and scanning
 *   STARTING          — engine just started, waiting for market open
 *   STOPPING          — market close, shutting down gracefully
 *   OFFLINE           — heartbeat older than 2 minutes or no row exists
 */

import { useEffect, useState } from 'react'
import {
  Activity, Cpu, Radio, AlertTriangle, TrendingUp,
  BarChart2, Zap, Clock
} from 'lucide-react'
import { cn } from '@planningo/ui'
import { getSupabaseClient } from '@/lib/supabase/client'

interface Heartbeat {
  status: 'STARTING' | 'RUNNING' | 'STOPPING' | 'OFFLINE'
  last_heartbeat: string
  scan_count: number
  signal_count: number
  symbols_watched: number
  current_symbol: string | null
  engine_version: string | null
  started_at: string
}

type EngineState = 'ONLINE' | 'RUNNING' | 'STARTING' | 'STOPPING' | 'OFFLINE' | 'UNKNOWN'

function getEngineState(hb: Heartbeat | null): EngineState {
  if (!hb) return 'UNKNOWN'
  const ageMs = Date.now() - new Date(hb.last_heartbeat).getTime()
  if (ageMs > 2 * 60 * 1000) return 'OFFLINE' // no heartbeat for 2+ minutes
  return hb.status === 'RUNNING' ? 'RUNNING'
    : hb.status === 'STARTING' ? 'STARTING'
    : hb.status === 'STOPPING' ? 'STOPPING'
    : 'ONLINE'
}

function timeAgo(isoStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000)
  if (seconds < 10) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
}

export function EngineStatus() {
  const [heartbeat, setHeartbeat] = useState<Heartbeat | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [tick, setTick] = useState(0) // force re-render every second for "time ago"

  // ── Load initial heartbeat ─────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient()

    async function loadInitial() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('service_heartbeat')
        .select('*')
        .eq('service_name', 'trading-engine')
        .single()
      if (data) setHeartbeat(data as Heartbeat)
    }

    loadInitial()

    // ── Realtime subscription ──────────────────────────────────────────────
    const channel = supabase
      .channel('engine_heartbeat')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'service_heartbeat' },
        (payload) => {
          if (payload.new) {
            setHeartbeat(payload.new as Heartbeat)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    // Polling fallback — re-fetch every 35s in case Realtime drops the event
    const poll = setInterval(loadInitial, 35_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [])

  // Tick every second for relative timestamps
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])
  void tick // suppress unused warning

  const state = getEngineState(heartbeat)

  const stateConfig: Record<EngineState, {
    label: string
    color: string
    dotColor: string
    bg: string
    border: string
    ping: boolean
  }> = {
    RUNNING:  { label: 'SCANNING',  color: 'text-emerald-400', dotColor: 'bg-emerald-400', bg: 'bg-emerald-500/8',  border: 'border-emerald-500/25', ping: true  },
    ONLINE:   { label: 'ONLINE',    color: 'text-emerald-400', dotColor: 'bg-emerald-400', bg: 'bg-emerald-500/8',  border: 'border-emerald-500/25', ping: true  },
    STARTING: { label: 'STARTING',  color: 'text-amber-400',   dotColor: 'bg-amber-400',   bg: 'bg-amber-500/8',    border: 'border-amber-500/25',   ping: true  },
    STOPPING: { label: 'STOPPING',  color: 'text-orange-400',  dotColor: 'bg-orange-400',  bg: 'bg-orange-500/8',   border: 'border-orange-500/25',  ping: false },
    OFFLINE:  { label: 'OFFLINE',   color: 'text-red-400',     dotColor: 'bg-red-500',     bg: 'bg-red-500/8',      border: 'border-red-500/25',     ping: false },
    UNKNOWN:  { label: 'NOT DEPLOYED', color: 'text-muted-foreground', dotColor: 'bg-muted-foreground', bg: 'bg-muted/30', border: 'border-border', ping: false },
  }

  const cfg = stateConfig[state]

  return (
    <div className={cn('rounded-xl border p-4 space-y-3', cfg.bg, cfg.border)}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {/* Animated status dot */}
          <div className="relative flex h-3 w-3 items-center justify-center shrink-0">
            {cfg.ping && (
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', cfg.dotColor)} />
            )}
            <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', cfg.dotColor)} />
          </div>

          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">Railway Engine</span>
            <span className={cn('text-xs font-bold font-mono tracking-wide px-1.5 py-0.5 rounded', cfg.color)}>
              {cfg.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isConnected && (
            <span className="flex items-center gap-1 text-emerald-500">
              <Radio className="h-3 w-3" />
              <span className="hidden sm:inline">Realtime</span>
            </span>
          )}
          {heartbeat?.engine_version && (
            <span className="font-mono opacity-60">v{heartbeat.engine_version}</span>
          )}
        </div>
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      {heartbeat ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            <StatCard
              icon={<BarChart2 className="h-3.5 w-3.5" />}
              label="Scans"
              value={heartbeat.scan_count.toString()}
            />
            <StatCard
              icon={<Zap className="h-3.5 w-3.5" />}
              label="Signals"
              value={heartbeat.signal_count.toString()}
            />
            <StatCard
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Watching"
              value={heartbeat.symbols_watched.toString()}
            />
            <StatCard
              icon={<Clock className="h-3.5 w-3.5" />}
              label="Heartbeat"
              value={timeAgo(heartbeat.last_heartbeat)}
              small
            />
          </div>

          {/* Current activity */}
          {heartbeat.current_symbol && state === 'RUNNING' && (
            <div className="flex items-center gap-2 text-xs">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="text-muted-foreground">Scanning</span>
              <span className="font-mono font-semibold text-emerald-400">
                {heartbeat.current_symbol}
              </span>
              <span className="text-muted-foreground/50">right now...</span>
            </div>
          )}

          {state === 'STARTING' && (
            <div className="flex items-center gap-2 text-xs text-amber-400/80">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              Waiting for NSE market open (9:15 AM IST)...
            </div>
          )}

          {state === 'OFFLINE' && (
            <div className="flex items-center gap-2 text-xs text-red-400/80">
              <AlertTriangle className="h-3.5 w-3.5" />
              Last heartbeat: {timeAgo(heartbeat.last_heartbeat)} — engine may be down
            </div>
          )}
        </>
      ) : (
        <div className="text-xs text-muted-foreground/60 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" />
          Railway service not deployed yet. See <code className="font-mono bg-muted px-1 rounded">services/trading-engine/</code> to deploy.
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon, label, value, small = false
}: { icon: React.ReactNode; label: string; value: string; small?: boolean }) {
  return (
    <div className="rounded-lg bg-background/50 border border-border/50 px-2.5 py-2 text-center">
      <div className="flex justify-center text-muted-foreground mb-0.5">{icon}</div>
      <div className={cn('font-bold font-mono', small ? 'text-xs' : 'text-sm')}>{value}</div>
      <div className="text-[10px] text-muted-foreground/60 mt-0.5">{label}</div>
    </div>
  )
}
