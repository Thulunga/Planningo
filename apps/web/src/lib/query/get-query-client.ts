import {
  QueryClient,
  defaultShouldDehydrateQuery,
  isServer,
} from '@tanstack/react-query'
import { cache } from 'react'

/**
 * Shared QueryClient factory used by both the browser (providers.tsx) and the
 * server (per-request prefetch). Keeping the config in one place ensures SSR
 * hydration and client caching behave identically.
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes: back-nav serves cache instantly
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
      dehydrate: {
        // Include pending queries so a non-blocking server prefetch streams to
        // the client instead of forcing the RSC to await the database.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined

/**
 * Returns a request-scoped client on the server (via React cache) and a single
 * long-lived client in the browser.
 */
export function getQueryClient() {
  if (isServer) {
    return getServerQueryClient()
  }
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

const getServerQueryClient = cache(makeQueryClient)
