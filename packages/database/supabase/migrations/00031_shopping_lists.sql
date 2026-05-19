-- Migration: 00031_shopping_lists
-- Collaborative shopping lists inside expense groups

create type public.shopping_item_status as enum (
  'pending',
  'bought',
  'buy_later',
  'on_hold',
  'skipped'
);

-- Shopping lists belonging to an expense group
create table public.shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.expense_groups(id) on delete cascade,
  name         text not null,
  description  text,
  created_by   uuid not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger shopping_lists_updated_at
  before update on public.shopping_lists
  for each row execute function public.set_updated_at();

-- Items within a shopping list
create table public.shopping_list_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references public.shopping_lists(id) on delete cascade,
  name         text not null,
  quantity     numeric(10, 2),
  unit         text,
  notes        text,
  status       public.shopping_item_status not null default 'pending',
  hold_until   date,
  added_by     uuid not null references public.profiles(id) on delete restrict,
  updated_by   uuid references public.profiles(id) on delete set null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger shopping_list_items_updated_at
  before update on public.shopping_list_items
  for each row execute function public.set_updated_at();

-- Indexes
create index idx_shopping_lists_group on public.shopping_lists(group_id);
create index idx_shopping_list_items_list on public.shopping_list_items(list_id, sort_order);

-- ── RLS: shopping_lists ───────────────────────────────────────────────────────

alter table public.shopping_lists enable row level security;

-- Any group member can view lists for their group
create policy "Group members can view shopping lists"
  on public.shopping_lists for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = shopping_lists.group_id and user_id = auth.uid()
    )
  );

-- Any group member can create a list
create policy "Group members can create shopping lists"
  on public.shopping_lists for insert
  with check (
    auth.uid() = created_by and
    exists (
      select 1 from public.group_members
      where group_id = shopping_lists.group_id and user_id = auth.uid()
    )
  );

-- Any group member can update any list (collaborative)
create policy "Group members can update shopping lists"
  on public.shopping_lists for update
  using (
    exists (
      select 1 from public.group_members
      where group_id = shopping_lists.group_id and user_id = auth.uid()
    )
  );

-- Any group member can delete a list
create policy "Group members can delete shopping lists"
  on public.shopping_lists for delete
  using (
    exists (
      select 1 from public.group_members
      where group_id = shopping_lists.group_id and user_id = auth.uid()
    )
  );

-- ── RLS: shopping_list_items ─────────────────────────────────────────────────

alter table public.shopping_list_items enable row level security;

-- Any group member can view items in lists belonging to their group
create policy "Group members can view shopping items"
  on public.shopping_list_items for select
  using (
    exists (
      select 1 from public.shopping_lists sl
      join public.group_members gm on gm.group_id = sl.group_id
      where sl.id = shopping_list_items.list_id and gm.user_id = auth.uid()
    )
  );

-- Any group member can add items
create policy "Group members can add shopping items"
  on public.shopping_list_items for insert
  with check (
    auth.uid() = added_by and
    exists (
      select 1 from public.shopping_lists sl
      join public.group_members gm on gm.group_id = sl.group_id
      where sl.id = shopping_list_items.list_id and gm.user_id = auth.uid()
    )
  );

-- Any group member can update any item (collaborative status updates)
create policy "Group members can update shopping items"
  on public.shopping_list_items for update
  using (
    exists (
      select 1 from public.shopping_lists sl
      join public.group_members gm on gm.group_id = sl.group_id
      where sl.id = shopping_list_items.list_id and gm.user_id = auth.uid()
    )
  );

-- Any group member can delete any item
create policy "Group members can delete shopping items"
  on public.shopping_list_items for delete
  using (
    exists (
      select 1 from public.shopping_lists sl
      join public.group_members gm on gm.group_id = sl.group_id
      where sl.id = shopping_list_items.list_id and gm.user_id = auth.uid()
    )
  );

-- ── Realtime publications ─────────────────────────────────────────────────────

alter publication supabase_realtime add table public.shopping_lists;
alter publication supabase_realtime add table public.shopping_list_items;
