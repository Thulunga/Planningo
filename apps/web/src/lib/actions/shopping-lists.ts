'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

export type ShoppingItemStatus = 'pending' | 'bought' | 'buy_later' | 'on_hold' | 'skipped'

// ── Shopping Lists ────────────────────────────────────────────────────────────

const listSchema = z.object({
  name: z.string().min(1, 'List name is required').max(100),
  description: z.string().optional().nullable(),
})

export async function createShoppingList(groupId: string, data: z.infer<typeof listSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = listSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const { data: list, error } = await supabase
    .from('shopping_lists')
    .insert({ group_id: groupId, created_by: user.id, ...parsed.data })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true, list }
}

export async function updateShoppingList(
  listId: string,
  groupId: string,
  data: Partial<z.infer<typeof listSchema>>,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shopping_lists')
    .update(data)
    .eq('id', listId)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

export async function deleteShoppingList(listId: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shopping_lists')
    .delete()
    .eq('id', listId)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

// ── Shopping List Items ───────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  quantity: z.number().positive().optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

export async function addShoppingItem(
  listId: string,
  groupId: string,
  data: z.infer<typeof itemSchema>,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const parsed = itemSchema.safeParse(data)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  // Place new item at end
  const { count } = await supabase
    .from('shopping_list_items')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId)

  const { data: item, error } = await supabase
    .from('shopping_list_items')
    .insert({
      list_id: listId,
      added_by: user.id,
      sort_order: count ?? 0,
      ...parsed.data,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true, item }
}

export async function updateShoppingItem(
  itemId: string,
  listId: string,
  groupId: string,
  data: {
    name?: string
    quantity?: number | null
    unit?: string | null
    notes?: string | null
  },
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shopping_list_items')
    .update({ ...data, updated_by: user.id })
    .eq('id', itemId)
    .eq('list_id', listId)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

export async function updateItemStatus(
  itemId: string,
  listId: string,
  groupId: string,
  status: ShoppingItemStatus,
  holdUntil?: string | null,
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shopping_list_items')
    .update({
      status,
      hold_until: status === 'on_hold' ? (holdUntil ?? null) : null,
      updated_by: user.id,
    })
    .eq('id', itemId)
    .eq('list_id', listId)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}

export async function deleteShoppingItem(itemId: string, listId: string, groupId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('shopping_list_items')
    .delete()
    .eq('id', itemId)
    .eq('list_id', listId)

  if (error) return { error: error.message }

  revalidatePath(`/expenses/${groupId}`)
  return { success: true }
}
