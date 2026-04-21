import Link from 'next/link'
import { ArrowLeft, Settings2 } from 'lucide-react'
import { BotConfigPanel } from '@/components/trading/manage/bot-config-panel'

export const metadata = {
  title: 'Bot Manager - Planningo',
}

export default function BotManagePage() {
  return (
    <div className="space-y-6 pb-12">
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
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold tracking-tight">Bot Manager</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure indicators, filters & risk rules. Settings apply to both live paper trading and backtesting.
          </p>
        </div>
      </div>

      <BotConfigPanel />
    </div>
  )
}
