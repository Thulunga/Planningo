-- Migration: 00007_create_itinerary_items

create type public.itinerary_category as enum (
  'transport', 'accommodation', 'activity', 'restaurant', 'sightseeing', 'other'
);

create table public.itinerary_items (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  day_number   integer not null check (day_number >= 1),
  category     public.itinerary_category not null default 'activity',
  title        text not null,
  description  text,
  location     text,
  start_time   timestamptz,
  end_time     timestamptz,
  cost         numeric(12, 2),
  currency     text not null default 'USD',
  booking_ref  text,
  url          text,
  notes        text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger itinerary_items_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();

create index idx_itinerary_trip
  on public.itinerary_items(trip_id, day_number, sort_order);

alter table public.itinerary_items enable row level security;

create policy "Trip owner can CRUD itinerary"
  on public.itinerary_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Trip members can view itinerary"
  on public.itinerary_items for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_id = itinerary_items.trip_id and user_id = auth.uid()
    )
  );
