import { cookies } from 'next/headers'
import { cache } from 'react'
import { createSupabaseServerClient } from '@planningo/database'

/**
 * Server-side Supabase client for use in:
 * - Server Components
 * - Route Handlers
 * - Server Actions
 */
export async function createClient() {
  const cookieStore = await cookies()
  return createSupabaseServerClient(cookieStore)
}

/**
 * Cached auth user — deduplicates supabase.auth.getUser() within the same
 * server render. All server components + server actions called during the
 * same request share ONE network round-trip to Supabase Auth.
 */
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

/**
 * Get the authenticated user in server context.
 * Returns null if not authenticated.
 */
export async function getUser() {
  return getCachedUser()
}

/**
 * Get the user profile including app-specific fields.
 * Wrapped with React cache() so multiple calls within the same server render
 * (e.g. layout.tsx + page.tsx) share one Supabase round-trip.
 * Returns null if not authenticated or profile not found.
 */
export const getUserProfile = cache(async () => {
  const user = await getCachedUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
})
