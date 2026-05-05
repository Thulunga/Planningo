'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Coins,
  Flame,
  Landmark,
  PiggyBank,
  Settings2,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react'
import { StepUpSparkline } from '@/components/wealth/step-up-sparkline'
import { getCorpusMilestone, getNextCorpusMilestone } from '@/lib/wealth/milestone-service'
import { loadWealthLabConfigAction, saveWealthLabConfigAction } from '@/lib/actions/wealth-lab'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@planningo/ui'

// ─── Types ─────────────────────────────────────────────────────────────────
type AssetClass =
  | 'mutual_fund'
  | 'stocks'
  | 'fd'
  | 'rd'
  | 'ppf'
  | 'nps'
  | 'gold'
  | 'savings'
  | 'real_estate'

interface AssetConfig {
  id: AssetClass
  label: string
  icon: React.ReactNode
  defaultReturn: number
  color: string
  gradientFrom: string
  gradientTo: string
  description: string
  category: 'equity' | 'debt' | 'commodity' | 'liquid'
  taxNote: string
}

interface AssetAllocation {
  id: AssetClass
  enabled: boolean
  monthlyAmount: number
  annualStepUpPct: number
  lumpsum: number
  customReturn: number
}

interface ProjectionPoint {
  year: number
  invested: number
  balance: number
  realBalance: number
  growth: number
  byAsset: Record<AssetClass, { invested: number; balance: number }>
}

interface TooltipState {
  x: number
  y: number
  lines: { label: string; value?: string; color?: string }[]
}

// ─── Constants ─────────────────────────────────────────────────────────────
const ASSET_CONFIGS: AssetConfig[] = [
  {
    id: 'mutual_fund',
    label: 'Mutual Funds',
    icon: <TrendingUp className="h-4 w-4" />,
    defaultReturn: 14,
    color: '#10b981',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    description: 'Equity/hybrid MF SIP with ELSS or flexi-cap',
    category: 'equity',
    taxNote: 'LTCG @10% above ₹1L/yr',
  },
  {
    id: 'stocks',
    label: 'Direct Stocks',
    icon: <Flame className="h-4 w-4" />,
    defaultReturn: 15,
    color: '#f59e0b',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    description: 'NSE/BSE direct equity portfolio',
    category: 'equity',
    taxNote: 'LTCG @10% above ₹1L/yr',
  },
  {
    id: 'fd',
    label: 'Fixed Deposit',
    icon: <Building2 className="h-4 w-4" />,
    defaultReturn: 7.5,
    color: '#3b82f6',
    gradientFrom: '#3b82f6',
    gradientTo: '#2563eb',
    description: 'Bank FD with auto-renewal',
    category: 'debt',
    taxNote: 'Interest taxed as income slab',
  },
  {
    id: 'rd',
    label: 'Recurring Deposit',
    icon: <Coins className="h-4 w-4" />,
    defaultReturn: 7,
    color: '#8b5cf6',
    gradientFrom: '#8b5cf6',
    gradientTo: '#7c3aed',
    description: 'Monthly RD compounded quarterly',
    category: 'debt',
    taxNote: 'Interest taxed as income slab',
  },
  {
    id: 'ppf',
    label: 'PPF',
    icon: <Shield className="h-4 w-4" />,
    defaultReturn: 7.1,
    color: '#06b6d4',
    gradientFrom: '#06b6d4',
    gradientTo: '#0891b2',
    description: 'Public Provident Fund - EEE tax status',
    category: 'debt',
    taxNote: 'Fully tax free (EEE)',
  },
  {
    id: 'nps',
    label: 'NPS',
    icon: <Zap className="h-4 w-4" />,
    defaultReturn: 10,
    color: '#ec4899',
    gradientFrom: '#ec4899',
    gradientTo: '#db2777',
    description: 'National Pension System Tier-I',
    category: 'equity',
    taxNote: 'Tax deduction u/s 80CCD(1B)',
  },
  {
    id: 'gold',
    label: 'Gold / SGB',
    icon: <Coins className="h-4 w-4" />,
    defaultReturn: 8,
    color: '#eab308',
    gradientFrom: '#eab308',
    gradientTo: '#ca8a04',
    description: 'Sovereign Gold Bonds or physical gold',
    category: 'commodity',
    taxNote: 'SGB: tax-free on maturity',
  },
  {
    id: 'savings',
    label: 'Savings / Liquid',
    icon: <PiggyBank className="h-4 w-4" />,
    defaultReturn: 3.5,
    color: '#64748b',
    gradientFrom: '#64748b',
    gradientTo: '#475569',
    description: 'Savings account or liquid MF emergency fund',
    category: 'liquid',
    taxNote: 'Interest taxed as income slab',
  },
  {
    id: 'real_estate',
    label: 'Real Estate',
    icon: <Building2 className="h-4 w-4" />,
    defaultReturn: 9,
    color: '#f97316',
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
    description: 'Property appreciation (no rental income here)',
    category: 'equity',
    taxNote: 'LTCG @20% with indexation',
  },
]

const CONFIG_MAP: Record<AssetClass, AssetConfig> = Object.fromEntries(
  ASSET_CONFIGS.map((a) => [a.id, a])
) as Record<AssetClass, AssetConfig>

// ─── Formatting ─────────────────────────────────────────────────────────────
const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})
const formatMoney = (v: number) => INR.format(v)
function shortMoney(v: number): string {
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`
  if (v >= 1e3) return `₹${(v / 1e3).toFixed(1)}K`
  return `₹${v.toFixed(0)}`
}

// ─── Engine ─────────────────────────────────────────────────────────────────
function projectPortfolio(
  allocations: AssetAllocation[],
  years: number,
  inflationPct: number,
  yearlyBonus: number
): ProjectionPoint[] {
  const enabled = allocations.filter((a) => a.enabled)
  if (enabled.length === 0) return []

  const assetStates: Record<AssetClass, { invested: number; balance: number }> = {} as any
  let totalInvested = 0
  let totalBalance = 0

  for (const a of enabled) {
    assetStates[a.id] = { invested: a.lumpsum, balance: a.lumpsum }
    totalInvested += a.lumpsum
    totalBalance += a.lumpsum
  }

  const points: ProjectionPoint[] = [
    {
      year: 0,
      invested: totalInvested,
      balance: totalBalance,
      realBalance: totalBalance,
      growth: 0,
      byAsset: JSON.parse(JSON.stringify(assetStates)),
    },
  ]

  for (let month = 1; month <= years * 12; month++) {
    const year = Math.ceil(month / 12)
    const monthlyInflation = Math.pow(1 + inflationPct / 100, 1 / 12) - 1

    for (const a of enabled) {
      const monthlyRate = Math.pow(1 + a.customReturn / 100, 1 / 12) - 1
      const stepped = a.monthlyAmount * Math.pow(1 + a.annualStepUpPct / 100, year - 1)
      assetStates[a.id].invested += stepped
      assetStates[a.id].balance = (assetStates[a.id].balance + stepped) * (1 + monthlyRate)
    }

    if (month % 12 === 0 && yearlyBonus > 0 && enabled.length > 0) {
      // distribute bonus proportional to current balance
      const totalBal = enabled.reduce((s, a) => s + assetStates[a.id].balance, 0)
      for (const a of enabled) {
        const share = totalBal > 0 ? assetStates[a.id].balance / totalBal : 1 / enabled.length
        const portion = yearlyBonus * share
        assetStates[a.id].invested += portion
        assetStates[a.id].balance += portion
      }
    }

    if (month % 12 === 0) {
      const inv = enabled.reduce((s, a) => s + assetStates[a.id].invested, 0)
      const bal = enabled.reduce((s, a) => s + assetStates[a.id].balance, 0)
      const inflFactor = Math.pow(1 + monthlyInflation, month)

      points.push({
        year,
        invested: inv,
        balance: bal,
        realBalance: bal / inflFactor,
        growth: bal - inv,
        byAsset: JSON.parse(JSON.stringify(assetStates)),
      })
    }
  }

  return points
}

// ─── SVG helpers ─────────────────────────────────────────────────────────────
type ScalarFn = (d: ProjectionPoint) => number
function polyline(data: ProjectionPoint[], xFn: ScalarFn, yFn: ScalarFn) {
  return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xFn(d).toFixed(1)} ${yFn(d).toFixed(1)}`).join(' ')
}
function areaPath(data: ProjectionPoint[], xFn: ScalarFn, yFn: ScalarFn, bottom: number) {
  if (!data.length) return ''
  const line = polyline(data, xFn, yFn)
  return `${line} L${xFn(data.at(-1)!).toFixed(1)} ${bottom} L${xFn(data[0]).toFixed(1)} ${bottom} Z`
}

