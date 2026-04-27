import { getCachedUser } from './server'

/**
 * Check if the current user is an admin.
 * Admins are identified by their email matching ADMIN_EMAIL.
 * Uses getCachedUser so the auth call is shared with getUserProfile in the same render.
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCachedUser()

  if (!user?.email) return false

  const adminEmail = process.env.ADMIN_EMAIL
  return adminEmail ? user.email === adminEmail : false
}

/**
 * Get current user's email
 */
export async function getUserEmail(): Promise<string | null> {
  const user = await getCachedUser()
  return user?.email ?? null
}
