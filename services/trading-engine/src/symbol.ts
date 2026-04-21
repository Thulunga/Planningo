/**
 * Normalize watchlist symbols for Yahoo Finance endpoints.
 * Examples:
 * - TATAMOTORS -> TATAMOTORS.NS
 * - TATAMOTORS.NS -> TATAMOTORS.NS
 * - ^NSEI -> ^NSEI
 */
export function normalizeTradingSymbol(input: string): string {
  const symbol = input.trim().toUpperCase()
  if (!symbol) return symbol

  // Indices should remain untouched (e.g. ^NSEI, ^NSEBANK).
  if (symbol.startsWith('^')) return symbol

  // Already exchange-qualified (e.g. .NS, .BO).
  if (symbol.includes('.')) return symbol

  // Default equities to NSE.
  return `${symbol}.NS`
}

/**
 * Candidate symbol list for resilient Yahoo lookups.
 * For plain symbols we try NSE first, then BSE, then raw fallback.
 */
export function buildSymbolCandidates(input: string): string[] {
  const raw = input.trim().toUpperCase()
  if (!raw) return []

  if (raw.startsWith('^') || raw.includes('.')) {
    return [raw]
  }

  return [`${raw}.NS`, `${raw}.BO`, raw]
}
