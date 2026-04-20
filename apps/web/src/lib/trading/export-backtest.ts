export interface BacktestExportPayload {
  exportVersion: 1
  exportedAt: string
  run: Record<string, unknown>
  trades: Record<string, unknown>[]
  equityCurve: { time: string; equity: number; drawdown: number; drawdownAbs: number }[]
  analysis?: Record<string, unknown>
}

export async function exportBacktestJson(
  payload: BacktestExportPayload,
  filename: string,
): Promise<void> {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
