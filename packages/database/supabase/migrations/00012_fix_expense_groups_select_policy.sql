-- Migration: 00012_fix_expense_groups_select_policy
--
-- PROBLEM: When createExpenseGroup does INSERT … RETURNING, PostgreSQL
--          evaluates the SELECT policy on the newly created row before the
--          creator has been added to group_members. Because the only permissive
--          SELECT policy requires a matching group_members row, the RETURNING
--          clause finds no visible row and PostgreSQL raises:
--            "new row violates row-level security policy for table expense_groups"
--
-- FIX: Extend the SELECT policy so that the group creator can always see rows
--      they own, in addition to the existing member-based visibility check.
--      Separating them into two permissive policies is the cleanest approach:
--      PostgreSQL grants access when ANY permissive policy passes.

drop policy if exists "Group members can view group" on public.expense_groups;

-- Policy 1: Creator can always see their own groups (no dependency on group_members)
create policy "Group creator can view own group"
  on public.expense_groups for select
  using ((select auth.uid()) = created_by);

-- Policy 2: Any member can see the group (preserves existing member-based access)
create policy "Group members can view group"
  on public.expense_groups for select
  using (
    exists (
      select 1 from public.group_members
      where group_id = expense_groups.id
        and user_id = (select auth.uid())
    )
  );
