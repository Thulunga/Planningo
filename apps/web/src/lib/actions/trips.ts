'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const tripSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  start_date: z.string(),
  end_date: z.string(),
  status: z.enum(['planning', 'confirmed', 'ongoing', 'completed', 'cancelled']).default('planning'),
  budget: z.number().optional().nullable(),
  currency: z.string().default('USD'),
  tags: z.array(z.string()).default([]),
})

export async function createTrip(data: z.infer<typeof tripSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = tripSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({ user_id: user.id, ...validated.data })
    .select()
    .single()

  if (error) return { error: error.message }

  // Add creator as owner member
  await supabase.from('trip_members').insert({
    trip_id: trip.id,
    user_id: user.id,
    role: 'owner',
  })

  revalidatePath('/trips')
  return { success: true, trip }
}

export async function updateTrip(id: string, data: Partial<z.infer<typeof tripSchema>>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('trips')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/trips')
  return { success: true }
}

export async function deleteTrip(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('trips')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/trips')
  return { success: true }
}

const itineraryItemSchema = z.object({
  trip_id: z.string().uuid(),
  day_number: z.number().int().min(1),
  category: z.enum(['transport', 'accommodation', 'activity', 'restaurant', 'sightseeing', 'other']).default('activity'),
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  cost: z.number().optional().nullable(),
  currency: z.string().default('USD'),
  booking_ref: z.string().optional().nullable(),
  url: z.string().url().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable(),
  sort_order: z.number().default(0),
})

export async function createItineraryItem(data: z.infer<typeof itineraryItemSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('itinerary_items').insert({
    user_id: user.id,
    ...data,
  })

  if (error) return { error: error.message }

  revalidatePath(`/trips/${data.trip_id}/itinerary`)
  return { success: true }
}

export async function updateItineraryItem(id: string, tripId: string, data: Partial<z.infer<typeof itineraryItemSchema>>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('itinerary_items')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/trips/${tripId}/itinerary`)
  return { success: true }
}

export async function deleteItineraryItem(id: string, tripId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('itinerary_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/trips/${tripId}/itinerary`)
  return { success: true }
}
