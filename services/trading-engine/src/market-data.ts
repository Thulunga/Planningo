/**
 * Market data layer - fetches OHLCV candles directly from Yahoo Finance's
 * chart API (v8). This avoids yahoo-finance2 entirely: the installed build
 * ships only `quote` and `autoc` modules (no `chart`), and the package has
 * no CJS export, making require() impossible from our Node16-CJS output.
 *
 * NSE stocks: "RELIANCE.NS", indices: "^NSEI"
 */

export interface Candle {
  time: number   // Unix timestamp (seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

import { buildSymbolCandidates } from './symbol'

const YF_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

/**
 * Fetch the last `count` 5-minute candles for a symbol.
 * Returns candles in ascending time order.
 */
export async function fetchCandles(symbol: string, count: number = 100): Promise<Candle[]> {
  try {
    const candidates = buildSymbolCandidates(symbol)

    for (const candidate of candidates) {
      // Use 5d (not 2d) so Monday/holiday sessions still include enough bars
      // for indicator warmup and do not get incorrectly flagged as insufficient.
      const url = `${YF_CHART_URL}/${encodeURIComponent(candidate)}?interval=5m&range=5d`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })

      if (!res.ok) {
        continue
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const json = await res.json() as any
      const result = json?.chart?.result?.[0]

      if (!result) {
        continue
      }

      const timestamps: number[] = result.timestamp ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ohlcv = result.indicators?.quote?.[0] as any

      if (!timestamps.length || !ohlcv) {
        continue
      }

      const candles: Candle[] = timestamps
        .map((ts, i) => ({
          time:   ts,
          open:   ohlcv.open?.[i]   as number,
          high:   ohlcv.high?.[i]   as number,
          low:    ohlcv.low?.[i]    as number,
          close:  ohlcv.close?.[i]  as number,
          volume: (ohlcv.volume?.[i] as number) ?? 0,
        }))
        .filter((c) => c.open != null && c.high != null && c.low != null && c.close != null)
        .sort((a, b) => a.time - b.time)

      if (candles.length > 0) {
        if (candidate !== symbol.trim().toUpperCase()) {
          console.log(`[market-data] ${symbol} resolved via ${candidate} (${candles.length} candles)`)
        }
        return candles.slice(-count)
      }
    }

    console.warn(`[market-data] No candles found for ${symbol}; tried: ${candidates.join(', ')}`)
    return []
  } catch (err) {
    console.error(`[market-data] fetchCandles error for ${symbol}:`, err)
    return []
  }
}
