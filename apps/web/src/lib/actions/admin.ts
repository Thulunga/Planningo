'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isAdmin } from '@/lib/supabase/admin'

/**
 * Get all feedback for admin review
 */
export async function getAllFeedback() {
  const admin = await isAdmin()
  if (!admin) return { error: 'Unauthorized: Admin only' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('feedback')
    .select(
      `
      id,
      user_id,
      type,
      title,
      description,
      module,
      status,
      priority,
      created_at,
      updated_at,
      created_by_email
    `
    )
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { success: true, feedback: data || [] }
}

/**
 * Get feedback by status for admin
 */
export async function getFeedbackByStatus(status: string) {
  const admin = await isAdmin()
  if (!admin) return { error: 'Unauthorized: Admin only' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('feedback')
    .select(
      `
      id,
      user_id,
      type,
      title,
      description,
      module,
      status,
      priority,
      created_at,
      updated_at,
      created_by_email
    `
    )
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { success: true, feedback: data || [] }
}

/**
 * Admin update feedback status with comment
 */
export async function adminUpdateFeedbackStatus(
  feedbackId: string,
  status: string,
  priority?: string,
  comment?: string
) {
  const admin = await isAdmin()
  if (!admin) return { error: 'Unauthorized: Admin only' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Not authenticated' }

  // Get current feedback
  const { data: feedback, error: fetchError } = await supabase
    .from('feedback')
    .select('status, priority')
    .eq('id', feedbackId)
    .single()

  if (fetchError) return { error: 'Feedback not found' }

  // Update feedback
  const updateData: any = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (priority) {
    updateData.priority = priority
  }

  const { error: updateError } = await supabase
    .from('feedback')
    .update(updateData)
    .eq('id', feedbackId)

  if (updateError) return { error: updateError.message }

  // Create audit record if there's a comment
  if (comment) {
    await supabase.from('feedback_updates').insert({
      feedback_id: feedbackId,
      user_id: user.id,
      old_status: feedback.status,
      new_status: status,
      comment,
    })
  }

  revalidatePath('/admin/feedback')
  return { success: true }
}

/**
 * Get all expenses for admin review
 */
export async function getAllExpenses() {
  const admin = await isAdmin()
  if (!admin) return { error: 'Unauthorized: Admin only' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('expenses')
    .select(
      `
      id,
      group_id,
      amount,
      category,
      description,
      paid_by,
      created_at,
      expense_groups (
        id,
        name
      ),
      profiles!paid_by (
        email,
        full_name
      )
    `
    )
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { success: true, expenses: data || [] }
}

/**
 * Get all settlements for admin review
 */
export async function getAllSettlements() {
  const admin = await isAdmin()
  if (!admin) return { error: 'Unauthorized: Admin only' }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('settlements')
    .select(
      `
      id,
      group_id,
      amount,
      paid_by,
      paid_to,
      created_at,
      expense_groups (
        id,
        name
      ),
      paid_by_profile: profiles!paid_by (
        email,
        full_name
      ),
      paid_to_profile: profiles!paid_to (
        email,
        full_name
      )
    `
    )
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }

  return { success: true, settlements: data || [] }
}

/**
 * Get admin dashboard statistics
 */
export async function getAdminStats() {
  const admin = await isAdmin()
  if (!admin) return { error: 'Unauthorized: Admin only' }

  const supabase = await createClient()

  // Get feedback stats
  const { data: feedbackData } = await supabase.from('feedback').select('type, status')

  // Get expense stats
  const { data: expenseData } = await supabase.from('expenses').select('amount')

  // Get users count
  const { data: usersData, error: usersError } = await supabase.from('profiles').select('id')

  const stats = {
    totalUsers: usersData?.length || 0,
    feedback: {
      total: feedbackData?.length || 0,
      bugReports: feedbackData?.filter((f) => f.type === 'bug_report').length || 0,
      featureRequests: feedbackData?.filter((f) => f.type === 'feature_request').length || 0,
      improvements: feedbackData?.filter((f) => f.type === 'improvement').length || 0,
      open: feedbackData?.filter((f) => f.status === 'open').length || 0,
      inProgress: feedbackData?.filter((f) => f.status === 'in_progress').length || 0,
      completed: feedbackData?.filter((f) => f.status === 'completed').length || 0,
    },
    expenses: {
      total: expenseData?.length || 0,
      totalAmount: expenseData?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0,
    },
  }

  return { success: true, stats }
}
