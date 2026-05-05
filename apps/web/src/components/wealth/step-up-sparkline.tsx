type StepUpSparklineProps = {
  monthlyAmount: number
  annualStepUpPct: number
  years?: number
  className?: string
}

function buildSeries(monthlyAmount: number, annualStepUpPct: number, years: number) {
  return Array.from({ length: years }, (_, idx) => {
    return monthlyAmount * Math.pow(1 + annualStepUpPct / 100, idx)
  })
}

export function StepUpSparkline({
  monthlyAmount,
  annualStepUpPct,
  years = 10,
  className,
}: StepUpSparklineProps) {
  const data = buildSeries(monthlyAmount, annualStepUpPct, years)
  const W = 240
  const H = 72
  const PAD = { top: 6, right: 8, bottom: 10, left: 8 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)

  const x = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * cW
  const y = (v: number) => {
    const range = max - min || 1
    return PAD.top + cH - ((v - min) / range) * cH
  }

  const linePath = data
    .map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`)
    .join(' ')

  const areaPath = `${linePath} L ${x(data.length - 1).toFixed(1)} ${(H - PAD.bottom).toFixed(1)} L ${x(0).toFixed(1)} ${(H - PAD.bottom).toFixed(1)} Z`

  const endValue = data[data.length - 1] ?? 0
  const growthPct = monthlyAmount > 0 ? ((endValue - monthlyAmount) / monthlyAmount) * 100 : 0

  return (
    <div className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-border/70 bg-background/50">
        <defs>
          <linearGradient id="stepup_fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(16 185 129 / 0.30)" />
            <stop offset="100%" stopColor="rgb(16 185 129 / 0.05)" />
          </linearGradient>
        </defs>

        <path d={areaPath} fill="url(#stepup_fill)" />
        <path d={linePath} fill="none" stroke="rgb(16 185 129)" strokeWidth="2" />

        <circle cx={x(0)} cy={y(data[0] ?? 0)} r="2.5" fill="rgb(16 185 129)" />
        <circle cx={x(data.length - 1)} cy={y(endValue)} r="2.5" fill="rgb(16 185 129)" />
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Year 1: {Math.round(monthlyAmount).toLocaleString('en-IN')}/mo</span>
        <span>Year {years}: {Math.round(endValue).toLocaleString('en-IN')}/mo</span>
      </div>
      <div className="text-[10px] text-emerald-600 dark:text-emerald-400">
        +{growthPct.toFixed(1)}% contribution growth over {years} years
      </div>
    </div>
  )
}
