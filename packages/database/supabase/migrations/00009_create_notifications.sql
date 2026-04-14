-- Migration: 00009_create_notifications

create type public.notification_type as enum (
  'reminder_push',
  'reminder_in_app',
  'expense_added',
  'expense_settled',
  'trip_invite',
  'group_invite'
);

create type public.notification_status as enum ('queued', 'processing', 'sent', 'failed');

-- Notification queue (for both push and in-app notifications)
create table public.notification_queue (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  type         public.notification_type not null,
  title        text not null,
  body         text not null,
  payload      jsonb not null default '{}',
  status       public.notification_status not null default 'queued',
  scheduled_at timestamptz not null default now(),
  processed_at timestamptz,
  read_at      timestamptz,
  error        text,
  retry_count  integer not null default 0,
  created_at   timestamptz not null default now()
);

-- Web push subscriptions (one per device per user)
create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now()
);

-- Indexes
create index idx_notification_queue_pending
  on public.notification_queue(scheduled_at)
  where status = 'queued';

create index idx_notification_queue_user_unread
  on public.notification_queue(user_id, created_at desc)
  where read_at is null;

create index idx_push_subscriptions_user
  on public.push_subscriptions(user_id);

-- RLS for notification_queue
alter table public.notification_queue enable row level security;

create policy "Users can view own notifications"
  on public.notification_queue for select
  using (auth.uid() = user_id);

create policy "Users can mark own notifications as read"
  on public.notification_queue for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS for push_subscriptions
alter table public.push_subscriptions enable row level security;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
