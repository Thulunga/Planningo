/**
 * Market data layer using direct Yahoo Finance HTTP API.
 * NSE stocks use the ".NS" suffix (e.g. "RELIANCE.NS").
 * Indices: "^NSEI" (Nifty 50), "^NSEBANK" (Bank Nifty).
 */

const YF_HEADERS = { 'User-Agent': 'Mozilla/5.0' }

export interface Candle {
  time: number   // Unix timestamp (seconds)
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  marketCap?: number
  name: string
  timestamp: number
}

/**
 * Fetch the last `count` 5-minute candles for a symbol.
 * Returns candles in ascending time order.
 */
export async function fetchCandles(
  symbol: string,
  count: number = 100
): Promise<Candle[]> {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=5m&range=2d`
    const res = await fetch(url, { headers: YF_HEADERS })
    if (!res.ok) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any
    const result = json?.chart?.result?.[0]
    if (!result) return []

    const timestamps: number[] = result.timestamp ?? []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quote = result.indicators?.quote?.[0] as any

    if (!quote || timestamps.length === 0) return []

    const candles: Candle[] = []
    for (let i = 0; i < timestamps.length; i++) {
      const o = quote.open?.[i]
      const h = quote.high?.[i]
      const l = quote.low?.[i]
      const c = quote.close?.[i]
      if (o == null || h == null || l == null || c == null) continue
      candles.push({
        time: timestamps[i],
        open: o,
        high: h,
        low: l,
        close: c,
        volume: quote.volume?.[i] ?? 0,
      })
    }

    candles.sort((a, b) => a.time - b.time)
    return candles.slice(-count)
  } catch (err) {
    console.error(`[market-data] fetchCandles error for ${symbol}:`, err)
    return []
  }
}

/**
 * Fetch a real-time quote for a symbol.
 */
export async function fetchQuote(symbol: string): Promise<Quote | null> {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`
    const res = await fetch(url, { headers: YF_HEADERS })
    if (!res.ok) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = json?.quoteResponse?.result?.[0] as any
    if (!result) return null

    return {
      symbol,
      price: result.regularMarketPrice ?? 0,
      change: result.regularMarketChange ?? 0,
      changePercent: result.regularMarketChangePercent ?? 0,
      high: result.regularMarketDayHigh ?? 0,
      low: result.regularMarketDayLow ?? 0,
      open: result.regularMarketOpen ?? 0,
      previousClose: result.regularMarketPreviousClose ?? 0,
      volume: result.regularMarketVolume ?? 0,
      marketCap: result.marketCap,
      name: result.longName ?? result.shortName ?? symbol,
      timestamp: Date.now(),
    }
  } catch (err) {
    console.error(`[market-data] fetchQuote error for ${symbol}:`, err)
    return null
  }
}

/**
 * Fetch quotes for multiple symbols in parallel.
 */
export async function fetchQuotes(symbols: string[]): Promise<Quote[]> {
  const results = await Promise.allSettled(symbols.map((s) => fetchQuote(s)))
  return results
    .filter((r): r is PromiseFulfilledResult<Quote> => r.status === 'fulfilled' && r.value !== null)
    .map((r) => r.value)
}

/**
 * Search NSE stocks by keyword (for the watchlist add dialog).
 */
export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>> {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
    const res = await fetch(url, { headers: YF_HEADERS })
    if (!res.ok) return []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any
    return ((json?.quotes ?? []) as any[])  // eslint-disable-line @typescript-eslint/no-explicit-any
      .filter(
        (q: any) =>  // eslint-disable-line @typescript-eslint/no-explicit-any
          q.quoteType === 'EQUITY' &&
          typeof q.symbol === 'string' &&
          (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'))
      )
      .slice(0, 10)
      .map((q: any) => ({  // eslint-disable-line @typescript-eslint/no-explicit-any
        symbol: q.symbol as string,
        name: q.longname ?? q.shortname ?? q.symbol,
      }))
  } catch (err) {
    console.error('[market-data] searchStocks error:', err)
    return []
  }
}
