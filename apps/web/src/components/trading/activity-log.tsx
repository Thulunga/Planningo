'use client'

/**
 * ActivityLog — terminal-style live feed of per-stock scan results.
 *
 * Subscribes to `scan_logs` via Supabase Realtime.
 * Shows: timestamp, symbol, price, each indicator vote (✅/❌/⚪) with reason,
 *        signal result, and trade action + reason.
 *
 * This gives the admin full visibility into WHY a signal was or wasn't generated
 * and WHY a trade was or wasn't executed — in real time.
 */

import { useEffect, useRef, useState } from 'react'
import {
  Terminal, ChevronDown, ChevronUp, Circle, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react'
import { cn } from '@planningo/ui'
import { getSupabaseClient } from '@/lib/supabase/client'

interface ScanLog {
  id: string
  user_id: string
  symbol: string
  scanned_at: string
  price: number | null
  rsi: number | null
  macd: number | null
  ema9: number | null
  ema21: number | null
  bb_upper: number | null
  bb_lower: number | null
  supertrend: string | null
  vwap: number | null
  votes: Record<string, number> | null      // { ema_cross: 1, rsi: 1, macd: -1, ... }
  confluence_score: number | null
  signal_type: string | null
  signal_strength: string | null
  reasons: Record<string, string> | null   // { ema_cross: "✅ EMA9 above EMA21...", ... }
  trade_action: string | null
  trade_reason: string | null
}

const INDICATOR_KEYS = ['ema_cross', 'rsi', 'macd', 'supertrend', 'bb', 'vwap'] as const
const INDICATOR_LABELS: Record<string, string> = {
  ema_cross: 'EMA',
  rsi: 'RSI',
  macd: 'MACD',
  supertrend: 'ST',
  bb: 'BB',
  vwap: 'VWAP',
}

interface ActivityLogProps {
  userId: string
  initialLogs?: ScanLog[]
}

export function ActivityLog({ userId, initialLogs = [] }: ActivityLogProps) {
  const [logs, setLogs] = useState<ScanLog[]>(initialLogs.slice(0, 60))
  const [isConnected, setIsConnected] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabaseClient()

    // Load initial logs
    async function loadInitial() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from('scan_logs')
        .select('*')
        .eq('user_id', userId)
        .order('scanned_at', { ascending: false })
        .limit(60)
      if (data) setLogs((data as ScanLog[]).reverse())
    }
    loadInitial()

    const channel = supabase
      .channel('scan_logs_feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_logs' },
        (payload) => {
          const newLog = payload.new as ScanLog
          if (newLog.user_id !== userId) return
          setLogs((prev) => [...prev, newLog].slice(-120))
        }
      )
      .subscribe((status) => setIsConnected(status === 'SUBSCRIBED'))

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  function handleScroll() {
    const el = containerRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    setAutoScroll(nearBottom)
  }

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-zinc-900/60 shrink-0">
        <div className="flex items-center gap-2.5">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span className="font-semibold text-sm font-mono tracking-tight">Activity Log</span>
          <span className="text-xs text-muted-foreground/60">({logs.length})</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {isConnected && (
            <span className="flex items-center gap-1 text-emerald-500">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          )}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors',
              autoScroll
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {autoScroll ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
            {autoScroll ? 'Auto' : 'Paused'}
          </button>
        </div>
      </div>

      {/* Terminal body */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-zinc-950 font-mono text-xs"
        style={{ minHeight: '420px', maxHeight: '600px' }}
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 py-16 gap-2">
            <Terminal className="h-8 w-8 opacity-30" />
            <span>Waiting for engine activity...</span>
            <span className="text-[10px] opacity-60">Logs appear here as the Railway engine scans stocks</span>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {logs.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function LogEntry({ log }: { log: ScanLog }) {
  const [expanded, setExpanded] = useState(false)

  const time = new Date(log.scanned_at).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  })

  const signalColor =
    log.signal_type === 'BUY'  ? 'text-emerald-400'
    : log.signal_type === 'SELL' ? 'text-red-400'
    : 'text-zinc-500'

  const tradeColor =
    log.trade_action === 'OPENED'  ? 'text-emerald-300'
    : log.trade_action === 'CLOSED'  ? 'text-blue-300'
    : log.trade_action === 'SKIPPED' ? 'text-zinc-500'
    : 'text-zinc-600'

  const symbolShort = (log.symbol ?? '').replace('.NS', '').replace('.BO', '')

  // Build mini vote indicators
  const votes = log.votes ?? {}

  return (
    <div
      className={cn(
        'group px-3 py-2 cursor-pointer hover:bg-zinc-900/60 transition-colors',
        expanded && 'bg-zinc-900/40'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* ── Compact row ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Time */}
        <span className="text-zinc-600 shrink-0 w-[72px]">{time}</span>

        {/* Symbol */}
        <span className="text-zinc-300 font-bold w-[80px] shrink-0">{symbolShort}</span>

        {/* Price */}
        {log.price != null && (
          <span className="text-zinc-400 w-[72px] shrink-0">₹{log.price.toFixed(1)}</span>
        )}

        {/* Indicator votes mini-badges */}
        <div className="flex items-center gap-0.5">
          {INDICATOR_KEYS.map((key) => {
            const v = votes[key]
            return (
              <VoteBadge key={key} label={INDICATOR_LABELS[key] ?? key} vote={v} />
            )
          })}
        </div>

        {/* Score */}
        {log.confluence_score != null && (
          <span className="text-zinc-500 shrink-0">[{log.confluence_score}/6]</span>
        )}

        {/* Signal */}
        <span className={cn('font-bold shrink-0', signalColor)}>
          {log.signal_type ?? 'HOLD'}
          {log.signal_strength && ` · ${shortStrength(log.signal_strength)}`}
        </span>

        {/* Trade action */}
        {log.trade_action && log.trade_action !== 'HOLD' && (
          <span className={cn('shrink-0', tradeColor)}>
            {tradeIcon(log.trade_action)}{log.trade_action}
          </span>
        )}

        {/* Expand chevron */}
        <span className="ml-auto text-zinc-700 group-hover:text-zinc-500 shrink-0">
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </span>
      </div>

      {/* ── Expanded breakdown ──────────────────────────────────────────────── */}
      {expanded && (
        <div className="mt-2 ml-[88px] space-y-1.5 border-l border-zinc-700/50 pl-3">
          {/* Indicator reasons */}
          {log.reasons && Object.entries(log.reasons).map(([key, reason]) => (
            <div key={key} className="flex gap-2 text-[11px] leading-relaxed">
              <span className="text-zinc-600 uppercase w-[52px] shrink-0">{INDICATOR_LABELS[key] ?? key}</span>
              <span className="text-zinc-400">{reason}</span>
            </div>
          ))}

          {/* Trade outcome */}
          {log.trade_reason && (
            <div className="mt-2 pt-1.5 border-t border-zinc-800 flex gap-2 text-[11px]">
              <span className="text-zinc-600 w-[52px] shrink-0">TRADE</span>
              <span className={cn('font-medium', tradeColor)}>{log.trade_reason}</span>
            </div>
          )}

          {/* Raw values */}
          <div className="mt-1.5 pt-1.5 border-t border-zinc-800 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-zinc-600">
            {log.rsi    != null && <span>RSI {log.rsi.toFixed(1)}</span>}
            {log.ema9   != null && <span>EMA9 ₹{log.ema9.toFixed(1)}</span>}
            {log.ema21  != null && <span>EMA21 ₹{log.ema21.toFixed(1)}</span>}
            {log.macd   != null && <span>MACD {log.macd.toFixed(3)}</span>}
            {log.vwap   != null && <span>VWAP ₹{log.vwap.toFixed(1)}</span>}
            {log.supertrend && <span>ST {log.supertrend}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

function VoteBadge({ label, vote }: { label: string; vote: number | undefined }) {
  if (vote === 1)  return <span className="text-[9px] px-1 py-px rounded bg-emerald-500/20 text-emerald-400 font-bold">{label}</span>
  if (vote === -1) return <span className="text-[9px] px-1 py-px rounded bg-red-500/20 text-red-400 font-bold">{label}</span>
  return <span className="text-[9px] px-1 py-px rounded bg-zinc-800 text-zinc-600">{label}</span>
}

function shortStrength(s: string): string {
  if (s === 'VERY_STRONG') return '⚡VS'
  if (s === 'STRONG')      return '★S'
  return 'W'
}

function tradeIcon(action: string): string {
  if (action === 'OPENED')  return '↑ '
  if (action === 'CLOSED')  return '↓ '
  if (action === 'SKIPPED') return '– '
  return ''
}

// For use in compact signal display
export function SignalTypeIcon({ type }: { type: string }) {
  if (type === 'BUY')  return <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
  if (type === 'SELL') return <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
  return <Minus className="h-3.5 w-3.5 text-zinc-500" />
}

// Unused export just to satisfy the import in trading-dashboard
export { Circle }
