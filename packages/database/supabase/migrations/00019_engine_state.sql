-- Engine state persistence: survives Railway restarts mid-session.
-- Stores the daily risk tracking values that were previously in-memory only.
--
-- One row per (admin_user_id, trading_day). Upserted on every state change.

CREATE TABLE IF NOT EXISTS engine_state (
  id               BIGSERIAL    PRIMARY KEY,
  admin_user_id    UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trading_day      DATE         NOT NULL DEFAULT CURRENT_DATE,
  start_of_day_equity DECIMAL(15, 2) NOT NULL DEFAULT 0,
  last_loss_time   TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (admin_user_id, trading_day)
);

ALTER TABLE engine_state ENABLE ROW LEVEL SECURITY;

-- Service role (used by trading-engine) has full access.
-- Web app users have no access (risk state is internal engine data).
CREATE POLICY "Service role full access on engine_state"
  ON engine_state
  USING (true)
  WITH CHECK (true);

-- Index for the common lookup: latest state for a given user
CREATE INDEX idx_engine_state_user_day
  ON engine_state (admin_user_id, trading_day DESC);
