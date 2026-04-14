-- Migration: 00006_create_trips

create type public.trip_status as enum ('planning', 'confirmed', 'ongoing', 'completed', 'cancelled');

create table public.trips (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  destination  text,
  start_date   date not null,
  end_date     date not null,
  status       public.trip_status not null default 'planning',
  cover_image  text,
  budget       numeric(12, 2),
  currency     text not null default 'USD',
  tags         text[] not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  constraint trip_date_order check (start_date <= end_date)
);

create trigger trips_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- Trip collaborators
create table public.trip_members (
  trip_id      uuid not null references public.trips(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'viewer',  -- 'owner' | 'editor' | 'viewer'
  joined_at    timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create index idx_trips_user on public.trips(user_id) where deleted_at is null;
create index idx_trip_members_user on public.trip_members(user_id);

-- RLS for trips
alter table public.trips enable row level security;

create policy "Owners can CRUD own trips"
  on public.trips for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Members can view shared trips"
  on public.trips for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_id = trips.id and user_id = auth.uid()
    )
  );

-- RLS for trip_members
alter table public.trip_members enable row level security;

create policy "Trip owner can manage members"
  on public.trip_members for all
  using (
    exists (
      select 1 from public.trips
      where id = trip_members.trip_id and user_id = auth.uid()
    )
  );

create policy "Members can view their own membership"
  on public.trip_members for select
  using (auth.uid() = user_id);
