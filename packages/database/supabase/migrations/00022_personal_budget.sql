-- Migration: 00022_personal_budget
-- Personal budget management: categories, monthly budgets, and personal transactions

-- ── Budget Categories ─────────────────────────────────────────────────────────
create table public.budget_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  icon        text not null default '💰',
  color       text not null default '#6366f1',
  type        text not null default 'expense' check (type in ('income', 'expense', 'both')),
  sort_order  integer not null default 0,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now()
);

create index idx_budget_categories_user on public.budget_categories(user_id);

alter table public.budget_categories enable row level security;

create policy "Users manage own categories"
  on public.budget_categories for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Monthly Budgets ───────────────────────────────────────────────────────────
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  month       integer not null check (month between 1 and 12),
  year        integer not null check (year >= 2020),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, category_id, month, year)
);

create trigger budgets_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

create index idx_budgets_user_period on public.budgets(user_id, year, month);

alter table public.budgets enable row level security;

create policy "Users manage own budgets"
  on public.budgets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Personal Transactions ─────────────────────────────────────────────────────
create table public.personal_transactions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  type                    text not null check (type in ('income', 'expense')),
  amount                  numeric(12, 2) not null check (amount > 0),
  currency                text not null default 'INR',
  title                   text not null,
  notes                   text,
  category_id             uuid references public.budget_categories(id) on delete set null,
  tags                    text[] not null default '{}',
  transaction_date        date not null default current_date,
  linked_group_expense_id uuid references public.expenses(id) on delete set null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);

create trigger personal_transactions_updated_at
  before update on public.personal_transactions
  for each row execute function public.set_updated_at();

create index idx_personal_txn_user_date
  on public.personal_transactions(user_id, transaction_date desc)
  where deleted_at is null;

create index idx_personal_txn_category
  on public.personal_transactions(category_id)
  where deleted_at is null;

create index idx_personal_txn_linked
  on public.personal_transactions(linked_group_expense_id)
  where linked_group_expense_id is not null and deleted_at is null;

alter table public.personal_transactions enable row level security;

create policy "Users manage own transactions"
  on public.personal_transactions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
