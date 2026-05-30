-- Migration: 00032_expense_created_by
-- Fix: Allow any group member to record an expense on behalf of another member.
--
-- Root cause: The previous INSERT policy required `auth.uid() = paid_by`, which
-- blocked recording expenses where a different member is the payer.
--
-- Changes:
--   1. Add `created_by` column to `expenses` to track who entered the record
--      (vs who paid). Backfill existing rows with paid_by value.
--   2. Replace INSERT policy: any group member can insert provided `created_by`
--      equals their uid AND `paid_by` is also a group member.
--   3. Replace UPDATE/DELETE policies: any group member can update/delete any
--      expense in their group (matches the UI which shows edit/delete to all
--      group members).
--   4. Replace expense_splits manage policy with the same group-member check.

-- ─── 1. Add created_by column ────────────────────────────────────────────────
alter table public.expenses
  add column if not exists created_by uuid references public.profiles(id) on delete restrict;

-- Backfill: existing expenses were created by the payer
update public.expenses set created_by = paid_by where created_by is null;

-- Make non-nullable now that all rows have a value
alter table public.expenses
  alter column created_by set not null;

-- Index for lookups
create index if not exists idx_expenses_created_by on public.expenses(created_by);

-- ─── 2. Fix expenses INSERT policy ───────────────────────────────────────────
drop policy if exists "Group members can add expenses" on public.expenses;

create policy "Group members can add expenses"
  on public.expenses for insert
  with check (
    -- The caller must be the one recording the expense
    (select auth.uid()) = created_by
    -- The caller must be a group member
    and exists (
      select 1 from public.group_members
      where group_id = expenses.group_id
        and user_id = (select auth.uid())
    )
    -- The paid_by person must also be a group member
    and exists (
      select 1 from public.group_members
      where group_id = expenses.group_id
        and user_id = expenses.paid_by
    )
  );

-- ─── 3. Fix expenses UPDATE/DELETE policies ───────────────────────────────────
drop policy if exists "Expense creator can update their expense" on public.expenses;
drop policy if exists "Expense creator can delete their expense" on public.expenses;
-- Also drop any alternative names that may exist from earlier migrations
drop policy if exists "Expense creator or payer can update expense" on public.expenses;
drop policy if exists "Expense creator or payer can delete expense" on public.expenses;

-- Any group member can update or delete any expense within their group.
-- This matches the UI behaviour (edit/delete shown to all members) and mirrors
-- how Splitwise and similar apps work.
create policy "Group members can update expense"
  on public.expenses for update
  using (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id
        and user_id = (select auth.uid())
    )
  );

create policy "Group members can delete expense"
  on public.expenses for delete
  using (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id
        and user_id = (select auth.uid())
    )
  );

-- ─── 4. Fix expense_splits policy ─────────────────────────────────────────────
drop policy if exists "Expense creator can manage splits" on public.expense_splits;

create policy "Group members can manage splits"
  on public.expense_splits for all
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id
        and gm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id
        and gm.user_id = (select auth.uid())
    )
  );
