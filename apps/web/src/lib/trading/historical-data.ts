/**
 * Historical candle fetcher for backtesting.
 * Uses the Yahoo Finance v8 chart API — same endpoint as market-data.ts.
 *
 * Yahoo Finance limitations:
 *   - 5-min data:  available for the last ~60 days only
 *   - 1d data:     available for any historical period
 *
 * Strategy:
 *   - If the entire date range is within the last 58 days → fetch 5-min candles
 *   - Otherwise → fetch daily candles (less granular; good for multi-month strategy eval)
 */

import type { Candle } from '@planningo/trading-core'

const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0' }
const FIVE_MIN_LIMIT_DAYS = 58

export type CandleInterval = '5m' | '1d'

export interface FetchCandlesResult {
  candles: Candle[]
  interval: CandleInterval
  warning?: string   // set when falling back to daily
}

export async function fetchHistoricalCandles(
  symbol: string,
  from: Date,
  to: Date,
): Promise<FetchCandlesResult> {
  const daysAgo = (Date.now() - from.getTime()) / (1000 * 60 * 60 * 24)
  const interval: CandleInterval = daysAgo <= FIVE_MIN_LIMIT_DAYS ? '5m' : '1d'

  const p1 = Math.floor(from.getTime() / 1000)
  const p2 = Math.floor(to.getTime() / 1000)

  const url =
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}` +
    `?interval=${interval}&period1=${p1}&period2=${p2}&includePrePost=false`

  try {
    const res = await fetch(url, { headers: YF_HEADERS })
    if (!res.ok) {
      throw new Error(`Yahoo Finance returned ${res.status}`)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = json?.chart?.result?.[0] as any
    if (!result) throw new Error('No chart data returned')

    const timestamps: number[] = result.timestamp ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = result.indicators?.quote?.[0] as any

    if (!quote || timestamps.length === 0) {
      return { candles: [], interval, warning: 'No candles in the requested range' }
    }

    const candles: Candle[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i]  as number | null
      const h = quote.high?.[i]  as number | null
      const l = quote.low?.[i]   as number | null
      const c = quote.close?.[i] as number | null
      if (o == null || h == null || l == null || c == null) continue
      candles.push({
        time:   timestamps[i]!,
        open:   o,
        high:   h,
        low:    l,
        close:  c,
        volume: (quote.volume?.[i] as number | null) ?? 0,
      })
    }

    candles.sort((a, b) => a.time - b.time)

    return {
      candles,
      interval,
      warning: interval === '1d'
        ? 'Date range exceeds 58 days — using daily candles. Results are indicative only; strategy is tuned for 5-min intraday data.'
        : undefined,
    }
  } catch (err) {
    throw new Error(
      `Failed to fetch candles for ${symbol}: ${err instanceof Error ? err.message : String(err)}`
    )
  }
}
