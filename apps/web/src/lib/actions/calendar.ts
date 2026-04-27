'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient, getCachedUser } from '@/lib/supabase/server'

const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start_time: z.string(),
  end_time: z.string(),
  all_day: z.boolean().default(false),
  color: z.string().default('#3B82F6'),
}).refine((d) => new Date(d.start_time) < new Date(d.end_time), {
  message: 'End must be after start',
  path: ['end_time'],
})

export async function createCalendarEvent(data: z.infer<typeof calendarEventSchema>) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = calendarEventSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  const supabase = await createClient()
  const { data: event, error } = await supabase
    .from('calendar_events')
    .insert({ user_id: user.id, ...validated.data })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/')
  return { success: true, event }
}

export async function updateCalendarEvent(
  id: string,
  data: Partial<z.infer<typeof calendarEventSchema>>
) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  if (data.start_time && data.end_time && new Date(data.start_time) >= new Date(data.end_time)) {
    return { error: 'End must be after start' }
  }

  const supabase = await createClient()
  const { data: event, error } = await supabase
    .from('calendar_events')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/')
  return { success: true, event }
}

export async function deleteCalendarEvent(id: string) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('calendar_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/')
  return { success: true }
}

/** Restore a soft-deleted event (clears deleted_at). Powers the Undo flow. */
export async function restoreCalendarEvent(id: string) {
  const user = await getCachedUser()
  if (!user) return { error: 'Not authenticated' }

  const supabase = await createClient()
  const { data: event, error } = await supabase
    .from('calendar_events')
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  revalidatePath('/')
  return { success: true, event }
}

/**
 * Fetch events for an arbitrary range. Used for lazy-loading as the user
 * navigates the calendar beyond the initial window.
 */
export async function getEventsInRange(rangeStart: string, rangeEnd: string) {
  const user = await getCachedUser()
  if (!user) return { events: [] }

  const supabase = await createClient()
  const { data } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', user.id)
    .gte('start_time', rangeStart)
    .lte('end_time', rangeEnd)
    .is('deleted_at', null)
    .order('start_time', { ascending: true })

  return { events: data ?? [] }
}
