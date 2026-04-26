-- ─────────────────────────────────────────────────────────────────────────────
-- 00025_uno_game.sql
-- Real-time multiplayer UNO game: rooms, players, authoritative state,
-- event log (for realtime sync of plays), and chat.
--
-- Privacy model:
--   * Full game state (deck, all hands) lives in `uno_state` and is NEVER
--     readable by clients. Clients only see sanitized state via the RPC
--     `uno_get_view(p_room_id)` which strips deck contents and other players'
--     hand cards (only their counts).
--   * Clients receive realtime pings via row inserts into `uno_events` and
--     react by re-fetching `uno_get_view`.
--   * Mutating game logic runs in TS server actions. Atomic state updates go
--     through `uno_apply(...)` which uses optimistic version locking.
-- ─────────────────────────────────────────────────────────────────────────────

-- Tables ──────────────────────────────────────────────────────────────────────

create table public.uno_rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  host_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'waiting' check (status in ('waiting','playing','ended')),
  max_players int not null default 4 check (max_players between 2 and 8),
  winner_id   uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  started_at  timestamptz,
  ended_at    timestamptz
);

create index idx_uno_rooms_code on public.uno_rooms(code);
create index idx_uno_rooms_host on public.uno_rooms(host_id);

create table public.uno_players (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.uno_rooms(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  seat          int not null check (seat between 0 and 7),
  joined_at     timestamptz not null default now(),
  left_at       timestamptz,
  finished_rank int,
  unique (room_id, user_id),
  unique (room_id, seat)
);

create index idx_uno_players_room on public.uno_players(room_id);

create table public.uno_state (
  room_id    uuid primary key references public.uno_rooms(id) on delete cascade,
  state      jsonb not null,
  version    int not null default 1,
  updated_at timestamptz not null default now()
);

create table public.uno_events (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.uno_rooms(id) on delete cascade,
  kind       text not null,
  actor_id   uuid references public.profiles(id),
  payload    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_uno_events_room_time on public.uno_events(room_id, created_at desc);

create table public.uno_chat (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.uno_rooms(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index idx_uno_chat_room_time on public.uno_chat(room_id, created_at desc);

-- Helpers ─────────────────────────────────────────────────────────────────────

create or replace function public.is_uno_room_member(p_room_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.uno_players
    where room_id = p_room_id
      and user_id = auth.uid()
      and left_at is null
  );
$$;

-- Sanitized state view for the calling user. Strips deck contents and other
-- players' hand cards.
create or replace function public.uno_get_view(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_state jsonb;
  v_uid   uuid := auth.uid();
  v_view  jsonb;
  v_hands jsonb;
  v_my_hand jsonb;
  v_hand_counts jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_uno_room_member(p_room_id) then
    raise exception 'not a room member';
  end if;

  select state into v_state from public.uno_state where room_id = p_room_id;
  if v_state is null then
    return null;
  end if;

  v_hands := coalesce(v_state -> 'hands', '{}'::jsonb);

  -- own hand
  v_my_hand := v_hands -> v_uid::text;
  if v_my_hand is null then
    v_my_hand := '[]'::jsonb;
  end if;

  -- hand counts per user
  select coalesce(jsonb_object_agg(k, jsonb_array_length(v)), '{}'::jsonb)
    into v_hand_counts
  from jsonb_each(v_hands) as t(k, v);

  v_view := jsonb_build_object(
    'status',        v_state -> 'status',
    'currentSeat',   v_state -> 'currentSeat',
    'direction',     v_state -> 'direction',
    'currentColor',  v_state -> 'currentColor',
    'pendingDraw',   v_state -> 'pendingDraw',
    'discardTop',    case
                       when jsonb_array_length(coalesce(v_state -> 'discard', '[]'::jsonb)) > 0
                       then (v_state -> 'discard') -> -1
                       else null
                     end,
    'deckCount',     jsonb_array_length(coalesce(v_state -> 'deck', '[]'::jsonb)),
    'winnerSeat',    v_state -> 'winnerSeat',
    'lastAction',    v_state -> 'lastAction',
    'handCounts',    v_hand_counts,
    'myHand',        v_my_hand,
    'version',       (select version from public.uno_state where room_id = p_room_id)
  );

  return v_view;
end;
$$;

-- Server-only privileged read of full state. Used by TS server actions via
-- service-role client; therefore we restrict execute to the service_role.
create or replace function public.uno_get_full_state(p_room_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_state jsonb;
  v_ver   int;
begin
  select state, version into v_state, v_ver
    from public.uno_state where room_id = p_room_id;
  if v_state is null then return null; end if;
  return jsonb_build_object('state', v_state, 'version', v_ver);
end;
$$;

revoke all on function public.uno_get_full_state(uuid) from public, anon, authenticated;
grant execute on function public.uno_get_full_state(uuid) to service_role;

-- Atomic apply: validates version, persists new state and inserts an event.
create or replace function public.uno_apply(
  p_room_id          uuid,
  p_expected_version int,
  p_new_state        jsonb,
  p_event_kind       text,
  p_event_actor      uuid,
  p_event_payload    jsonb
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_version int;
begin
  v_new_version := p_expected_version + 1;
  update public.uno_state
     set state      = p_new_state,
         version    = v_new_version,
         updated_at = now()
   where room_id = p_room_id
     and version = p_expected_version;

  if not found then
    raise exception 'version_conflict';
  end if;

  insert into public.uno_events (room_id, kind, actor_id, payload)
    values (p_room_id, p_event_kind, p_event_actor, coalesce(p_event_payload, '{}'::jsonb));

  return v_new_version;
end;
$$;

revoke all on function public.uno_apply(uuid,int,jsonb,text,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.uno_apply(uuid,int,jsonb,text,uuid,jsonb) to service_role;

-- RLS ─────────────────────────────────────────────────────────────────────────

alter table public.uno_rooms   enable row level security;
alter table public.uno_players enable row level security;
alter table public.uno_state   enable row level security;
alter table public.uno_events  enable row level security;
alter table public.uno_chat    enable row level security;

-- Rooms: anyone authenticated can read (so they can join by code), only the
-- host can create/update/delete.
create policy "uno_rooms read"   on public.uno_rooms for select using (auth.role() = 'authenticated');
create policy "uno_rooms insert" on public.uno_rooms for insert with check (auth.uid() = host_id);
create policy "uno_rooms update" on public.uno_rooms for update using (auth.uid() = host_id);
create policy "uno_rooms delete" on public.uno_rooms for delete using (auth.uid() = host_id);

-- Players: room members + the user themself can read; users join/leave themself.
create policy "uno_players read"
  on public.uno_players for select
  using (auth.uid() = user_id or public.is_uno_room_member(room_id));

create policy "uno_players insert"
  on public.uno_players for insert
  with check (auth.uid() = user_id);

create policy "uno_players update"
  on public.uno_players for update
  using (auth.uid() = user_id);

-- State: clients have NO direct access. Only service_role (via RPCs) reads/writes.
-- (Intentionally no policies; RLS denies all for normal users.)

-- Events: room members read; inserts only via service_role (uno_apply).
create policy "uno_events read"
  on public.uno_events for select
  using (public.is_uno_room_member(room_id));

-- Chat: room members read; users post their own message in their rooms.
create policy "uno_chat read"
  on public.uno_chat for select
  using (public.is_uno_room_member(room_id));

create policy "uno_chat insert"
  on public.uno_chat for insert
  with check (auth.uid() = user_id and public.is_uno_room_member(room_id));

-- Realtime publications ──────────────────────────────────────────────────────

alter publication supabase_realtime add table public.uno_rooms;
alter publication supabase_realtime add table public.uno_players;
alter publication supabase_realtime add table public.uno_events;
alter publication supabase_realtime add table public.uno_chat;
