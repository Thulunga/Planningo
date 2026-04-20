/**
 * Normalize user-provided symbols for Yahoo Finance.
 * Examples:
 * - TATAMOTORS   -> TATAMOTORS.NS
 * - TATAMOTORS.NS -> TATAMOTORS.NS
 * - ^NSEI        -> ^NSEI
 */
export function normalizeTradingSymbol(input: string): string {
  const symbol = input.trim().toUpperCase()
  if (!symbol) return symbol

  // Yahoo indices are prefixed with ^ and should not get exchange suffixes.
  if (symbol.startsWith('^')) return symbol

  // Already exchange-qualified (e.g. .NS, .BO).
  if (symbol.includes('.')) return symbol

  // Default to NSE equities.
  return `${symbol}.NS`
}
