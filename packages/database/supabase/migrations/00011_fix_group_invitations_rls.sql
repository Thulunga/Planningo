-- Migration: 00011_fix_group_invitations_rls

-- Drop the problematic policies that reference auth.users
drop policy if exists "Users can view their own invitations" on public.group_invitations;

-- Drop and recreate the admin policy with explicit check
drop policy if exists "Admins can manage invitations" on public.group_invitations;

-- Drop and recreate public read policy to make migration re-runnable
drop policy if exists "Public can view invitations by code" on public.group_invitations;

create policy "Admins can manage invitations"
  on public.group_invitations for all
  using (
    exists (
      select 1 from public.group_members
      where group_id = group_invitations.group_id 
        and user_id = auth.uid() 
        and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.group_members
      where group_id = group_invitations.group_id 
        and user_id = auth.uid() 
        and role = 'admin'
    )
  );

-- Create a public policy to allow anyone to view invitations by code (for join flow)
create policy "Public can view invitations by code"
  on public.group_invitations for select
  using (true);
