import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchCandles, fetchQuotes } from '@/lib/trading/market-data'

/** GET /api/trading/market-data?symbol=RELIANCE.NS&count=100 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const symbol = searchParams.get('symbol')
  const count = parseInt(searchParams.get('count') ?? '100', 10)

  if (!symbol) {
    return NextResponse.json({ error: 'symbol param required' }, { status: 400 })
  }

  const candles = await fetchCandles(symbol, count)
  return NextResponse.json({ symbol, candles })
}

/** POST /api/trading/market-data  body: { symbols: string[] } */
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const symbols: string[] = body.symbols ?? []

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return NextResponse.json({ error: 'symbols array required' }, { status: 400 })
  }

  const quotes = await fetchQuotes(symbols)
  return NextResponse.json({ quotes })
}
