/**
 * POST /api/trading/paper-trade
 * Manually close an open paper trade at the current market price.
 * body: { tradeId: string, exitPrice: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { closeTrade } from '@/lib/trading/paper-trader'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(supabase: any, table: string) {
  return supabase.from(table)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== process.env.ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { tradeId, exitPrice } = body

  if (!tradeId || typeof exitPrice !== 'number') {
    return NextResponse.json({ error: 'tradeId and exitPrice required' }, { status: 400 })
  }

  // Fetch the trade to validate ownership
  const { data: trade, error: fetchErr } = await db(supabase, 'paper_trades')
    .select('*')
    .eq('id', tradeId)
    .eq('user_id', user.id)
    .eq('status', 'OPEN')
    .single()

  if (fetchErr || !trade) {
    return NextResponse.json({ error: 'Trade not found or already closed' }, { status: 404 })
  }

  const result = await closeTrade(user.id, trade, exitPrice, 'CLOSED')
  return NextResponse.json(result)
}
