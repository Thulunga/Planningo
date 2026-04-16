'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const calendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start_time: z.string(),
  end_time: z.string(),
  all_day: z.boolean().default(false),
  color: z.string().default('#3B82F6'),
})

export async function createCalendarEvent(data: z.infer<typeof calendarEventSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = calendarEventSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

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

export async function updateCalendarEvent(id: string, data: Partial<z.infer<typeof calendarEventSchema>>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('calendar_events')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  return { success: true }
}

export async function deleteCalendarEvent(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('calendar_events')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/calendar')
  return { success: true }
}
