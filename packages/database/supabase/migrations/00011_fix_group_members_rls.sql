-- Migration: 00011_fix_group_members_rls
--
-- PROBLEM: The SELECT policy on group_members queries group_members to check
--          whether the current user is a member, causing infinite recursion.
--          The INSERT policy also queries group_members for the admin check,
--          which triggers the SELECT policy → same recursive loop.
--
-- FIX: Introduce two SECURITY DEFINER helper functions that bypass RLS when
--      querying group_members. Policies call these functions instead of
--      issuing direct sub-selects against the same table.

-- Returns true when the current user is any member of the given group.
create or replace function public.current_user_is_group_member(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid
      and user_id = auth.uid()
  );
$$;

-- Returns true when the current user holds the 'admin' role in the given group.
create or replace function public.current_user_is_group_admin(gid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid
      and user_id = auth.uid()
      and role = 'admin'
  );
$$;

-- ------------------------------------------------------------
-- Rewrite the three group_members policies that cause recursion
-- ------------------------------------------------------------
drop policy if exists "Group members can view membership" on public.group_members;
drop policy if exists "Group admin/creator can add members" on public.group_members;
drop policy if exists "Group admin/creator can remove members" on public.group_members;

-- SELECT: use the security-definer function so the membership look-up skips RLS
create policy "Group members can view membership"
  on public.group_members for select
  using (public.current_user_is_group_member(group_id));

-- INSERT: group creator OR an existing admin may add members
--         (creator check uses expense_groups, no recursion;
--          admin check uses the security-definer function)
create policy "Group admin/creator can add members"
  on public.group_members for insert
  with check (
    exists (
      select 1 from public.expense_groups
      where id = group_id
        and created_by = (select auth.uid())
    )
    or public.current_user_is_group_admin(group_id)
  );

-- DELETE: only the group creator may remove members (unchanged logic, no recursion)
create policy "Group admin/creator can remove members"
  on public.group_members for delete
  using (
    exists (
      select 1 from public.expense_groups
      where id = group_id
        and created_by = (select auth.uid())
    )
  );
