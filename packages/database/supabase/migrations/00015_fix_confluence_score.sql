-- ─────────────────────────────────────────────────────────────────────────────
-- 00015_fix_confluence_score.sql
--
-- The original constraint CHECK (confluence_score BETWEEN 0 AND 5) was
-- written for a 5-indicator engine.  The live engine uses 6 indicators,
-- so the maximum possible score is 6.  Any INSERT with score = 6 currently
-- violates the constraint and the signal is silently dropped.
--
-- This migration widens the allowed range to 0–6.
-- ─────────────────────────────────────────────────────────────────────────────

-- trading_signals.confluence_score
ALTER TABLE trading_signals
  DROP CONSTRAINT IF EXISTS trading_signals_confluence_score_check;

ALTER TABLE trading_signals
  ADD CONSTRAINT trading_signals_confluence_score_check
    CHECK (confluence_score >= 0 AND confluence_score <= 6);

-- scan_logs.confluence_score has no constraint — add one for consistency
ALTER TABLE scan_logs
  DROP CONSTRAINT IF EXISTS scan_logs_confluence_score_check;

ALTER TABLE scan_logs
  ADD CONSTRAINT scan_logs_confluence_score_check
    CHECK (confluence_score IS NULL OR (confluence_score >= 0 AND confluence_score <= 6));