function fanBandPath(
  upper: ProjectionPoint[],
  lower: ProjectionPoint[],
  xFn: ScalarFn,
  yFn: ScalarFn
) {
  if (!upper.length || !lower.length) return ''
  const top = upper
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xFn(d).toFixed(1)} ${yFn(d).toFixed(1)}`)
    .join(' ')
  const bottom = [...lower]
    .reverse()
    .map((d) => `L${xFn(d).toFixed(1)} ${yFn(d).toFixed(1)}`)
    .join(' ')
  return `${top} ${bottom} Z`
}

function shiftReturns(allocations: AssetAllocation[], deltaPct: number): AssetAllocation[] {
  return allocations.map((a) => ({
    ...a,
    customReturn: Math.max(0.5, a.customReturn + deltaPct),
  }))
}

// ─── Tooltip ─────────────────────────────────────────────────────────────────
function ChartTooltip({ state }: { state: TooltipState | null }) {
  if (!state) return null
  return (
    <div
      className="pointer-events-none fixed z-[999] min-w-[160px] rounded-xl border border-white/10 bg-zinc-900/97 px-3 py-2.5 shadow-2xl backdrop-blur-md"
      style={{ left: state.x + 14, top: state.y, transform: 'translateY(-50%)' }}
    >
      {state.lines.map((l, i) => (
        <div key={i} className={`flex items-center gap-2 ${i > 0 ? 'mt-1' : ''}`}>
          {l.color && <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />}
          <span className={`text-xs ${i === 0 ? 'font-semibold text-white' : 'text-zinc-400'}`}>{l.label}</span>
          {l.value && <span className="ml-auto pl-3 text-xs font-bold tabular-nums text-white">{l.value}</span>}
        </div>
      ))}
    </div>
  )
}

// ─── Tiny number input ────────────────────────────────────────────────────────
function Slider({
  label,
  value,
  min,
  max,
  step,
  format: fmt,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  const display = fmt ? fmt(value) : Number.isInteger(value) ? `${value}` : value.toFixed(2)
  const pct = ((value - min) / (max - min)) * 100

  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold tabular-nums">{display}</span>
      </div>
      <div className="relative h-2">
        <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-muted" />
        <div className="absolute inset-y-0 left-0 rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </label>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon?: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-xl font-bold tabular-nums tracking-tight ${accent ?? ''}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

// ─── Donut ───────────────────────────────────────────────────────────────────
function DonutSlice({
  cx,
  cy,
  r,
  startAngle,
  endAngle,
  color,
  onMouseMove,
  onMouseLeave,
}: {
  cx: number
  cy: number
  r: number
  startAngle: number
  endAngle: number
  color: string
  onMouseMove?: (e: React.MouseEvent) => void
  onMouseLeave?: () => void
}) {
  const inner = r * 0.54
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const ax = cx + r * Math.cos(toRad(startAngle))
  const ay = cy + r * Math.sin(toRad(startAngle))
  const bx = cx + r * Math.cos(toRad(endAngle))
  const by = cy + r * Math.sin(toRad(endAngle))
  const ix = cx + inner * Math.cos(toRad(startAngle))
  const iy = cy + inner * Math.sin(toRad(startAngle))
  const jx = cx + inner * Math.cos(toRad(endAngle))
  const jy = cy + inner * Math.sin(toRad(endAngle))
  const large = endAngle - startAngle > 180 ? 1 : 0
  const d = `M${ax.toFixed(2)},${ay.toFixed(2)} A${r},${r} 0 ${large} 1 ${bx.toFixed(2)},${by.toFixed(2)} L${jx.toFixed(2)},${jy.toFixed(2)} A${inner},${inner} 0 ${large} 0 ${ix.toFixed(2)},${iy.toFixed(2)} Z`
  return <path d={d} fill={color} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave} className="cursor-pointer transition-opacity hover:opacity-80" />
}

// ─── Default allocations ─────────────────────────────────────────────────────
const DEFAULT_ALLOCATIONS: AssetAllocation[] = [
  { id: 'mutual_fund', enabled: true,  monthlyAmount: 15000, annualStepUpPct: 12, lumpsum: 100000, customReturn: 14 },
  { id: 'stocks',      enabled: true,  monthlyAmount: 5000,  annualStepUpPct: 10, lumpsum: 50000,  customReturn: 15 },
  { id: 'fd',          enabled: true,  monthlyAmount: 5000,  annualStepUpPct: 5,  lumpsum: 50000,  customReturn: 7.5 },
  { id: 'rd',          enabled: false, monthlyAmount: 3000,  annualStepUpPct: 0,  lumpsum: 0,      customReturn: 7 },
  { id: 'ppf',         enabled: true,  monthlyAmount: 4000,  annualStepUpPct: 5,  lumpsum: 25000,  customReturn: 7.1 },
  { id: 'nps',         enabled: false, monthlyAmount: 3000,  annualStepUpPct: 10, lumpsum: 0,      customReturn: 10 },
  { id: 'gold',        enabled: true,  monthlyAmount: 2000,  annualStepUpPct: 5,  lumpsum: 25000,  customReturn: 8 },
  { id: 'savings',     enabled: true,  monthlyAmount: 5000,  annualStepUpPct: 0,  lumpsum: 100000, customReturn: 3.5 },
  { id: 'real_estate', enabled: false, monthlyAmount: 0,     annualStepUpPct: 0,  lumpsum: 500000, customReturn: 9 },
]

const WEALTH_LAB_LOCAL_KEY = 'planningo_wealth_lab_v1'

function normalizeAllocations(input: unknown): AssetAllocation[] {
  if (!Array.isArray(input)) return DEFAULT_ALLOCATIONS

  const byId = new Map<AssetClass, AssetAllocation>()
  for (const base of DEFAULT_ALLOCATIONS) byId.set(base.id, { ...base })

  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue
    const item = raw as Partial<AssetAllocation>
    if (!item.id || !byId.has(item.id as AssetClass)) continue
    const current = byId.get(item.id as AssetClass)!
    byId.set(item.id as AssetClass, {
      ...current,
      enabled: typeof item.enabled === 'boolean' ? item.enabled : current.enabled,
      monthlyAmount: typeof item.monthlyAmount === 'number' ? item.monthlyAmount : current.monthlyAmount,
      annualStepUpPct: typeof item.annualStepUpPct === 'number' ? item.annualStepUpPct : current.annualStepUpPct,
      lumpsum: typeof item.lumpsum === 'number' ? item.lumpsum : current.lumpsum,
      customReturn: typeof item.customReturn === 'number' ? item.customReturn : current.customReturn,
    })
  }

  return DEFAULT_ALLOCATIONS.map((base) => byId.get(base.id) ?? base)
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main dashboard
// ═══════════════════════════════════════════════════════════════════════════════
export function WealthLabDashboard() {
  const [allocations, setAllocations] = useState<AssetAllocation[]>(DEFAULT_ALLOCATIONS)
  const [years, setYears] = useState(20)
  const [inflationPct, setInflationPct] = useState(6)
  const [yearlyBonus, setYearlyBonus] = useState(150000)
  const [currentMonthlyExpenses, setCurrentMonthlyExpenses] = useState(120000)
  const [activeTab, setActiveTab] = useState<'growth' | 'allocation' | 'assets' | 'insights'>('growth')
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [showDummyDataPopup, setShowDummyDataPopup] = useState(false)
  const [isHydrating, setIsHydrating] = useState(true)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveStateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // 1) Instant local restore for no-lag UX.
      try {
        const raw = localStorage.getItem(WEALTH_LAB_LOCAL_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as {
            allocations?: unknown
            years?: number
            inflationPct?: number
            yearlyBonus?: number
            currentMonthlyExpenses?: number
          }
          if (!cancelled) {
            setAllocations(normalizeAllocations(parsed.allocations))
            if (typeof parsed.years === 'number') setYears(parsed.years)
            if (typeof parsed.inflationPct === 'number') setInflationPct(parsed.inflationPct)
            if (typeof parsed.yearlyBonus === 'number') setYearlyBonus(parsed.yearlyBonus)
            if (typeof parsed.currentMonthlyExpenses === 'number') {
              setCurrentMonthlyExpenses(parsed.currentMonthlyExpenses)
            }
          }
        }
      } catch {
        // ignore malformed local cache
      }

      // 2) Authoritative cloud restore for cross-device continuity.
      const result = await loadWealthLabConfigAction()
      if (cancelled) return

      if (result.config) {
        setAllocations(normalizeAllocations(result.config.allocations))
        if (typeof result.config.years === 'number') setYears(result.config.years)
        if (typeof result.config.inflationPct === 'number') setInflationPct(result.config.inflationPct)
        if (typeof result.config.yearlyBonus === 'number') setYearlyBonus(result.config.yearlyBonus)
        if (typeof result.config.currentMonthlyExpenses === 'number') {
          setCurrentMonthlyExpenses(result.config.currentMonthlyExpenses)
        }
      }

      if (result.isFirstTime) {
        setShowDummyDataPopup(true)
      }

      setIsHydrating(false)
    }

    bootstrap()

    return () => {
      cancelled = true
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
      if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isHydrating) return

    const payload = {
      allocations,
      years,
      inflationPct,
      yearlyBonus,
      currentMonthlyExpenses,
    }

    try {
      localStorage.setItem(WEALTH_LAB_LOCAL_KEY, JSON.stringify(payload))
    } catch {
      // local storage may be unavailable in some private contexts
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    setSaveState('saving')

    saveTimerRef.current = setTimeout(async () => {
      const result = await saveWealthLabConfigAction(payload)
      if (result.error) {
        setSaveState('error')
        return
      }

      setSaveState('saved')
      if (saveStateTimerRef.current) clearTimeout(saveStateTimerRef.current)
      saveStateTimerRef.current = setTimeout(() => setSaveState('idle'), 1400)
    }, 1200)
  }, [allocations, years, inflationPct, yearlyBonus, currentMonthlyExpenses, isHydrating])

  const projection = useMemo(
    () => projectPortfolio(allocations, years, inflationPct, yearlyBonus),
    [allocations, years, inflationPct, yearlyBonus]
  )

  const final = projection.at(-1)
  const finalBalance = final?.balance ?? 0
  const finalInvested = final?.invested ?? 0
  const finalGrowth = final?.growth ?? 0
  const finalReal = final?.realBalance ?? 0
  const growthPct = finalBalance > 0 ? (finalGrowth / finalBalance) * 100 : 0
  const multiplier = finalInvested > 0 ? finalBalance / finalInvested : 1
  const safeWithdrawal = (finalBalance * 0.04) / 12
  const milestone = getCorpusMilestone(finalBalance)
  const nextMilestone = getNextCorpusMilestone(finalBalance)

  // ── Milestones ─────────────────────────────────────────────────────────────
  const milestones = useMemo(() => {
    const tiers = [1e6, 5e6, 1e7, 2.5e7, 5e7, 1e8]
    return tiers.map((t) => {
      const hit = projection.find((p) => p.balance >= t)
      return { label: shortMoney(t), year: hit ? `Year ${hit.year}` : '-' }
    })
  }, [projection])

  function updateAllocation(id: AssetClass, patch: Partial<AssetAllocation>) {
    setAllocations((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  }

  const enabledAllocs = allocations.filter((a) => a.enabled)
  const totalMonthly = enabledAllocs.reduce((s, a) => s + a.monthlyAmount, 0)

  return (
    <div className="space-y-5 pb-8">
      <Dialog open={showDummyDataPopup} onOpenChange={setShowDummyDataPopup}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to Wealth Lab</DialogTitle>
            <DialogDescription>
              We preloaded realistic dummy values so you can explore instantly. Please update numbers to match your real
              SIPs, corpus, and expenses. Your updates auto-save in background and sync across devices.
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowDummyDataPopup(false)}
              className="inline-flex rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Got it, I will personalize now
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Hero header ────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-300/30 bg-gradient-to-br from-emerald-500/15 via-cyan-500/8 to-transparent p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-8 bottom-0 h-40 w-40 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <Landmark className="h-3.5 w-3.5" />
              Wealth Lab · Private Development Mode
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              <Sparkles className="h-3.5 w-3.5" />
              {milestone.label}
              <span className="text-blue-600/80 dark:text-blue-300/90">· {milestone.subtitle}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">Savings + Investment Growth Lab</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Multi-asset class financial planning · Inflation-aware projections · Scenario modelling · Tax insights
            </p>
            {nextMilestone && (
              <p className="mt-1 text-xs text-muted-foreground">
                Next milestone: {shortMoney(nextMilestone.min)} ({nextMilestone.label})
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <KpiPill label="Target corpus" value={shortMoney(finalBalance)} accent="text-emerald-500" />
            <KpiPill label="Real value" value={shortMoney(finalReal)} accent="text-cyan-500" />
            <KpiPill label="Monthly SIP" value={shortMoney(totalMonthly)} accent="text-blue-500" />
            <KpiPill label={`${years}yr multiplier`} value={`${multiplier.toFixed(1)}×`} accent="text-amber-500" />
          </div>
        </div>
        <div className="relative z-10 mt-2 flex items-center justify-end">
          <span
            className={`rounded-full px-2 py-1 text-[10px] font-medium ${
              saveState === 'saving'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : saveState === 'saved'
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  : saveState === 'error'
                    ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                    : 'bg-muted text-muted-foreground'
            }`}
          >
            {saveState === 'saving'
              ? 'Saving in background...'
              : saveState === 'saved'
                ? 'Synced'
                : saveState === 'error'
                  ? 'Sync failed (will retry on next change)'
                  : 'Autosave ready'}
          </span>
        </div>
      </section>

      {/* ─── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {(
          [
            { id: 'growth', label: 'Growth Projections', icon: <TrendingUp className="h-3.5 w-3.5" /> },
            { id: 'allocation', label: 'Allocation', icon: <PiggyBank className="h-3.5 w-3.5" /> },
            { id: 'assets', label: 'Asset Setup', icon: <Settings2 className="h-3.5 w-3.5" /> },
            { id: 'insights', label: 'Insights & Tax', icon: <Sparkles className="h-3.5 w-3.5" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Global controls ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <Slider label="Plan horizon (years)" value={years} min={3} max={35} step={1} onChange={setYears} />
        <Slider label="Inflation %" value={inflationPct} min={2} max={12} step={0.25} onChange={setInflationPct} />
        <Slider label="Yearly bonus investment" value={yearlyBonus} min={0} max={3000000} step={10000} format={shortMoney} onChange={setYearlyBonus} />
      </div>
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
        <Slider
          label="Current monthly lifestyle expense"
          value={currentMonthlyExpenses}
          min={10000}
          max={1000000}
          step={5000}
          format={shortMoney}
          onChange={setCurrentMonthlyExpenses}
        />
        <div className="rounded-lg border border-border bg-background/60 p-3 text-xs text-muted-foreground">
          Tooltip psychology mode is active. Hover chart years to see lifestyle coverage and passive-income readiness.
        </div>
      </div>

      {/* ─── KPI strip ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<Wallet className="h-4 w-4 text-cyan-500" />} label="Total invested" value={shortMoney(finalInvested)} sub="Principal + bonus" />
        <StatCard icon={<Sparkles className="h-4 w-4 text-emerald-500" />} label="Compounding gain" value={shortMoney(finalGrowth)} sub={`${growthPct.toFixed(1)}% of corpus`} accent="text-emerald-500" />
        <StatCard icon={<Target className="h-4 w-4 text-blue-500" />} label="Inflation-adj corpus" value={shortMoney(finalReal)} sub={`At ${inflationPct}% inflation`} />
        <StatCard icon={<PiggyBank className="h-4 w-4 text-amber-500" />} label="Passive income / mo" value={shortMoney(safeWithdrawal)} sub="4% safe withdrawal rule" accent="text-amber-500" />
      </div>

      {/* ─── Tab content ─────────────────────────────────────────────────── */}
      {activeTab === 'growth' && (
        <GrowthTab
          projection={projection}
          years={years}
          milestones={milestones}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          allocations={allocations}
          inflationPct={inflationPct}
          yearlyBonus={yearlyBonus}
          currentMonthlyExpenses={currentMonthlyExpenses}
        />
      )}
      {activeTab === 'allocation' && (
        <AllocationTab projection={projection} allocations={allocations} years={years} />
      )}
      {activeTab === 'assets' && (
        <AssetsTab allocations={allocations} onUpdate={updateAllocation} />
      )}
      {activeTab === 'insights' && (
        <InsightsTab
          projection={projection}
          allocations={allocations}
          finalBalance={finalBalance}
          finalInvested={finalInvested}
          finalReal={finalReal}
          years={years}
          inflationPct={inflationPct}
          safeWithdrawal={safeWithdrawal}
          milestones={milestones}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Growth Projections
// ═══════════════════════════════════════════════════════════════════════════════
function GrowthTab({
  projection,
  years,
  milestones,
  selectedYear,
  setSelectedYear,
  allocations,
  inflationPct,
  yearlyBonus,
  currentMonthlyExpenses,
}: {
  projection: ProjectionPoint[]
  years: number
  milestones: { label: string; year: string }[]
  selectedYear: number | null
  setSelectedYear: (y: number | null) => void
  allocations: AssetAllocation[]
  inflationPct: number
  yearlyBonus: number
  currentMonthlyExpenses: number
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [whatIfEnabled, setWhatIfEnabled] = useState(false)
  const [whatIfInflationPct, setWhatIfInflationPct] = useState(inflationPct)
  const [whatIfMarketDeltaPct, setWhatIfMarketDeltaPct] = useState(0)
  const [feeImpactPct, setFeeImpactPct] = useState(1)
  const [showBurnDown, setShowBurnDown] = useState(false)
  const [retirementYears, setRetirementYears] = useState(25)
  const [withdrawalPerMonth, setWithdrawalPerMonth] = useState(232000)

  const W = 900; const H = 340
  const PAD = { top: 24, right: 24, bottom: 36, left: 68 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom

  const baseAllocations = useMemo(
    () => (whatIfEnabled ? shiftReturns(allocations, whatIfMarketDeltaPct) : allocations),
    [allocations, whatIfEnabled, whatIfMarketDeltaPct]
  )
  const effectiveInflation = whatIfEnabled ? whatIfInflationPct : inflationPct

  const baseProjection = useMemo(
    () => projectPortfolio(baseAllocations, years, effectiveInflation, yearlyBonus),
    [baseAllocations, years, effectiveInflation, yearlyBonus]
  )
  const stressProjection = useMemo(
    () => projectPortfolio(shiftReturns(baseAllocations, -3), years, effectiveInflation + 1.5, yearlyBonus),
    [baseAllocations, years, effectiveInflation, yearlyBonus]
  )
  const optimisticProjection = useMemo(
    () => projectPortfolio(shiftReturns(baseAllocations, 3), years, Math.max(1, effectiveInflation - 1), yearlyBonus),
    [baseAllocations, years, effectiveInflation, yearlyBonus]
  )
  const feeGhostProjection = useMemo(
    () => projectPortfolio(shiftReturns(baseAllocations, -feeImpactPct), years, effectiveInflation, yearlyBonus),
    [baseAllocations, years, effectiveInflation, yearlyBonus, feeImpactPct]
  )

  const all3 = [...baseProjection, ...stressProjection, ...optimisticProjection, ...feeGhostProjection]
  const maxVal = Math.max(...all3.map((d) => d.balance), 1)
  const xFn = (d: ProjectionPoint) => PAD.left + (d.year / years) * cW
  const yFn = (d: ProjectionPoint) => PAD.top + cH - (d.balance / maxVal) * cH
  const yReal = (d: ProjectionPoint) => PAD.top + cH - (d.realBalance / maxVal) * cH
  const bottom = PAD.top + cH

  const yTicks = 5
  const barData = baseProjection.slice(1).map((p, i) => {
    const prev = baseProjection[i]
    return {
      year: p.year,
      invested: p.invested - prev.invested,
      gain: Math.max(0, p.growth - prev.growth),
    }
  })
  const maxBar = Math.max(...barData.map((b) => b.invested + b.gain), 1)

  const burnDown = useMemo(() => {
    if (!showBurnDown) return [] as { year: number; balance: number }[]
    const start = baseProjection.at(-1)?.balance ?? 0
    const monthlyWithdraw = withdrawalPerMonth
    const avgReturn = baseAllocations.reduce((s, a) => s + a.customReturn, 0) / Math.max(1, baseAllocations.length)
    const conservativePostRetirementReturn = Math.max(0.5, avgReturn - 2)
    const monthlyRate = Math.pow(1 + conservativePostRetirementReturn / 100, 1 / 12) - 1
    const data: { year: number; balance: number }[] = [{ year: 0, balance: start }]
    let bal = start
    for (let m = 1; m <= retirementYears * 12; m++) {
      bal = Math.max(0, bal * (1 + monthlyRate) - monthlyWithdraw)
      if (m % 12 === 0) data.push({ year: m / 12, balance: bal })
      if (bal <= 0) break
    }
    return data
  }, [showBurnDown, baseProjection, withdrawalPerMonth, retirementYears, baseAllocations])

  function handleSvgMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || !baseProjection.length) return
    const mx = e.clientX - rect.left
    const relX = mx - PAD.left
    const yearFrac = (relX / cW) * years
    const nearestIdx = Math.min(baseProjection.length - 1, Math.max(0, Math.round(yearFrac)))
    const p = baseProjection[nearestIdx]
    const pc = stressProjection[nearestIdx]
    const pa = optimisticProjection[nearestIdx]
    if (!p) return
    const passiveIncome = (p.balance * 0.04) / 12
    const lifestyleCoverage = currentMonthlyExpenses > 0 ? (passiveIncome / currentMonthlyExpenses) * 100 : 0
    setSelectedYear(p.year)
    setTooltip({
      x: e.clientX,
      y: e.clientY,
      lines: [
        { label: `Year ${p.year}` },
        { label: 'Base corpus', value: shortMoney(p.balance), color: '#10b981' },
        { label: 'Stress test', value: shortMoney(pc?.balance ?? 0), color: '#06b6d4' },
        { label: 'Optimistic', value: shortMoney(pa?.balance ?? 0), color: '#f59e0b' },
        { label: 'Real (inflation adj)', value: shortMoney(p.realBalance), color: '#8b5cf6' },
        { label: 'Invested', value: shortMoney(p.invested), color: '#64748b' },
        { label: 'Lifestyle coverage', value: `${lifestyleCoverage.toFixed(0)}%` },
      ],
    })
  }

  return (
    <div className="space-y-5">
      <ChartTooltip state={tooltip} />
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">What-If Scenarios</h2>
            <p className="text-xs text-muted-foreground">Temporarily override macro assumptions and stress-test your wealth curve.</p>
          </div>
          <button
            onClick={() => setWhatIfEnabled((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${whatIfEnabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {whatIfEnabled ? 'What-If On' : 'What-If Off'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Slider
            label="Override Inflation %"
            value={whatIfInflationPct}
            min={1}
            max={14}
            step={0.25}
            onChange={setWhatIfInflationPct}
          />
          <Slider
            label="Market Return Delta %"
            value={whatIfMarketDeltaPct}
            min={-6}
            max={6}
            step={0.25}
            onChange={setWhatIfMarketDeltaPct}
          />
          <Slider
            label="Fee impact (expense ratio %)"
            value={feeImpactPct}
            min={0}
            max={3}
            step={0.1}
            onChange={setFeeImpactPct}
          />
        </div>
      </div>
      {/* Multi-scenario area chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Portfolio Growth · Fan Chart Projection</h2>
            <p className="text-xs text-muted-foreground">Stress and optimistic envelopes show realistic probability bands around your base path.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <LegendItem color="#10b981" label="Base" />
            <LegendItem color="#06b6d4" label="Stress test" dashed />
            <LegendItem color="#f59e0b" label="Optimistic" dashed />
            <LegendItem color="#a855f7" label="Fan band" />
            <LegendItem color="#8b5cf6" label="Real value" dashed />
            <LegendItem color="#94a3b8" label="Invested" />
            <LegendItem color="#ef4444" label="Fee ghost line" dashed />
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[680px] rounded-lg border border-border/50 bg-background/40"
            onMouseMove={handleSvgMove}
            onMouseLeave={() => {
              setTooltip(null)
              setSelectedYear(null)
            }}
          >
            <defs>
              <linearGradient id="g_base" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="g_invested" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#64748b" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#64748b" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Grid */}
            {Array.from({ length: yTicks + 1 }).map((_, i) => {
              const yLine = PAD.top + (cH * i) / yTicks
              const val = maxVal * (1 - i / yTicks)
              return (
                <g key={i}>
                  <line x1={PAD.left} y1={yLine} x2={W - PAD.right} y2={yLine} stroke="currentColor" opacity="0.08" />
                  <text x={PAD.left - 6} y={yLine + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                    {shortMoney(val)}
                  </text>
                </g>
              )
            })}
            {/* X ticks */}
            {Array.from({ length: Math.min(years + 1, 8) }).map((_, i) => {
              const tick = Math.round((i / 7) * years)
              const xPos = PAD.left + (tick / years) * cW
              return (
                <text key={i} x={xPos} y={H - 10} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                  Y{tick}
                </text>
              )
            })}
            {/* Fan band */}
            <path d={fanBandPath(optimisticProjection, stressProjection, xFn, yFn)} fill="rgb(168 85 247 / 0.12)" />
            {/* Areas */}
            <path d={areaPath(baseProjection, xFn, (d) => PAD.top + cH - (d.invested / maxVal) * cH, bottom)} fill="url(#g_invested)" />
            <path d={areaPath(baseProjection, xFn, yFn, bottom)} fill="url(#g_base)" />
            {/* Lines */}
            <path d={polyline(baseProjection, xFn, (d) => PAD.top + cH - (d.invested / maxVal) * cH)} fill="none" stroke="#94a3b8" strokeWidth="1.5" />
            <path d={polyline(stressProjection, xFn, yFn)} fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 4" />
            <path d={polyline(optimisticProjection, xFn, yFn)} fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 3" />
            <path d={polyline(baseProjection, xFn, yReal)} fill="none" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="2 3" />
            <path d={polyline(baseProjection, xFn, yFn)} fill="none" stroke="#10b981" strokeWidth="3" />
            <path d={polyline(feeGhostProjection, xFn, yFn)} fill="none" stroke="#ef4444" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.9" />
          </svg>
        </div>
        {selectedYear !== null && (
          <p className="mt-2 text-xs text-muted-foreground">
            Selected Year: {selectedYear} · Passive-income coverage is shown in tooltip based on current lifestyle expense.
          </p>
        )}
      </div>

      {/* Year-by-year bar chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">Annual Wealth Addition · Principal vs Compounding</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Each bar = how much wealth is added in that year. Green = compounding gain on top of blue = principal added.
        </p>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 900 200`} className="w-full min-w-[500px]">
            {barData.slice(0, Math.min(years, 20)).map((b, i) => {
              const gap = 2
              const barW = Math.floor((900 - 40) / Math.min(years, 20)) - gap
              const x0 = 20 + i * (barW + gap)
              const totalH = 160
              const invH = (b.invested / maxBar) * totalH
              const gainH = (b.gain / maxBar) * totalH
              return (
                <g key={b.year}>
                  <rect x={x0} y={200 - 20 - invH} width={barW} height={invH} fill="#3b82f6" rx="2" opacity="0.7" />
                  <rect x={x0} y={200 - 20 - invH - gainH} width={barW} height={gainH} fill="#10b981" rx="2" opacity="0.85" />
                  {b.year % 5 === 0 && (
                    <text x={x0 + barW / 2} y={195} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
                      Y{b.year}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <LegendItem color="#3b82f6" label="Principal added / yr" />
          <LegendItem color="#10b981" label="Compounding gain / yr" />
        </div>
      </div>

      {/* Milestone tracker + snapshot */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Corpus Milestones</h2>
          <div className="space-y-2">
            {milestones.map((m) => (
              <div key={m.label} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span className="text-muted-foreground">Reach {m.label}</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">{m.year}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Retirement Readiness</h2>
          <RetirementGauge
            finalBalance={baseProjection.at(-1)?.balance ?? 0}
            conservative={stressProjection.at(-1)?.balance ?? 0}
            aggressive={optimisticProjection.at(-1)?.balance ?? 0}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Post-Retirement Burn-Down Chart</h2>
            <p className="text-xs text-muted-foreground">Simulate corpus drawdown with monthly withdrawals after accumulation phase.</p>
          </div>
          <button
            onClick={() => setShowBurnDown((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${showBurnDown ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {showBurnDown ? 'Burn-Down On' : 'Burn-Down Off'}
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Slider
            label="Retirement simulation years"
            value={retirementYears}
            min={10}
            max={45}
            step={1}
            onChange={setRetirementYears}
          />
          <Slider
            label="Monthly withdrawal"
            value={withdrawalPerMonth}
            min={20000}
            max={500000}
            step={1000}
            format={shortMoney}
            onChange={setWithdrawalPerMonth}
          />
        </div>
        {showBurnDown && burnDown.length > 1 && (
          <div className="mt-3 overflow-x-auto">
            <svg viewBox="0 0 860 220" className="w-full min-w-[640px] rounded-lg border border-border/50 bg-background/40">
              {burnDown.map((p, i) => {
                const max = Math.max(...burnDown.map((d) => d.balance), 1)
                const x = 40 + (i / Math.max(1, burnDown.length - 1)) * 780
                const y = 20 + 160 - (p.balance / max) * 160
                return <circle key={i} cx={x} cy={y} r="0" fill="transparent" />
              })}
              <path
                d={burnDown
                  .map((p, i) => {
                    const max = Math.max(...burnDown.map((d) => d.balance), 1)
                    const x = 40 + (i / Math.max(1, burnDown.length - 1)) * 780
                    const y = 20 + 160 - (p.balance / max) * 160
                    return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`
                  })
                  .join(' ')}
                fill="none"
                stroke="#ef4444"
                strokeWidth="2.5"
              />
              <line x1="40" y1="180" x2="820" y2="180" stroke="currentColor" opacity="0.2" />
              <text x="40" y="204" className="fill-muted-foreground" style={{ fontSize: 10 }}>Start</text>
              <text x="820" y="204" textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                Year {burnDown.at(-1)?.year ?? retirementYears}
              </text>
            </svg>
            <p className="mt-2 text-xs text-muted-foreground">
              {burnDown.at(-1)?.balance && burnDown.at(-1)!.balance > 0
                ? 'Result: Corpus survives full retirement horizon.'
                : 'Result: Corpus depletes before retirement horizon ends.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Retirement gauge ─────────────────────────────────────────────────────────
function RetirementGauge({
  finalBalance,
  conservative,
  aggressive,
}: {
  finalBalance: number
  conservative: number
  aggressive: number
}) {
  const target = 5e7 // 5 Cr typical FI target
  const basePct = Math.min((finalBalance / target) * 100, 100)
  const consPct = Math.min((conservative / target) * 100, 100)
  const aggPct = Math.min((aggressive / target) * 100, 100)

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">vs ₹5 Cr financial independence target</p>
      {[
        { label: 'Conservative', value: consPct, color: '#06b6d4', amount: conservative },
        { label: 'Base', value: basePct, color: '#10b981', amount: finalBalance },
        { label: 'Aggressive', value: aggPct, color: '#f59e0b', amount: aggressive },
      ].map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{row.label}</span>
            <span className="font-semibold">{shortMoney(row.amount)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${row.value}%`, backgroundColor: row.color }}
            />
          </div>
          <p className="mt-0.5 text-right text-xs text-muted-foreground">{row.value.toFixed(1)}% of FI target</p>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Allocation
// ═══════════════════════════════════════════════════════════════════════════════
function AllocationTab({
  projection,
  allocations,
  years,
}: {
  projection: ProjectionPoint[]
  allocations: AssetAllocation[]
  years: number
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const enabled = allocations.filter((a) => a.enabled)
  const final = projection.at(-1)

  // Stacked area by asset
  const W = 900; const H = 300
  const PAD = { top: 20, right: 24, bottom: 36, left: 68 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const totalMax = Math.max(...projection.map((p) => p.balance), 1)
  const xFn = (p: ProjectionPoint) => PAD.left + (p.year / years) * cW
  const bottom = PAD.top + cH

  return (
    <div className="space-y-5">
      <ChartTooltip state={tooltip} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Treemap */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">Portfolio Concentration Treemap</h2>
          <p className="mb-3 text-xs text-muted-foreground">Rectangle area = corpus share. Color intensity reflects expected return bias.</p>
          <TreemapAllocation allocations={enabled} final={final} setTooltip={setTooltip} />
        </div>

        {/* Sankey */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-1 text-sm font-semibold">Cash Flow Sankey (Monthly Income → Assets)</h2>
          <p className="mb-3 text-xs text-muted-foreground">Visual map of where monthly investable cash is being allocated.</p>
          <SipFlowSankey allocations={enabled} setTooltip={setTooltip} />
        </div>

        {/* Category breakdown */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Equity · Debt · Commodity Split</h2>
          <CategoryBreakdown allocations={allocations} final={final} />
        </div>
      </div>

      {/* Stacked area */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-1 text-sm font-semibold">Asset Growth Over Time</h2>
        <p className="mb-3 text-xs text-muted-foreground">Approximate stacked contribution of each enabled asset to total portfolio</p>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[680px] rounded-lg border border-border/50 bg-background/40">
          {/* Grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((f, i) => {
            const yLine = PAD.top + cH * f
            return (
              <g key={i}>
                <line x1={PAD.left} y1={yLine} x2={W - PAD.right} y2={yLine} stroke="currentColor" opacity="0.08" />
                <text x={PAD.left - 6} y={yLine + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 10 }}>
                  {shortMoney(totalMax * (1 - f))}
                </text>
              </g>
            )
          })}
          {/* X ticks */}
          {[0, Math.floor(years / 2), years].map((tick) => (
            <text key={tick} x={PAD.left + (tick / years) * cW} y={H - 10} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
              Y{tick}
            </text>
          ))}
          {/* Individual asset lines */}
          {enabled.map((a) => {
            const cfg = CONFIG_MAP[a.id]
            return (
              <path
                key={a.id}
                d={polyline(projection, xFn, (p) => {
                  const bal = p.byAsset[a.id]?.balance ?? 0
                  return bottom - (bal / totalMax) * cH
                })}
                fill="none"
                stroke={cfg.color}
                strokeWidth="2"
                opacity="0.8"
              />
            )
          })}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {enabled.map((a) => (
            <LegendItem key={a.id} color={CONFIG_MAP[a.id].color} label={CONFIG_MAP[a.id].label} />
          ))}
        </div>
      </div>
    </div>
  )
}

function TreemapAllocation({
  allocations,
  final,
  setTooltip,
}: {
  allocations: AssetAllocation[]
  final: ProjectionPoint | undefined
  setTooltip: (state: TooltipState | null) => void
}) {
  const rows = allocations
    .map((a) => ({
      id: a.id,
      label: CONFIG_MAP[a.id].label,
      value: final?.byAsset[a.id]?.balance ?? 0,
      color: CONFIG_MAP[a.id].color,
      expected: a.customReturn,
    }))
    .sort((a, b) => b.value - a.value)

  const total = rows.reduce((s, r) => s + r.value, 0)
  const W = 520
  const H = 240
  const mid = total / 2
  let topAcc = 0
  const top: typeof rows = []
  const bottom: typeof rows = []

  for (const row of rows) {
    if (topAcc < mid) {
      top.push(row)
      topAcc += row.value
    } else {
      bottom.push(row)
    }
  }

  const topTotal = top.reduce((s, r) => s + r.value, 0)
  const bottomTotal = bottom.reduce((s, r) => s + r.value, 0)
  const topH = total > 0 ? (topTotal / total) * H : H * 0.5
  const bottomH = H - topH

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-border/50 bg-background/40">
      {/* top row */}
      {(() => {
        let x = 0
        return top.map((r) => {
          const w = topTotal > 0 ? (r.value / topTotal) * W : W / Math.max(1, top.length)
          const node = (
            <g key={`top-${r.id}`}>
              <rect
                x={x}
                y={0}
                width={Math.max(2, w)}
                height={Math.max(2, topH)}
                fill={r.color}
                opacity={Math.min(0.9, 0.45 + r.expected / 40)}
                stroke="rgb(255 255 255 / 0.3)"
                onMouseMove={(e) =>
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    lines: [
                      { label: r.label },
                      { label: 'Corpus', value: shortMoney(r.value), color: r.color },
                      { label: 'Expected return', value: `${r.expected.toFixed(2)}%` },
                    ],
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
              {w > 90 && topH > 40 && (
                <text x={x + 8} y={18} className="fill-white" style={{ fontSize: 11, fontWeight: 600 }}>
                  {r.label}
                </text>
              )}
            </g>
          )
          x += w
          return node
        })
      })()}

      {/* bottom row */}
      {(() => {
        let x = 0
        return bottom.map((r) => {
          const w = bottomTotal > 0 ? (r.value / bottomTotal) * W : W / Math.max(1, bottom.length)
          const node = (
            <g key={`bottom-${r.id}`}>
              <rect
                x={x}
                y={topH}
                width={Math.max(2, w)}
                height={Math.max(2, bottomH)}
                fill={r.color}
                opacity={Math.min(0.9, 0.45 + r.expected / 40)}
                stroke="rgb(255 255 255 / 0.3)"
                onMouseMove={(e) =>
                  setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    lines: [
                      { label: r.label },
                      { label: 'Corpus', value: shortMoney(r.value), color: r.color },
                      { label: 'Expected return', value: `${r.expected.toFixed(2)}%` },
                    ],
                  })
                }
                onMouseLeave={() => setTooltip(null)}
              />
              {w > 90 && bottomH > 40 && (
                <text x={x + 8} y={topH + 18} className="fill-white" style={{ fontSize: 11, fontWeight: 600 }}>
                  {r.label}
                </text>
              )}
            </g>
          )
          x += w
          return node
        })
      })()}
    </svg>
  )
}

function SipFlowSankey({
  allocations,
  setTooltip,
}: {
  allocations: AssetAllocation[]
  setTooltip: (state: TooltipState | null) => void
}) {
  const enabled = allocations.filter((a) => a.enabled && a.monthlyAmount > 0)
  const total = enabled.reduce((s, a) => s + a.monthlyAmount, 0)
  const W = 520
  const H = 240
  const sourceX = 60
  const targetX = 380

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-lg border border-border/50 bg-background/40">
      <rect x={20} y={90} width={80} height={60} rx={8} fill="rgb(59 130 246 / 0.35)" stroke="rgb(59 130 246)" />
      <text x={60} y={116} textAnchor="middle" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
        Monthly
      </text>
      <text x={60} y={132} textAnchor="middle" className="fill-foreground" style={{ fontSize: 11, fontWeight: 600 }}>
        Income
      </text>
      <text x={60} y={148} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 10 }}>
        {shortMoney(total)}
      </text>

      {enabled.map((a, idx) => {
        const y = 16 + idx * (200 / Math.max(1, enabled.length))
        const cfg = CONFIG_MAP[a.id]
        const width = total > 0 ? Math.max(2, (a.monthlyAmount / total) * 26) : 2
        const path = `M ${sourceX + 40} 120 C 180 120, 220 ${y + 12}, ${targetX} ${y + 12}`

        return (
          <g key={a.id}>
            <path
              d={path}
              fill="none"
              stroke={cfg.color}
              strokeOpacity="0.55"
              strokeWidth={width}
              onMouseMove={(e) =>
                setTooltip({
                  x: e.clientX,
                  y: e.clientY,
                  lines: [
                    { label: cfg.label },
                    { label: 'Monthly flow', value: shortMoney(a.monthlyAmount), color: cfg.color },
                    { label: 'Share', value: `${total > 0 ? ((a.monthlyAmount / total) * 100).toFixed(1) : '0'}%` },
                  ],
                })
              }
              onMouseLeave={() => setTooltip(null)}
            />
            <rect x={targetX} y={y} width={120} height={24} rx={6} fill={`${cfg.color}33`} stroke={cfg.color} />
            <text x={targetX + 8} y={y + 15} className="fill-foreground" style={{ fontSize: 10 }}>
              {cfg.label}
            </text>
            <text x={targetX + 112} y={y + 15} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {shortMoney(a.monthlyAmount)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function CategoryBreakdown({
  allocations,
  final,
}: {
  allocations: AssetAllocation[]
  final: ProjectionPoint | undefined
}) {
  const byCategory: Record<string, number> = {}
  allocations
    .filter((a) => a.enabled)
    .forEach((a) => {
      const cat = CONFIG_MAP[a.id].category
      byCategory[cat] = (byCategory[cat] ?? 0) + (final?.byAsset[a.id]?.balance ?? 0)
    })
  const total = Object.values(byCategory).reduce((s, v) => s + v, 0)
  const rows = [
    { label: 'Equity', key: 'equity', color: '#10b981' },
    { label: 'Debt', key: 'debt', color: '#3b82f6' },
    { label: 'Commodity', key: 'commodity', color: '#eab308' },
    { label: 'Liquid', key: 'liquid', color: '#64748b' },
  ]
  return (
    <div className="space-y-3">
      {rows.map((r) => {
        const val = byCategory[r.key] ?? 0
        const pct = total > 0 ? (val / total) * 100 : 0
        return (
          <div key={r.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-semibold">{shortMoney(val)} · {pct.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: r.color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Asset Setup
// ═══════════════════════════════════════════════════════════════════════════════
function AssetsTab({
  allocations,
  onUpdate,
}: {
  allocations: AssetAllocation[]
  onUpdate: (id: AssetClass, patch: Partial<AssetAllocation>) => void
}) {
  const [expanded, setExpanded] = useState<AssetClass | null>('mutual_fund')

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Enable/disable asset classes and configure SIP amounts, lumpsum investments, step-up rates, and expected returns.
      </p>
      {ASSET_CONFIGS.map((cfg) => {
        const alloc = allocations.find((a) => a.id === cfg.id)!
        const isOpen = expanded === cfg.id

        return (
          <div
            key={cfg.id}
            className={`rounded-xl border transition-colors ${alloc.enabled ? 'border-border bg-card' : 'border-border/50 bg-muted/30'}`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-3">
              <button
                onClick={() => onUpdate(cfg.id, { enabled: !alloc.enabled })}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
                  alloc.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                }`}
              >
                {cfg.icon}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{cfg.label}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: `${cfg.color}22`, color: cfg.color }}
                  >
                    {cfg.category}
                  </span>
                  {alloc.enabled && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {shortMoney(alloc.monthlyAmount)}/mo
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{cfg.description}</p>
              </div>
              <button
                onClick={() => setExpanded(isOpen ? null : cfg.id)}
                disabled={!alloc.enabled}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                {isOpen ? <ChevronLeft className="h-4 w-4 rotate-90" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
              </button>
            </div>

            {/* Expanded controls */}
            {isOpen && alloc.enabled && (
              <div className="border-t border-border px-4 py-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Slider
                    label="Monthly SIP / contribution"
                    value={alloc.monthlyAmount}
                    min={0}
                    max={200000}
                    step={500}
                    format={shortMoney}
                    onChange={(v) => onUpdate(cfg.id, { monthlyAmount: v })}
                  />
                  <Slider
                    label="Lumpsum (initial investment)"
                    value={alloc.lumpsum}
                    min={0}
                    max={5000000}
                    step={10000}
                    format={shortMoney}
                    onChange={(v) => onUpdate(cfg.id, { lumpsum: v })}
                  />
                  <Slider
                    label="Annual step-up %"
                    value={alloc.annualStepUpPct}
                    min={0}
                    max={25}
                    step={1}
                    onChange={(v) => onUpdate(cfg.id, { annualStepUpPct: v })}
                  />
                  <Slider
                    label={`Expected annual return % (default: ${cfg.defaultReturn}%)`}
                    value={alloc.customReturn}
                    min={1}
                    max={30}
                    step={0.25}
                    onChange={(v) => onUpdate(cfg.id, { customReturn: v })}
                  />
                </div>
                <div className="mt-3 rounded-lg border border-border bg-background/50 p-3">
                  <p className="mb-2 text-xs text-muted-foreground">
                    Step-up preview: monthly contribution growth over next 10 years
                  </p>
                  <StepUpSparkline
                    monthlyAmount={alloc.monthlyAmount}
                    annualStepUpPct={alloc.annualStepUpPct}
                  />
                </div>
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                  💡 Tax note: {cfg.taxNote}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tab: Insights & Tax
// ═══════════════════════════════════════════════════════════════════════════════
function InsightsTab({
  projection,
  allocations,
  finalBalance,
  finalInvested,
  finalReal,
  years,
  inflationPct,
  safeWithdrawal,
  milestones,
}: {
  projection: ProjectionPoint[]
  allocations: AssetAllocation[]
  finalBalance: number
  finalInvested: number
  finalReal: number
  years: number
  inflationPct: number
  safeWithdrawal: number
  milestones: { label: string; year: string }[]
}) {
  const enabled = allocations.filter((a) => a.enabled)
  const final = projection.at(-1)
  const totalMonthly = enabled.reduce((s, a) => s + a.monthlyAmount, 0)

  // CAGR
  const cagr =
    finalInvested > 0
      ? (Math.pow(finalBalance / finalInvested, 1 / years) - 1) * 100
      : 0

  // Power of compounding analysis
  const midPoint = projection[Math.floor(projection.length / 2)]
  const compoundingKickYear = projection.find((p) => p.growth > p.invested)?.year ?? years

  // Rough tax estimates (simplified)
  const equityBalance = enabled
    .filter((a) => CONFIG_MAP[a.id].category === 'equity')
    .reduce((s, a) => s + (final?.byAsset[a.id]?.balance ?? 0), 0)
  const equityInvested = enabled
    .filter((a) => CONFIG_MAP[a.id].category === 'equity')
    .reduce((s, a) => s + (final?.byAsset[a.id]?.invested ?? 0), 0)
  const equityGain = Math.max(0, equityBalance - equityInvested)
  const ltcgTax = Math.max(0, (equityGain - 100000)) * 0.1

  const debtBalance = enabled
    .filter((a) => CONFIG_MAP[a.id].category === 'debt' && a.id !== 'ppf')
    .reduce((s, a) => s + (final?.byAsset[a.id]?.balance ?? 0), 0)
  const debtInvested = enabled
    .filter((a) => CONFIG_MAP[a.id].category === 'debt' && a.id !== 'ppf')
    .reduce((s, a) => s + (final?.byAsset[a.id]?.invested ?? 0), 0)
  const debtGain = Math.max(0, debtBalance - debtInvested)

  return (
    <div className="space-y-5">
      {/* Key derived metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <InsightCard
          icon={<Zap className="h-4 w-4 text-amber-500" />}
          label="Portfolio CAGR"
          value={`${cagr.toFixed(2)}%`}
          note="Effective compounded annual growth on invested capital"
          accent="text-amber-500"
        />
        <InsightCard
          icon={<Sparkles className="h-4 w-4 text-emerald-500" />}
          label="Compounding overtakes principal"
          value={`Year ${compoundingKickYear}`}
          note="From this year onward gains exceed new contributions"
          accent="text-emerald-500"
        />
        <InsightCard
          icon={<Shield className="h-4 w-4 text-cyan-500" />}
          label="Inflation erosion"
          value={`${(((finalBalance - finalReal) / finalBalance) * 100).toFixed(1)}%`}
          note={`${inflationPct}% inflation erodes this fraction of purchasing power`}
          accent="text-cyan-500"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Compounding visualizer */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Compounding Power Curve</h2>
          <CompoundingCurve projection={projection} years={years} />
        </div>

        {/* Tax estimates */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Estimated Tax Liability (indicative)</h2>
          <div className="space-y-3 text-xs">
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Equity LTCG</span>
                <span className="font-semibold text-red-500">{shortMoney(ltcgTax)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">10% on equity gains above ₹1L. Assumes all redeemed in year {years}.</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">Debt / FD Interest</span>
                <span className="font-semibold text-orange-500">{shortMoney(debtGain * 0.3)}</span>
              </div>
              <p className="mt-1 text-muted-foreground">Rough estimate at 30% income slab on {shortMoney(debtGain)} total interest/gains.</p>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/8 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">PPF (tax-free)</span>
                <span className="font-semibold text-emerald-500">₹0</span>
              </div>
              <p className="mt-1 text-muted-foreground">EEE status - exempt at contribution, accumulation, and withdrawal.</p>
            </div>
            <div className="rounded-lg border border-border p-3 text-muted-foreground italic">
              ⚠ This is illustrative. Consult a CA for your actual tax position.
            </div>
          </div>
        </div>
      </div>

      {/* Planning principles */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Smart Planning Principles for Your Portfolio</h2>
        <div className="grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: '🏆',
              title: 'Start early, increase yearly',
              body: `Your ${years}-year plan benefits enormously from year-1 compounding. A 10% annual step-up doubles contribution power in ~7 years.`,
            },
            {
              icon: '⚖️',
              title: 'Balance risk with life stage',
              body: 'Rule of thumb: 100 minus your age = equity %. Shift to debt/liquid as you approach your goal year.',
            },
            {
              icon: '🛡️',
              title: 'Protect with term + health cover',
              body: 'Your investment plan only works if emergencies don\'t force liquidation. 10× income term cover is essential.',
            },
            {
              icon: '💰',
              title: 'Emergency fund first',
              body: 'Maintain 6–12 months expenses in savings/liquid MF before aggressive SIPs. This is your financial firewall.',
            },
            {
              icon: '📊',
              title: 'Rebalance annually',
              body: 'Once equity outperforms, rebalance to target allocation. Prevents drift and locks in gains systematically.',
            },
            {
              icon: '🎯',
              title: 'Tax harvesting',
              body: 'Book ₹1L equity gains every year tax-free. Reinvest immediately to reset cost basis and avoid future LTCG tax.',
            },
          ].map((tip) => (
            <div key={tip.title} className="rounded-lg border border-border p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-base">{tip.icon}</span>
                <span className="font-semibold text-foreground">{tip.title}</span>
              </div>
              <p className="text-muted-foreground">{tip.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompoundingCurve({ projection, years }: { projection: ProjectionPoint[]; years: number }) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const W = 480; const H = 180
  const PAD = { top: 12, right: 12, bottom: 28, left: 60 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const maxVal = Math.max(...projection.map((p) => p.balance), 1)
  const xFn = (p: ProjectionPoint) => PAD.left + (p.year / years) * cW
  const bottom = PAD.top + cH

  return (
    <>
      <ChartTooltip state={tooltip} />
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-lg border border-border/50 bg-background/40"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const mx = (e.clientX - rect.left) * (W / rect.width)
          const yr = Math.round(((mx - PAD.left) / cW) * years)
          const p = projection[Math.max(0, Math.min(projection.length - 1, yr))]
          if (p) {
            setTooltip({
              x: e.clientX,
              y: e.clientY,
              lines: [
                { label: `Year ${p.year}` },
                { label: 'Invested', value: shortMoney(p.invested), color: '#3b82f6' },
                { label: 'Growth', value: shortMoney(p.growth), color: '#10b981' },
                { label: 'Total', value: shortMoney(p.balance) },
              ],
            })
          }
        }}
        onMouseLeave={() => setTooltip(null)}
      >
        {[0, 0.5, 1].map((f, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={PAD.top + cH * f} x2={W - PAD.right} y2={PAD.top + cH * f} stroke="currentColor" opacity="0.08" />
            <text x={PAD.left - 6} y={PAD.top + cH * f + 4} textAnchor="end" className="fill-muted-foreground" style={{ fontSize: 9 }}>
              {shortMoney(maxVal * (1 - f))}
            </text>
          </g>
        ))}
        <path d={areaPath(projection, xFn, (p) => bottom - (p.balance / maxVal) * cH, bottom)} fill="rgb(16 185 129 / 0.15)" />
        <path d={areaPath(projection, xFn, (p) => bottom - (p.invested / maxVal) * cH, bottom)} fill="rgb(59 130 246 / 0.2)" />
        <path d={polyline(projection, xFn, (p) => bottom - (p.invested / maxVal) * cH)} fill="none" stroke="#3b82f6" strokeWidth="2" />
        <path d={polyline(projection, xFn, (p) => bottom - (p.balance / maxVal) * cH)} fill="none" stroke="#10b981" strokeWidth="2.5" />
        {[0, Math.floor(years / 2), years].map((tick) => (
          <text key={tick} x={PAD.left + (tick / years) * cW} y={H - 8} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 9 }}>
            Y{tick}
          </text>
        ))}
      </svg>
      <div className="mt-2 flex gap-4 text-xs">
        <LegendItem color="#3b82f6" label="Invested" />
        <LegendItem color="#10b981" label="Total corpus" />
      </div>
    </>
  )
}

function InsightCard({
  icon,
  label,
  value,
  note,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  note: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-2xl font-bold tabular-nums tracking-tight ${accent ?? ''}`}>{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{note}</p>
    </div>
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      {dashed ? (
        <svg width="16" height="8" viewBox="0 0 16 8">
          <line x1="0" y1="4" x2="16" y2="4" stroke={color} strokeWidth="2" strokeDasharray="4 3" />
        </svg>
      ) : (
        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: color }} />
      )}
      {label}
    </span>
  )
}

function KpiPill({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/70 px-3 py-2">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className={`text-sm font-bold tabular-nums ${accent ?? ''}`}>{value}</p>
    </div>
  )
}
