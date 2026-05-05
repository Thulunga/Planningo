-- Wealth Lab configuration persistence.
-- One row per user with JSON config payload.

CREATE TABLE IF NOT EXISTS wealth_lab_config (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  config      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (user_id)
);

ALTER TABLE wealth_lab_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own wealth_lab_config"
  ON wealth_lab_config
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_wealth_lab_config_user ON wealth_lab_config (user_id);
