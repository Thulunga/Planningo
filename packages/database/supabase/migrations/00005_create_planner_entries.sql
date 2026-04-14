-- Migration: 00005_create_planner_entries

create table public.planner_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  plan_date    date not null,
  title        text not null,
  notes        text,
  start_time   time not null,
  end_time     time not null,
  color        text not null default '#8B5CF6',
  todo_id      uuid references public.todos(id) on delete set null,
  event_id     uuid references public.calendar_events(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint planner_time_order check (start_time < end_time)
);

create trigger planner_entries_updated_at
  before update on public.planner_entries
  for each row execute function public.set_updated_at();

create index idx_planner_entries_date
  on public.planner_entries(user_id, plan_date);

alter table public.planner_entries enable row level security;

create policy "Users can CRUD own planner entries"
  on public.planner_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
