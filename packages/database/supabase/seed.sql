-- Seed data for local development
-- Run after migrations with: supabase db reset

-- Note: auth.users are created via the Supabase auth system.
-- The profiles trigger will auto-create profile rows.
-- This seed only adds sample data after user creation.

-- To use: create a user via the app, then run this to add sample data.
-- Replace 'YOUR_USER_ID' with your actual user UUID from auth.users.

-- Example seed (commented out - replace UUID before using):
-- insert into public.todos (user_id, title, priority, status, due_date, tags) values
--   ('YOUR_USER_ID', 'Set up project repository', 'high', 'done', now() - interval '2 days', '{setup,dev}'),
--   ('YOUR_USER_ID', 'Design database schema', 'high', 'done', now() - interval '1 day', '{planning,design}'),
--   ('YOUR_USER_ID', 'Implement authentication', 'urgent', 'in_progress', now() + interval '1 day', '{auth,backend}'),
--   ('YOUR_USER_ID', 'Build dashboard UI', 'medium', 'todo', now() + interval '3 days', '{frontend,ui}'),
--   ('YOUR_USER_ID', 'Write API documentation', 'low', 'todo', now() + interval '7 days', '{docs}');
