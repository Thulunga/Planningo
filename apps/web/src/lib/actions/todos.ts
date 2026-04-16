'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const todoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'done', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
})

export async function createTodo(data: z.infer<typeof todoSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = todoSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  const { error } = await supabase.from('todos').insert({
    user_id: user.id,
    ...validated.data,
  })

  if (error) return { error: error.message }

  revalidatePath('/todos')
  revalidatePath('/')
  return { success: true }
}

export async function updateTodo(id: string, data: Partial<z.infer<typeof todoSchema>>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('todos')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/todos')
  revalidatePath('/')
  return { success: true }
}

export async function deleteTodo(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Soft delete
  const { error } = await supabase
    .from('todos')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/todos')
  revalidatePath('/')
  return { success: true }
}

export async function toggleTodoStatus(id: string, currentStatus: string) {
  const newStatus = currentStatus === 'done' ? 'todo' : 'done'
  const completedAt = newStatus === 'done' ? new Date().toISOString() : null

  return updateTodo(id, { status: newStatus as 'todo' | 'done', completed_at: completedAt } as any)
}
