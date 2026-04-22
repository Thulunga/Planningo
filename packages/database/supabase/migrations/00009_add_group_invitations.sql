-- Migration: 00009_add_group_invitations

-- Group invitations table for shareable invite links
create table public.group_invitations (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.expense_groups(id) on delete cascade,
  created_by   uuid not null references public.profiles(id) on delete restrict,
  invite_code  text not null unique,
  email        text, -- Optional: specific email if invited
  status       text not null default 'pending', -- 'pending' | 'accepted' | 'expired'
  accepted_by  uuid references public.profiles(id) on delete set null,
  expires_at   timestamptz not null default (now() + interval '30 days'),
  created_at   timestamptz not null default now(),
  
  constraint invite_code_length check (char_length(invite_code) >= 8)
);

-- Indexes
create index idx_group_invitations_group on public.group_invitations(group_id);
create index idx_group_invitations_code on public.group_invitations(invite_code);
create index idx_group_invitations_email on public.group_invitations(email);
create index idx_group_invitations_status on public.group_invitations(status);

-- RLS for group_invitations
alter table public.group_invitations enable row level security;

-- Policy for admins to manage invitations
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

-- Policy for users to accept their own invitations (by code, not email-based)
-- Anyone can access invitations by code without authentication (for join links)
create policy "Public can view invitations by code"
  on public.group_invitations for select
  using (true);
