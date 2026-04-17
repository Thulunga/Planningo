/**
 * Market data layer using yahoo-finance2.
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

/**
 * Fetch the last `count` 5-minute candles for a symbol.
 * Returns candles in ascending time order.
 */
export async function fetchCandles(symbol: string, count: number = 100): Promise<Candle[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = (await import('yahoo-finance2')).default as any
    const result = await yf.chart(symbol, {
      interval: '5m',
      range: '2d',
    })

    if (!result?.quotes || result.quotes.length === 0) {
      return []
    }

    const candles: Candle[] = (result.quotes as any[])
      .filter(
        (q: any) =>
          q.date != null &&
          q.open != null &&
          q.high != null &&
          q.low != null &&
          q.close != null
      )
      .map((q: any) => ({
        time: Math.floor(new Date(q.date).getTime() / 1000),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume ?? 0,
      }))
      .sort((a: Candle, b: Candle) => a.time - b.time)

    return candles.slice(-count)
  } catch (err) {
    console.error(`[market-data] fetchCandles error for ${symbol}:`, err)
    return []
  }
}
