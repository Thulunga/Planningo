-- ─────────────────────────────────────────────────────────────────────────────
-- 00017_analytics_tables.sql
-- Normalised analytics model: entry-time features + trade outcomes.
-- Enables win-rate slicing by time-of-day, indicator combo, session, etc.
-- Also serves as the foundation for a future ML training dataset export.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── trade_features ────────────────────────────────────────────────────────────
-- Snapshot of market/signal context at trade entry time.
-- Linked to either a live paper_trade or a backtest_trade (one of them must be set).
CREATE TABLE IF NOT EXISTS trade_features (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source links (at most one set)
  paper_trade_id        UUID        REFERENCES paper_trades(id)    ON DELETE CASCADE,
  backtest_trade_id     UUID        REFERENCES backtest_trades(id) ON DELETE CASCADE,

  symbol                TEXT        NOT NULL,
  entry_time            TIMESTAMPTZ NOT NULL,

  -- Session classification
  session               TEXT        CHECK (session IN ('MORNING', 'MIDDAY', 'AFTERNOON')),

  -- Signal quality
  confluence_score      INT         CHECK (confluence_score IS NULL OR (confluence_score >= 0 AND confluence_score <= 6)),
  signal_strength       TEXT        CHECK (signal_strength IS NULL OR signal_strength IN ('WEAK', 'STRONG', 'VERY_STRONG')),

  -- Indicator snapshot at entry
  rsi_at_entry          DECIMAL(8,4),
  atr_at_entry          DECIMAL(10,4),
  vwap_distance_pct     DECIMAL(8,4),    -- (price - vwap) / vwap * 100
  bb_position           TEXT            CHECK (bb_position IS NULL OR bb_position IN ('LOWER', 'MIDDLE', 'UPPER')),
  supertrend            TEXT            CHECK (supertrend IS NULL OR supertrend IN ('BUY', 'SELL')),
  ema_cross             TEXT            CHECK (ema_cross IS NULL OR ema_cross IN ('BUY', 'SELL', 'NEUTRAL')),

  -- MA boundary context
  ma_boundary_signal    TEXT            CHECK (ma_boundary_signal IS NULL OR ma_boundary_signal IN ('BUY', 'SELL', 'WAIT', 'NO_TRADE')),
  ma_boundary_confidence DECIMAL(6,3),

  -- Full vote breakdown for grouping queries
  votes                 JSONB,           -- { ema_cross, rsi, macd, supertrend, bb, vwap } → -1|0|1

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT trade_features_source_check CHECK (
    (paper_trade_id IS NOT NULL)::int + (backtest_trade_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS trade_features_paper_trade_idx ON trade_features (paper_trade_id);
CREATE INDEX IF NOT EXISTS trade_features_backtest_trade_idx ON trade_features (backtest_trade_id);
CREATE INDEX IF NOT EXISTS trade_features_entry_time_idx ON trade_features (symbol, entry_time DESC);
CREATE INDEX IF NOT EXISTS trade_features_session_idx ON trade_features (session);

-- ── trade_outcomes ────────────────────────────────────────────────────────────
-- Result summary linked to the same trade sources.
CREATE TABLE IF NOT EXISTS trade_outcomes (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  paper_trade_id        UUID        REFERENCES paper_trades(id)    ON DELETE CASCADE,
  backtest_trade_id     UUID        REFERENCES backtest_trades(id) ON DELETE CASCADE,

  symbol                TEXT        NOT NULL,
  pnl                   DECIMAL(12,2),
  pnl_pct               DECIMAL(8,4),
  r_multiple            DECIMAL(8,4),
  duration_minutes      INT,
  exit_reason           TEXT,
  mae                   DECIMAL(12,4),
  mfe                   DECIMAL(12,4),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT trade_outcomes_source_check CHECK (
    (paper_trade_id IS NOT NULL)::int + (backtest_trade_id IS NOT NULL)::int = 1
  )
);

CREATE INDEX IF NOT EXISTS trade_outcomes_paper_trade_idx    ON trade_outcomes (paper_trade_id);
CREATE INDEX IF NOT EXISTS trade_outcomes_backtest_trade_idx ON trade_outcomes (backtest_trade_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE trade_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_outcomes ENABLE ROW LEVEL SECURITY;

-- Allow access via the linked trade row (paper or backtest)
CREATE POLICY "trade_features_paper_policy" ON trade_features
  FOR ALL USING (
    paper_trade_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM paper_trades t WHERE t.id = paper_trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "trade_features_backtest_policy" ON trade_features
  FOR ALL USING (
    backtest_trade_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM backtest_trades bt
      JOIN backtest_runs r ON r.id = bt.run_id
      WHERE bt.id = backtest_trade_id AND r.user_id = auth.uid()
    )
  );

CREATE POLICY "trade_outcomes_paper_policy" ON trade_outcomes
  FOR ALL USING (
    paper_trade_id IS NOT NULL AND
    EXISTS (SELECT 1 FROM paper_trades t WHERE t.id = paper_trade_id AND t.user_id = auth.uid())
  );

CREATE POLICY "trade_outcomes_backtest_policy" ON trade_outcomes
  FOR ALL USING (
    backtest_trade_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM backtest_trades bt
      JOIN backtest_runs r ON r.id = bt.run_id
      WHERE bt.id = backtest_trade_id AND r.user_id = auth.uid()
    )
  );
