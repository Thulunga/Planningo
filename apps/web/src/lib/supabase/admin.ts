import { createClient } from './server'

/**
 * Check if the current user is an admin.
 * Admins are identified by their email matching ADMIN_EMAIL
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) return false

  // Check against admin email environment variable
  const adminEmail = process.env.ADMIN_EMAIL
  return adminEmail ? user.email === adminEmail : false
}

/**
 * Get current user's email
 */
export async function getUserEmail(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user?.email || null
}
