-- Migration: 00003_create_calendar_events

create table public.calendar_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  title          text not null,
  description    text,
  location       text,
  start_time     timestamptz not null,
  end_time       timestamptz not null,
  all_day        boolean not null default false,
  color          text not null default '#3B82F6',
  recurrence     jsonb,
  external_id    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,

  constraint end_after_start check (end_time >= start_time)
);

create trigger calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

create index idx_calendar_events_user_range
  on public.calendar_events(user_id, start_time, end_time)
  where deleted_at is null;

alter table public.calendar_events enable row level security;

create policy "Users can CRUD own calendar events"
  on public.calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
