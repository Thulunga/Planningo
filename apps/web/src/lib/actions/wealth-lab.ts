'use server'

import { createClient } from '@/lib/supabase/server'

export type WealthLabPersistedConfig = {
  allocations?: unknown
  years?: number
  inflationPct?: number
  yearlyBonus?: number
  monthlyIncome?: number
  yearlyIncomeStepUpPct?: number
  monthlyBudget?: number
  expectedMonthlySavings?: number
  currentMonthlyExpenses?: number
}

export async function saveWealthLabConfigAction(
  config: WealthLabPersistedConfig
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { error: 'Not authenticated' }

    const { error } = await (supabase as any)
      .from('wealth_lab_config')
      .upsert(
        {
          user_id: user.id,
          config,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) return { error: error.message }
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Failed to save Wealth Lab config' }
  }
}

export async function loadWealthLabConfigAction(): Promise<{
  config: WealthLabPersistedConfig | null
  isFirstTime: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { config: null, isFirstTime: true }

    const { data, error } = await (supabase as any)
      .from('wealth_lab_config')
      .select('config')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) {
      return { config: null, isFirstTime: true, error: error.message }
    }

    if (!data?.config) {
      return { config: null, isFirstTime: true }
    }

    return {
      config: data.config as WealthLabPersistedConfig,
      isFirstTime: false,
    }
  } catch (error) {
    return {
      config: null,
      isFirstTime: true,
      error: error instanceof Error ? error.message : 'Failed to load Wealth Lab config',
    }
  }
}
