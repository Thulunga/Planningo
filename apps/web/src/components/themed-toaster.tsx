'use client'

import { Toaster } from 'sonner'
import { useUIStore } from '@/stores/ui-store'

export function ThemedToaster() {
  const theme = useUIStore((s) => s.theme)
  return <Toaster richColors position="top-right" theme={theme} />
}
