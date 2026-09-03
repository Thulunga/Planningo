'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TooltipProvider } from '@planningo/ui'
import { getQueryClient } from '@/lib/query/get-query-client'

export function Providers({ children }: Readonly<{ children: React.ReactNode }>) {
  // Browser: a single stable client (getQueryClient memoizes it in the browser).
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={300}>
        {children}
      </TooltipProvider>
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}
