import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, FlaskConical } from 'lucide-react'
import { getBacktestHistory } from '@/lib/actions/backtest'
import { BacktestClient } from '@/components/trading/backtest/backtest-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Backtest — Planningo',
}

export default async function BacktestPage() {
  const historyResult = await getBacktestHistory(20)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/trading"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Backtest</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Replay your 6-indicator strategy on historical NSE data · 5-min candles · no look-ahead bias
          </p>
        </div>
      </div>

      <Suspense>
        <BacktestClient initialHistory={historyResult.data ?? []} />
      </Suspense>
    </div>
  )
}
