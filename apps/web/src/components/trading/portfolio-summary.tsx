'use client'

import { TrendingUp, TrendingDown, Wallet, Target, RotateCcw } from 'lucide-react'
import { Button } from '@planningo/ui'
import { cn } from '@planningo/ui'
import { resetPortfolio } from '@/lib/actions/trading'
import { toast } from 'sonner'

interface Portfolio {
  virtual_capital: number
  available_cash: number
  total_pnl: number
  total_trades: number
  winning_trades: number
}

interface PortfolioSummaryProps {
  portfolio: Portfolio
  onRefresh?: () => void
}

function formatINR(amount: number): string {
  const abs = Math.abs(amount)
  if (abs >= 100000) {
    return `₹${(abs / 100000).toFixed(2)}L`
  }
  return `₹${abs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function PortfolioSummary({ portfolio, onRefresh }: PortfolioSummaryProps) {
  const totalValue = portfolio.available_cash + (portfolio.virtual_capital - portfolio.available_cash) + portfolio.total_pnl
  const overallPnlPct = (portfolio.total_pnl / portfolio.virtual_capital) * 100
  const winRate =
    portfolio.total_trades > 0
      ? ((portfolio.winning_trades / portfolio.total_trades) * 100).toFixed(0)
      : '-'
  const losingTrades = portfolio.total_trades - portfolio.winning_trades

  const isPositive = portfolio.total_pnl >= 0

  async function handleReset() {
    if (!confirm('Reset paper portfolio to ₹1,00,000? All open positions will be closed.')) return
    const result = await resetPortfolio()
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Portfolio reset to ₹1,00,000')
      onRefresh?.()
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Paper Portfolio
          </h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={handleReset}
          title="Reset portfolio"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Total P&L - hero number */}
      <div>
        <div
          className={cn(
            'text-3xl font-bold tabular-nums',
            isPositive ? 'text-emerald-500' : 'text-red-500'
          )}
        >
          {isPositive ? '+' : '-'}
          {formatINR(portfolio.total_pnl)}
        </div>
        <div className={cn('text-sm font-medium', isPositive ? 'text-emerald-500' : 'text-red-500')}>
          {isPositive ? (
            <TrendingUp className="inline h-3.5 w-3.5 mr-1" />
          ) : (
            <TrendingDown className="inline h-3.5 w-3.5 mr-1" />
          )}
          {isPositive ? '+' : ''}{overallPnlPct.toFixed(2)}% overall return
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Available Cash"
          value={formatINR(portfolio.available_cash)}
          valueClass="text-foreground"
        />
        <Stat
          label="Virtual Capital"
          value={formatINR(portfolio.virtual_capital)}
          valueClass="text-foreground"
        />
        <Stat
          label="Win Rate"
          value={winRate === '-' ? '-' : `${winRate}%`}
          sub={portfolio.total_trades > 0 ? `${portfolio.winning_trades}W / ${losingTrades}L` : undefined}
          valueClass={
            winRate !== '-' && parseInt(winRate) >= 50 ? 'text-emerald-500' : 'text-red-400'
          }
        />
        <Stat
          label="Total Trades"
          value={String(portfolio.total_trades)}
          valueClass="text-foreground"
        />
      </div>

      {/* Capital bar */}
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
          <span>Cash utilised</span>
          <span>
            {(((portfolio.virtual_capital - portfolio.available_cash) / portfolio.virtual_capital) * 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${Math.min(100, ((portfolio.virtual_capital - portfolio.available_cash) / portfolio.virtual_capital) * 100)}%`,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>₹0</span>
          <span>{formatINR(portfolio.virtual_capital)}</span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Target className="h-3 w-3" />
        <span>Risk per trade: 20% of available cash · Max 5 positions</span>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  valueClass,
}: {
  label: string
  value: string
  sub?: string
  valueClass?: string
}) {
  return (
    <div className="rounded-lg bg-muted/40 px-3 py-2.5">
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={cn('font-semibold text-sm tabular-nums', valueClass)}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  )
}
