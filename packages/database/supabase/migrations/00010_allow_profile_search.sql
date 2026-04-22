-- Migration: 00010_allow_profile_search

-- Allow users to view all profiles for search/group invitation purposes
create policy "Users can view all profiles for discovery"
  on public.profiles for select
  using (true);
