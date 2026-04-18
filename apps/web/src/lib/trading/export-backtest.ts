export interface BacktestExportPayload {
  exportVersion: 1
  exportedAt: string
  run: Record<string, unknown>
  trades: Record<string, unknown>[]
  equityCurve: { time: string; equity: number; drawdown: number; drawdownAbs: number }[]
}

export async function exportBacktestGzip(
  payload: BacktestExportPayload,
  filename: string,
): Promise<void> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload, null, 2))

  const cs = new CompressionStream('gzip')
  const writer = cs.writable.getWriter()
  await writer.write(bytes)
  await writer.close()

  const buf = await new Response(cs.readable).arrayBuffer()
  const blob = new Blob([buf], { type: 'application/gzip' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
