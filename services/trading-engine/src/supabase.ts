/**
 * Service-role Supabase client.
 * Uses the SERVICE_ROLE key - bypasses Row Level Security.
 * Only use server-side; never expose to clients.
 */

import { createClient } from '@supabase/supabase-js'
import { config } from './config'

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  }
)

// Typed helper to avoid TypeScript inference issues on dynamic tables
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(table: string): any {
  return (supabase as any).from(table)
}
