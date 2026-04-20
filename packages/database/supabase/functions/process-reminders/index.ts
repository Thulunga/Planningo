import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (_req) => {
  try {
    const now = new Date().toISOString()

    // 1. Fetch all pending reminders that are due (single query)
    const { data: dueReminders, error } = await supabase
      .from('reminders')
      .select('*, profiles(id, full_name, email), calendar_events(title), todos(title)')
      .eq('status', 'pending')
      .lte('remind_at', now)
      .limit(50)

    if (error) throw error
    if (!dueReminders || dueReminders.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    const reminderIds = dueReminders.map((r) => r.id)

    // 2. Batch-insert all in-app notifications in a single round-trip
    const notifications = dueReminders.map((reminder) => {
      const title = reminder.calendar_events?.title ?? reminder.todos?.title ?? 'Reminder'
      const body = reminder.message ?? `Your reminder: ${title}`
      return {
        user_id: reminder.user_id,
        type: 'reminder_in_app',
        title: `Reminder: ${title}`,
        body,
        payload: { reminder_id: reminder.id, title, body },
        scheduled_at: now,
      }
    })

    await supabase.from('notification_queue').insert(notifications)

    // 3. Fetch push subscriptions for all users who need push in a single query
    const pushUserIds = dueReminders
      .filter((r) => r.channel === 'push' || r.channel === 'both')
      .map((r) => r.user_id)

    if (pushUserIds.length > 0) {
      const { data: subscriptions } = await supabase
        .from('push_subscriptions')
        .select('*')
        .in('user_id', pushUserIds)

      if (subscriptions && subscriptions.length > 0) {
        // Build a map of userId → title/body for quick lookup
        const reminderByUser = new Map(
          dueReminders.map((r) => {
            const title = r.calendar_events?.title ?? r.todos?.title ?? 'Reminder'
            const body = r.message ?? `Your reminder: ${title}`
            return [r.user_id, { title, body }]
          })
        )

        // 4. Fire all send-push calls in parallel - no sequential waiting
        await Promise.all(
          subscriptions.map((sub) => {
            const info = reminderByUser.get(sub.user_id)
            if (!info) return Promise.resolve()
            return supabase.functions.invoke('send-push', {
              body: {
                endpoint: sub.endpoint,
                p256dh: sub.p256dh,
                auth: sub.auth,
                title: `Planningo: ${info.title}`,
                body: info.body,
                url: '/',
              },
            })
          })
        )
      }
    }

    // 5. Batch-update all reminder statuses in a single round-trip
    await supabase
      .from('reminders')
      .update({ status: 'sent', sent_at: now })
      .in('id', reminderIds)

    return new Response(JSON.stringify({ processed: dueReminders.length }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('process-reminders error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
