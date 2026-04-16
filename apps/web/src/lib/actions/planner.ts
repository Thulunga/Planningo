'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const plannerEntrySchema = z.object({
  plan_date: z.string(),
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().optional().nullable(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  color: z.string().default('#8B5CF6'),
  todo_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
})

export async function createPlannerEntry(data: z.infer<typeof plannerEntrySchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = plannerEntrySchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  const { error } = await supabase
    .from('planner_entries')
    .insert({ user_id: user.id, ...validated.data })

  if (error) return { error: error.message }

  revalidatePath('/planner')
  revalidatePath('/')
  return { success: true }
}

export async function updatePlannerEntry(id: string, data: Partial<z.infer<typeof plannerEntrySchema>>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('planner_entries')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/planner')
  return { success: true }
}

export async function deletePlannerEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('planner_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/planner')
  return { success: true }
}
