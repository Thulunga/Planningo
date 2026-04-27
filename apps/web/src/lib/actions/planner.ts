'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, getCachedUser } from '@/lib/supabase/server'

const plannerEntrySchema = z.object({
  plan_date: z.string(),
  title: z.string().min(1, 'Title is required').max(200),
  notes: z.string().optional().nullable(),
  start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)'),
  end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Invalid time format (HH:MM)'),
  color: z.string().default('#8B5CF6'),
  todo_id: z.string().uuid().optional().nullable(),
  event_id: z.string().uuid().optional().nullable(),
}).refine((d) => d.start_time < d.end_time, {
  message: 'End time must be after start time',
  path: ['end_time'],
})

export async function createPlannerEntry(data: z.infer<typeof plannerEntrySchema>) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = plannerEntrySchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  const supabase = await createClient()
  const { data: entry, error } = await supabase
    .from('planner_entries')
    .insert({ user_id: user.id, ...validated.data })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/planner')
  revalidatePath('/')
  return { success: true, entry }
}

export async function updatePlannerEntry(
  id: string,
  data: Partial<z.infer<typeof plannerEntrySchema>>
) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  if (data.start_time && data.end_time && data.start_time >= data.end_time) {
    return { error: 'End time must be after start time' }
  }

  const supabase = await createClient()
  const { data: entry, error } = await supabase
    .from('planner_entries')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/planner')
  revalidatePath('/')
  return { success: true, entry }
}

export async function deletePlannerEntry(id: string) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('planner_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/planner')
  revalidatePath('/')
  return { success: true }
}

/** Re-insert a previously-deleted entry to power the Undo flow. */
export async function restorePlannerEntry(
  data: z.infer<typeof plannerEntrySchema> & { id?: string }
) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = plannerEntrySchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  const supabase = await createClient()
  const insertPayload: Record<string, unknown> = { user_id: user.id, ...validated.data }
  if (data.id) insertPayload.id = data.id

  const { data: entry, error } = await supabase
    .from('planner_entries')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(insertPayload as any)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/planner')
  revalidatePath('/')
  return { success: true, entry }
}

/** Lightweight dropdown sources for linking a planner block to a todo or event. */
export async function getLinkableSources(date: string) {
  const user = await getCachedUser()
  if (!user) return { todos: [], events: [] }

  const supabase = await createClient()
  const dayStart = new Date(`${date}T00:00:00`).toISOString()
  const dayEnd = new Date(`${date}T23:59:59`).toISOString()

  const [todosRes, eventsRes] = await Promise.all([
    supabase
      .from('todos')
      .select('id, title')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .neq('status', 'done')
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('calendar_events')
      .select('id, title')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .order('start_time', { ascending: true })
      .limit(50),
  ])

  return {
    todos: todosRes.data ?? [],
    events: eventsRes.data ?? [],
  }
}
