-- Migration: 00004_create_reminders

create type public.reminder_channel as enum ('push', 'in_app', 'both');
create type public.reminder_status as enum ('pending', 'sent', 'failed', 'cancelled');

create table public.reminders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  event_id        uuid references public.calendar_events(id) on delete cascade,
  todo_id         uuid references public.todos(id) on delete cascade,
  remind_at       timestamptz not null,
  channel         public.reminder_channel not null default 'both',
  status          public.reminder_status not null default 'pending',
  message         text,
  sent_at         timestamptz,
  retry_count     integer not null default 0,
  created_at      timestamptz not null default now(),

  -- Either event_id or todo_id must be set, not both, not neither
  constraint reminder_target_check check (
    (event_id is not null and todo_id is null) or
    (todo_id is not null and event_id is null)
  )
);

create index idx_reminders_pending
  on public.reminders(remind_at)
  where status = 'pending';

create index idx_reminders_user
  on public.reminders(user_id, status);

alter table public.reminders enable row level security;

create policy "Users can CRUD own reminders"
  on public.reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
