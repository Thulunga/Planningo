-- Fix: uno tables written by service_role need REPLICA IDENTITY FULL so that
-- Supabase Realtime can broadcast row-level change events to clients.
-- This is required for postgres_changes subscriptions with row filters to work.

alter table public.uno_rooms   replica identity full;
alter table public.uno_players replica identity full;
alter table public.uno_state   replica identity full;
alter table public.uno_events  replica identity full;
alter table public.uno_chat    replica identity full;
