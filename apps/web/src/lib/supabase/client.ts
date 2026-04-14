import { createSupabaseBrowserClient } from '@planningo/database'

// Singleton browser client - memoized to avoid creating multiple instances
let client: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseClient() {
  if (!client) {
    client = createSupabaseBrowserClient()
  }
  return client
}
