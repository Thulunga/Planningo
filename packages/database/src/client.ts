import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { Database } from './types'

/**
 * For use in Client Components ('use client')
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}

/**
 * For use in Server Components, Route Handlers, Server Actions, and Middleware.
 * Requires cookie store from next/headers.
 */
export function createSupabaseServerClient(
  cookieStore: {
    getAll: () => { name: string; value: string }[]
    set: (name: string, value: string, options: Record<string, unknown>) => void
  }
) {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component - cookies can't be set
            // The middleware is responsible for refreshing sessions
          }
        },
      },
    }
  )
}

/**
 * Service role client - ONLY use in Edge Functions or trusted server code.
 * NEVER expose to the browser.
 */
export function createSupabaseServiceClient() {
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    }
  )
}
