-- Migration: 00010_performance_optimizations
--
-- WHAT: Adds missing indexes and rewrites all RLS policies to use
--       (select auth.uid()) instead of auth.uid().
--
-- WHY:  auth.uid() called directly in a USING/WITH CHECK clause is treated
--       as a volatile function and re-evaluated for every row the planner
--       examines. Wrapping it in a sub-select - (select auth.uid()) - makes
--       PostgreSQL treat it as a stable InitPlan, evaluated exactly once per
--       statement and cached for the lifetime of the query. On tables with
--       many rows this can eliminate millions of redundant JWT-decode calls.
--
-- REFS: https://supabase.com/docs/guides/database/postgres/row-level-security
--       #call-functions-with-select

-- ============================================================
-- PART 1: MISSING INDEXES
-- ============================================================

-- expense_splits.expense_id
-- The RLS policy "Group members can view splits" does:
--   EXISTS (SELECT 1 FROM expenses e JOIN group_members gm ON gm.group_id = e.group_id
--           WHERE e.id = expense_splits.expense_id AND gm.user_id = ...)
-- Without this index every row scan on expense_splits requires a random-access
-- heap fetch into expenses. The unique constraint on (expense_id, user_id) already
-- helps for pair-lookups but a single-column index is faster for the join probe.
create index if not exists idx_expense_splits_expense
  on public.expense_splits(expense_id);

-- expenses.paid_by
-- RLS update/delete policies check auth.uid() = paid_by per row.
-- Adding a partial index on active (non-deleted) expenses speeds up those checks.
create index if not exists idx_expenses_paid_by
  on public.expenses(paid_by)
  where deleted_at is null;

-- itinerary_items.user_id
-- RLS "Trip owner can CRUD itinerary" checks auth.uid() = user_id.
-- Without this index a trip with hundreds of items requires a sequential scan.
create index if not exists idx_itinerary_items_user
  on public.itinerary_items(user_id);

-- settlements.paid_by / paid_to
-- Useful for balance-calculation queries that filter by participant,
-- and for any future RLS policies on settlements filtered by participant.
create index if not exists idx_settlements_paid_by
  on public.settlements(paid_by);

create index if not exists idx_settlements_paid_to
  on public.settlements(paid_to);

-- expense_groups.trip_id
-- Enables fast lookup of expense groups linked to a specific trip.
create index if not exists idx_expense_groups_trip
  on public.expense_groups(trip_id)
  where trip_id is not null;

-- ============================================================
-- PART 2: RLS POLICY OPTIMIZATION
-- Replace auth.uid() with (select auth.uid()) in every policy.
-- ============================================================

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ------------------------------------------------------------
-- todos
-- ------------------------------------------------------------
drop policy if exists "Users can CRUD own todos" on public.todos;

create policy "Users can CRUD own todos"
  on public.todos for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- calendar_events
-- ------------------------------------------------------------
drop policy if exists "Users can CRUD own events" on public.calendar_events;

create policy "Users can CRUD own events"
  on public.calendar_events for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- reminders
-- ------------------------------------------------------------
drop policy if exists "Users can CRUD own reminders" on public.reminders;

create policy "Users can CRUD own reminders"
  on public.reminders for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- planner_entries
-- ------------------------------------------------------------
drop policy if exists "Users can CRUD own entries" on public.planner_entries;

create policy "Users can CRUD own entries"
  on public.planner_entries for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- trips
-- ------------------------------------------------------------
drop policy if exists "Owners can CRUD own trips" on public.trips;
drop policy if exists "Members can view shared trips" on public.trips;

create policy "Owners can CRUD own trips"
  on public.trips for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Members can view shared trips"
  on public.trips for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_id = trips.id
        and user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- trip_members
-- ------------------------------------------------------------
drop policy if exists "Trip owner can manage members" on public.trip_members;
drop policy if exists "Members can view their own membership" on public.trip_members;

create policy "Trip owner can manage members"
  on public.trip_members for all
  using (
    exists (
      select 1 from public.trips
      where id = trip_members.trip_id
        and user_id = (select auth.uid())
    )
  );

create policy "Members can view their own membership"
  on public.trip_members for select
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- itinerary_items
-- ------------------------------------------------------------
drop policy if exists "Trip owner can CRUD itinerary" on public.itinerary_items;
drop policy if exists "Trip members can view itinerary" on public.itinerary_items;

