-- ─────────────────────────────────────────────────────────────────────────────
-- 00015_realtime_publications.sql
-- Add engine tables to the supabase_realtime publication.
-- REPLICA IDENTITY FULL alone is not enough - the table must also be listed
-- in the publication for Supabase Realtime to broadcast row-change events.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE service_heartbeat;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE trading_signals;
