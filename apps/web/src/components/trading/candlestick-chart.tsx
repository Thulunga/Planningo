'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'

interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface CandlestickChartProps {
  symbol: string
  className?: string
  height?: number
}

export function CandlestickChart({ symbol, className, height }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const [chartReady, setChartReady] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Initialise chart (once) ────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return

    let chart: any = null
    let resizeObserver: ResizeObserver | null = null
    let cancelled = false

    async function initChart() {
      const { createChart, ColorType, CrosshairMode, CandlestickSeries } = await import('lightweight-charts')
      if (cancelled || !containerRef.current) return

      const container = containerRef.current
      const isDark = document.documentElement.classList.contains('dark')

      chart = createChart(container, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: isDark ? '#94a3b8' : '#64748b',
        },
        grid: {
          vertLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
          horzLines: { color: isDark ? '#1e293b' : '#f1f5f9' },
        },
        crosshair: { mode: CrosshairMode.Normal },
        rightPriceScale: { borderColor: isDark ? '#334155' : '#e2e8f0' },
        timeScale: {
          borderColor: isDark ? '#334155' : '#e2e8f0',
          timeVisible: true,
          secondsVisible: false,
        },
        width: container.clientWidth,
        height: Math.max(300, Math.min(900, height ?? container.clientHeight)),
      })

      candleSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })

      chartRef.current = chart

      resizeObserver = new ResizeObserver(() => {
        if (container && chart) {
          chart.applyOptions({
            width: container.clientWidth,
            height: Math.max(300, Math.min(900, height ?? container.clientHeight)),
          })
        }
      })
      resizeObserver.observe(container)

      // Signal that the chart is ready to receive data (idempotent).
      if (!cancelled) setChartReady((prev) => (prev ? prev : true))
    }

    initChart()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      chart?.remove()
      chartRef.current = null
      candleSeriesRef.current = null
    }
  }, [])

  // Keep chart canvas height in sync with parent-driven target height.
  useEffect(() => {
    const chart = chartRef.current
    const container = containerRef.current
    if (!chart || !container) return

    chart.applyOptions({
      width: container.clientWidth,
      height: Math.max(300, Math.min(900, height ?? container.clientHeight)),
    })
  }, [height])

  // ── Load candles when symbol changes or chart becomes ready ───────────
  useEffect(() => {
    if (!symbol || !chartReady || !candleSeriesRef.current) return

    let cancelled = false

    async function loadCandles() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/trading/market-data?symbol=${encodeURIComponent(symbol)}&count=100`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const candles: Candle[] = data.candles ?? []

        if (cancelled) return

        if (candles.length === 0) {
          setError('No candle data available - market may be closed')
          return
        }

        // lightweight-charts needs data sorted by time ascending, no duplicates
        const seen = new Set<number>()
        const chartData = candles
          .filter((c) => {
            if (seen.has(c.time)) return false
            seen.add(c.time)
            return c.open > 0 && c.high > 0 && c.low > 0 && c.close > 0
          })
          .sort((a, b) => a.time - b.time)
          .map((c) => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }))

        if (chartData.length === 0) {
          setError('Candle data is empty or malformed')
          return
        }

        candleSeriesRef.current?.setData(chartData)
        chartRef.current?.timeScale().fitContent()
      } catch (err) {
        if (!cancelled) setError(`Failed to load chart data: ${err instanceof Error ? err.message : 'unknown error'}`)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    loadCandles()
    return () => { cancelled = true }
  }, [symbol, chartReady])  // chartReady in deps - loads as soon as chart is initialised

  return (
    <div
      className={`relative w-full min-h-[300px] h-full ${className ?? ''}`}
      style={height ? { height: `${Math.max(300, Math.min(900, height))}px` } : undefined}
    >
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && !isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2">
          <AlertCircle className="h-5 w-5 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