create policy "Trip owner can CRUD itinerary"
  on public.itinerary_items for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Trip members can view itinerary"
  on public.itinerary_items for select
  using (
    exists (
      select 1 from public.trip_members
      where trip_id = itinerary_items.trip_id
        and user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- expense_groups
-- ------------------------------------------------------------
drop policy if exists "Group members can view group" on public.expense_groups;
drop policy if exists "Anyone can create a group" on public.expense_groups;
drop policy if exists "Group creator can update/delete group" on public.expense_groups;
drop policy if exists "Group creator can delete group" on public.expense_groups;

create policy "Group members can view group"
  on public.expense_groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = expense_groups.id
        and user_id = (select auth.uid())
    )
  );

create policy "Anyone can create a group"
  on public.expense_groups for insert
  with check ((select auth.uid()) = created_by);

create policy "Group creator can update/delete group"
  on public.expense_groups for update
  using ((select auth.uid()) = created_by);

create policy "Group creator can delete group"
  on public.expense_groups for delete
  using ((select auth.uid()) = created_by);

-- ------------------------------------------------------------
-- group_members
-- ------------------------------------------------------------
drop policy if exists "Group members can view membership" on public.group_members;
drop policy if exists "Group admin/creator can add members" on public.group_members;
drop policy if exists "Group admin/creator can remove members" on public.group_members;

create policy "Group members can view membership"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_members.group_id
        and gm.user_id = (select auth.uid())
    )
  );

create policy "Group admin/creator can add members"
  on public.group_members for insert
  with check (
    exists (
      select 1 from public.expense_groups
      where id = group_id
        and created_by = (select auth.uid())
    )
    or
    exists (
      select 1 from public.group_members
      where group_id = group_members.group_id
        and user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create policy "Group admin/creator can remove members"
  on public.group_members for delete
  using (
    exists (
      select 1 from public.expense_groups
      where id = group_id
        and created_by = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- expenses
-- ------------------------------------------------------------
drop policy if exists "Group members can view expenses" on public.expenses;
drop policy if exists "Group members can add expenses" on public.expenses;
drop policy if exists "Expense creator can update their expense" on public.expenses;
drop policy if exists "Expense creator can delete their expense" on public.expenses;

create policy "Group members can view expenses"
  on public.expenses for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = expenses.group_id
        and user_id = (select auth.uid())
    )
  );

create policy "Group members can add expenses"
  on public.expenses for insert
  with check (
    (select auth.uid()) = paid_by
    and exists (
      select 1 from public.group_members
      where group_id = expenses.group_id
        and user_id = (select auth.uid())
    )
  );

create policy "Expense creator can update their expense"
  on public.expenses for update
  using ((select auth.uid()) = paid_by);

create policy "Expense creator can delete their expense"
  on public.expenses for delete
  using ((select auth.uid()) = paid_by);

-- ------------------------------------------------------------
-- expense_splits
-- ------------------------------------------------------------
drop policy if exists "Group members can view splits" on public.expense_splits;
drop policy if exists "Expense creator can manage splits" on public.expense_splits;
drop policy if exists "Members can settle own splits" on public.expense_splits;

create policy "Group members can view splits"
  on public.expense_splits for select
  using (
    exists (
      select 1 from public.expenses e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = expense_splits.expense_id
        and gm.user_id = (select auth.uid())
    )
  );

create policy "Expense creator can manage splits"
  on public.expense_splits for all
  using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_splits.expense_id
        and e.paid_by = (select auth.uid())
    )
  );

create policy "Members can settle own splits"
  on public.expense_splits for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- settlements
-- ------------------------------------------------------------
drop policy if exists "Group members can view settlements" on public.settlements;
drop policy if exists "Members can create settlements" on public.settlements;

create policy "Group members can view settlements"
  on public.settlements for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = settlements.group_id
        and user_id = (select auth.uid())
    )
  );

create policy "Members can create settlements"
  on public.settlements for insert
  with check (
    (select auth.uid()) = paid_by
    and exists (
      select 1 from public.group_members
      where group_id = settlements.group_id
        and user_id = (select auth.uid())
    )
  );

-- ------------------------------------------------------------
-- notification_queue
-- ------------------------------------------------------------
drop policy if exists "Users can view own notifications" on public.notification_queue;
drop policy if exists "Users can mark own notifications as read" on public.notification_queue;

create policy "Users can view own notifications"
  on public.notification_queue for select
  using ((select auth.uid()) = user_id);

create policy "Users can mark own notifications as read"
  on public.notification_queue for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- push_subscriptions
-- ------------------------------------------------------------
drop policy if exists "Users can manage own push subscriptions" on public.push_subscriptions;

create policy "Users can manage own push subscriptions"
  on public.push_subscriptions for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
