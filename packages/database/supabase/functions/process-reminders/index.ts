import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (_req) => {
  try {
    const now = new Date().toISOString()

    // Find all pending reminders that are due
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

    let processed = 0

    for (const reminder of dueReminders) {
      const title = reminder.calendar_events?.title ?? reminder.todos?.title ?? 'Reminder'
      const body = reminder.message ?? `Your reminder: ${title}`

      // Queue in-app notification
      await supabase.from('notification_queue').insert({
        user_id: reminder.user_id,
        type: 'reminder_in_app',
        title: `Reminder: ${title}`,
        body,
        payload: { reminder_id: reminder.id, title, body },
        scheduled_at: now,
      })

      // Queue push notification if channel includes push
      if (reminder.channel === 'push' || reminder.channel === 'both') {
        // Get user's push subscriptions
        const { data: subscriptions } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', reminder.user_id)

        if (subscriptions && subscriptions.length > 0) {
          // Call send-push edge function for each subscription
          for (const sub of subscriptions) {
            await supabase.functions.invoke('send-push', {
              body: {
                endpoint: sub.endpoint,
                p256dh: sub.p256dh,
                auth: sub.auth,
                title: `Planningo: ${title}`,
                body,
                url: '/',
              },
            })
          }
        }
      }

      // Mark reminder as sent
      await supabase
        .from('reminders')
        .update({ status: 'sent', sent_at: now })
        .eq('id', reminder.id)

      processed++
    }

    return new Response(JSON.stringify({ processed }), {
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
