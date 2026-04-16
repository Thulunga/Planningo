/**
 * Market data layer using yahoo-finance2.
 * NSE stocks use the ".NS" suffix (e.g. "RELIANCE.NS").
 * Indices: "^NSEI" (Nifty 50), "^NSEBANK" (Bank Nifty).
 */

import yahooFinance from 'yahoo-finance2'

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
    // Fetch 2 days of 5-min data to ensure we get enough intraday candles
    const result = await yahooFinance.chart(symbol, {
      interval: '5m' as any,
      range: '2d' as any,
    }) as any

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

    // Return only the last `count` candles
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
    const result = await yahooFinance.quote(symbol) as any
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
    const results = await yahooFinance.search(query) as any
    return ((results?.quotes ?? []) as any[])
      .filter(
        (q: any) =>
          q.quoteType === 'EQUITY' &&
          typeof q.symbol === 'string' &&
          (q.symbol.endsWith('.NS') || q.symbol.endsWith('.BO'))
      )
      .slice(0, 10)
      .map((q: any) => ({
        symbol: q.symbol as string,
        name: q.longname ?? q.shortname ?? q.symbol,
      }))
  } catch (err) {
    console.error('[market-data] searchStocks error:', err)
    return []
  }
}
