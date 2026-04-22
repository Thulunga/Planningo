-- Migration: 00008_create_expense_system

create type public.split_type as enum ('equal', 'exact', 'percentage', 'shares');

-- Expense Groups (like Splitwise groups)
create table public.expense_groups (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  created_by   uuid not null references public.profiles(id) on delete restrict,
  currency     text not null default 'USD',
  category     text not null default 'general',  -- 'trip' | 'home' | 'couple' | 'general'
  trip_id      uuid references public.trips(id) on delete set null,
  image_url    text,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger expense_groups_updated_at
  before update on public.expense_groups
  for each row execute function public.set_updated_at();

-- Group membership
create table public.group_members (
  group_id     uuid not null references public.expense_groups(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         text not null default 'member',  -- 'admin' | 'member'
  joined_at    timestamptz not null default now(),
  primary key (group_id, user_id)
);

-- Expenses within a group
create table public.expenses (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.expense_groups(id) on delete cascade,
  paid_by      uuid not null references public.profiles(id) on delete restrict,
  title        text not null,
  description  text,
  amount       numeric(12, 2) not null check (amount > 0),
  currency     text not null default 'USD',
  category     text not null default 'general',
  split_type   public.split_type not null default 'equal',
  expense_date date not null default current_date,
  receipt_url  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create trigger expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

-- How each expense is split among members
create table public.expense_splits (
  id           uuid primary key default gen_random_uuid(),
  expense_id   uuid not null references public.expenses(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete restrict,
  amount       numeric(12, 2) not null,
  percentage   numeric(5, 2),
  shares       integer,
  is_settled   boolean not null default false,
  settled_at   timestamptz,
  unique (expense_id, user_id)
);

-- Direct settlements between two members
create table public.settlements (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.expense_groups(id) on delete cascade,
  paid_by      uuid not null references public.profiles(id) on delete restrict,
  paid_to      uuid not null references public.profiles(id) on delete restrict,
  amount       numeric(12, 2) not null check (amount > 0),
  currency     text not null default 'USD',
  notes        text,
  settled_at   timestamptz not null default now(),
  created_at   timestamptz not null default now(),

  constraint no_self_settlement check (paid_by != paid_to)
);

-- Indexes
create index idx_expense_groups_creator on public.expense_groups(created_by);
create index idx_group_members_user on public.group_members(user_id);
create index idx_expenses_group on public.expenses(group_id) where deleted_at is null;
create index idx_expense_splits_user on public.expense_splits(user_id, is_settled);
create index idx_settlements_group on public.settlements(group_id);

-- RLS for expense_groups
alter table public.expense_groups enable row level security;

create policy "Group members can view group"
  on public.expense_groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = expense_groups.id and user_id = auth.uid()
    )
  );

create policy "Anyone can create a group"
  on public.expense_groups for insert
  with check (auth.uid() = created_by);

create policy "Group creator can update/delete group"
  on public.expense_groups for update
  using (auth.uid() = created_by);

create policy "Group creator can delete group"
  on public.expense_groups for delete
  using (auth.uid() = created_by);

-- RLS for group_members
alter table public.group_members enable row level security;

create policy "Group members can view membership"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Group admin/creator can add members"
  on public.group_members for insert
  with check (
    exists (
      select 1 from public.expense_groups
      where id = group_id and created_by = auth.uid()
    )
    or
    exists (
      select 1 from public.group_members
      where group_id = group_members.group_id and user_id = auth.uid() and role = 'admin'
    )
  );

create policy "Group admin/creator can remove members"
  on public.group_members for delete
  using (
    exists (
      select 1 from public.expense_groups
      where id = group_id and created_by = auth.uid()
    )
  );

-- RLS for expenses
alter table public.expenses enable row level security;

create policy "Group members can view expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "Group members can add expenses"
  on public.expenses for insert
  with check (
    auth.uid() = paid_by and
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id and user_id = auth.uid()
    )
  );

create policy "Expense creator can update their expense"
  on public.expenses for update
  using (auth.uid() = paid_by);

create policy "Expense creator can delete their expense"
  on public.expenses for delete
  using (auth.uid() = paid_by);

-- RLS for expense_splits
alter table public.expense_splits enable row level security;

create policy "Group members can view splits"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id and gm.user_id = auth.uid()
    )
  );

create policy "Expense creator can manage splits"
  on public.expense_splits for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id and e.paid_by = auth.uid()
    )
  );

create policy "Members can settle own splits"
  on public.expense_splits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS for settlements
alter table public.settlements enable row level security;

create policy "Group members can view settlements"
  on public.settlements for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );

create policy "Members can create settlements"
  on public.settlements for insert
  with check (
    auth.uid() = paid_by and
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );

create policy "Settlement creator can update settlements"
  on public.settlements for update
  using (
    auth.uid() = paid_by and
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  )
  with check (
    auth.uid() = paid_by and
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );

create policy "Settlement creator can delete settlements"
  on public.settlements for delete
  using (
    auth.uid() = paid_by and
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id and user_id = auth.uid()
    )
  );
