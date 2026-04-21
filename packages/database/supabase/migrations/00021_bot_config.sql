-- Bot configuration persistence.
-- One row per user (upserted on save). Stores the full BotConfig JSON
-- so that both the web UI and the server-side signal scan share the same settings.

CREATE TABLE IF NOT EXISTS bot_config (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  config      JSONB        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE (user_id)
);

ALTER TABLE bot_config ENABLE ROW LEVEL SECURITY;

-- Each user can only read/write their own config row.
CREATE POLICY "Users manage own bot_config"
  ON bot_config
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index is effectively the unique constraint, but add one for good measure.
CREATE INDEX idx_bot_config_user ON bot_config (user_id);
