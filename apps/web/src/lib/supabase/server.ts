import { cookies } from 'next/headers'
import { createSupabaseServerClient } from '@planningo/database'

/**
 * Server-side Supabase client for use in:
 * - Server Components
 * - Route Handlers
 * - Server Actions
 */
export function createClient() {
  const cookieStore = cookies()
  return createSupabaseServerClient(cookieStore)
}

/**
 * Get the authenticated user in server context.
 * Returns null if not authenticated.
 */
export async function getUser() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Get the user profile including app-specific fields.
 * Returns null if not authenticated or profile not found.
 */
export async function getUserProfile() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}
