-- Migration: 00002_create_todos

create type public.todo_status as enum ('todo', 'in_progress', 'done', 'cancelled');
create type public.todo_priority as enum ('low', 'medium', 'high', 'urgent');

create table public.todos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  status       public.todo_status not null default 'todo',
  priority     public.todo_priority not null default 'medium',
  due_date     timestamptz,
  completed_at timestamptz,
  tags         text[] not null default '{}',
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create trigger todos_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

create index idx_todos_user_id on public.todos(user_id);
create index idx_todos_status on public.todos(user_id, status) where deleted_at is null;
create index idx_todos_due_date on public.todos(user_id, due_date) where deleted_at is null;
create index idx_todos_tags on public.todos using gin(tags);

alter table public.todos enable row level security;

create policy "Users can CRUD own todos"
  on public.todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
