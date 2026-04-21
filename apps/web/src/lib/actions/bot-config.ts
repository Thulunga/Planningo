'use server'

import { createClient } from '@/lib/supabase/server'
import type { BotConfig } from '@/stores/trading-config-store'
import { BOT_CONFIG_DEFAULTS } from '@/stores/trading-config-store'

/**
 * Persist the current BotConfig to the `bot_config` table (upsert).
 */
export async function saveBotConfigAction(config: BotConfig): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await (supabase as any)
    .from('bot_config')
    .upsert(
      { user_id: user.id, config, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) return { error: error.message }
  return {}
}

/**
 * Load the saved BotConfig from DB. Falls back to defaults if no row exists.
 */
export async function loadBotConfigAction(): Promise<{ config: BotConfig; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { config: BOT_CONFIG_DEFAULTS }

  const { data, error } = await (supabase as any)
    .from('bot_config')
    .select('config')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) return { config: BOT_CONFIG_DEFAULTS, error: error.message }
  if (!data) return { config: BOT_CONFIG_DEFAULTS }

  // Merge with defaults so new fields added in future deploys don't break old rows
  return { config: { ...BOT_CONFIG_DEFAULTS, ...(data.config as Partial<BotConfig>) } }
}
