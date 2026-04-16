'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

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
}

export function CandlestickChart({ symbol }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<any>(null)
  const candleSeriesRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialise the chart once
  useEffect(() => {
    if (!containerRef.current) return

    let chart: any = null

    async function initChart() {
      const { createChart, ColorType, CrosshairMode } = await import('lightweight-charts')
      const container = containerRef.current
      if (!container) return

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
        height: 280,
      })

      candleSeriesRef.current = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })

      chartRef.current = chart

      // Handle resize
      const resizeObserver = new ResizeObserver(() => {
        chart?.applyOptions({ width: container.clientWidth })
      })
      resizeObserver.observe(container)

      return () => {
        resizeObserver.disconnect()
        chart?.remove()
      }
    }

    initChart()

    return () => {
      chartRef.current?.remove()
      chartRef.current = null
      candleSeriesRef.current = null
    }
  }, [])

  // Load candles when symbol changes
  useEffect(() => {
    if (!symbol || !candleSeriesRef.current) return

    async function loadCandles() {
      setIsLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/trading/market-data?symbol=${encodeURIComponent(symbol)}&count=100`
        )
        const data = await res.json()
        const candles: Candle[] = data.candles ?? []

        if (candles.length === 0) {
          setError('No candle data available for this symbol')
          return
        }

        // lightweight-charts requires time in seconds (UTC)
        const chartData = candles.map((c) => ({
          time: c.time as any,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))

        candleSeriesRef.current?.setData(chartData)
        chartRef.current?.timeScale().fitContent()
      } catch {
        setError('Failed to load chart data')
      } finally {
        setIsLoading(false)
      }
    }

    loadCandles()
  }, [symbol])

  return (
    <div className="relative">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80 backdrop-blur-sm rounded-xl">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}
