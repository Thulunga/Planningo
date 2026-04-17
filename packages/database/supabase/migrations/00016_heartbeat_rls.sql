-- ─────────────────────────────────────────────────────────────────────────────
-- 00016_heartbeat_rls.sql
-- Enable RLS on service_heartbeat with a public SELECT policy.
--
-- The Railway engine writes via service-role key (bypasses RLS automatically).
-- The web UI reads via anon/auth key, so it needs an explicit SELECT policy.
-- The row contains no personal data — public read is intentional.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.service_heartbeat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on service_heartbeat"
  ON public.service_heartbeat
  FOR SELECT
  USING (true);
