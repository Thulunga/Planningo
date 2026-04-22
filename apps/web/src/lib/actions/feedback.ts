'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const feedbackSchema = z.object({
  type: z.enum(['bug_report', 'feature_request', 'improvement']),
  title: z.string().min(5, 'Title must be at least 5 characters').max(255),
  description: z.string().min(20, 'Description must be at least 20 characters').max(5000),
  module: z.string().optional(),
})

const updateFeedbackStatusSchema = z.object({
  status: z.enum(['open', 'under_review', 'in_progress', 'completed', 'closed']),
  comment: z.string().optional(),
})

export async function submitFeedback(data: z.infer<typeof feedbackSchema>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = feedbackSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  const { error, data: feedback } = await supabase
    .from('feedback')
    .insert({
      user_id: user.id,
      created_by_email: user.email,
      ...validated.data,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  revalidatePath('/settings/feedback')
  revalidatePath('/dashboard')
  return { success: true, feedback }
}

export async function getFeedback() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('feedback')
    .select(
      `
      id,
      type,
      title,
      description,
      module,
      status,
      priority,
      created_at,
      updated_at,
      created_by_email,
      user_id
    `
    )
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { success: true, feedback: data || [] }
}

export async function getUserFeedback() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('feedback')
    .select(
      `
      id,
      type,
      title,
      description,
      module,
      status,
      priority,
      created_at,
      updated_at
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { success: true, feedback: data || [] }
}

export async function updateFeedbackStatus(
  feedbackId: string,
  data: z.infer<typeof updateFeedbackStatusSchema>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const validated = updateFeedbackStatusSchema.safeParse(data)
  if (!validated.success) return { error: validated.error.issues[0]?.message }

  // Get current feedback
  const { data: feedback, error: fetchError } = await supabase
    .from('feedback')
    .select('status')
    .eq('id', feedbackId)
    .single()

  if (fetchError) return { error: 'Feedback not found' }

  // Update feedback
  const { error: updateError } = await supabase
    .from('feedback')
    .update({ status: validated.data.status, updated_at: new Date().toISOString() })
    .eq('id', feedbackId)

  if (updateError) return { error: updateError.message }

  // Create audit record if there's a comment
  if (validated.data.comment) {
    await supabase.from('feedback_updates').insert({
      feedback_id: feedbackId,
      user_id: user.id,
      old_status: feedback.status,
      new_status: validated.data.status,
      comment: validated.data.comment,
    })
  }

  revalidatePath('/settings/feedback')
  return { success: true }
}

export async function deleteFeedback(feedbackId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership
  const { data: feedback, error: fetchError } = await supabase
    .from('feedback')
    .select('user_id')
    .eq('id', feedbackId)
    .single()

  if (fetchError || feedback.user_id !== user.id) {
    return { error: 'You can only delete your own feedback' }
  }

  const { error } = await supabase.from('feedback').delete().eq('id', feedbackId)

  if (error) return { error: error.message }

  revalidatePath('/settings/feedback')
  return { success: true }
}

export async function getFeedbackStats() {
  const supabase = await createClient()

  const { data, error } = await supabase.from('feedback').select('type, status')

  if (error) return { error: error.message }

  const stats = {
    total: data?.length || 0,
    bugReports: data?.filter((f) => f.type === 'bug_report').length || 0,
    featureRequests: data?.filter((f) => f.type === 'feature_request').length || 0,
    improvements: data?.filter((f) => f.type === 'improvement').length || 0,
    open: data?.filter((f) => f.status === 'open').length || 0,
    inProgress: data?.filter((f) => f.status === 'in_progress').length || 0,
    completed: data?.filter((f) => f.status === 'completed').length || 0,
  }

  return { success: true, stats }
}
