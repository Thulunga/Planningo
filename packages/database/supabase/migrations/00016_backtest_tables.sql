-- ─────────────────────────────────────────────────────────────────────────────
-- 00016_backtest_tables.sql
-- Backtesting engine persistence: runs, individual trades, optimizer experiments.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── backtest_runs ─────────────────────────────────────────────────────────────
-- One row per backtest execution.  config stores the full StrategyConfig +
-- RiskConfig snapshot so runs are fully reproducible.
CREATE TABLE IF NOT EXISTS backtest_runs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  symbol              TEXT        NOT NULL,
  start_date          DATE        NOT NULL,
  end_date            DATE        NOT NULL,
  initial_capital     DECIMAL(14,2) NOT NULL DEFAULT 100000,
  config              JSONB       NOT NULL DEFAULT '{}',  -- StrategyConfig + RiskConfig + slippage params
  metrics             JSONB,                              -- PerformanceMetrics (null until completed)
  equity_curve        JSONB,                              -- Array of EquityPoint
  status              TEXT        NOT NULL DEFAULT 'RUNNING'
                        CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  error_message       TEXT,
  total_candles       INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS backtest_runs_user_idx
  ON backtest_runs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS backtest_runs_symbol_idx
  ON backtest_runs (symbol, start_date DESC);

-- ── backtest_trades ───────────────────────────────────────────────────────────
-- Individual simulated trades within a backtest run.
-- exit_reason: SIGNAL_SELL | STOP_HIT | TARGET_HIT | EOD_CLOSE | FORCE_CLOSE
CREATE TABLE IF NOT EXISTS backtest_trades (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              UUID        NOT NULL REFERENCES backtest_runs(id) ON DELETE CASCADE,
  symbol              TEXT        NOT NULL,
  entry_time          TIMESTAMPTZ NOT NULL,
  entry_price         DECIMAL(12,2) NOT NULL,
  exit_time           TIMESTAMPTZ,
  exit_price          DECIMAL(12,2),
  quantity            INT         NOT NULL CHECK (quantity > 0),
  stop_loss           DECIMAL(12,2),
  target              DECIMAL(12,2),
  pnl                 DECIMAL(12,2),              -- net after charges
  pnl_pct             DECIMAL(8,4),
  r_multiple          DECIMAL(8,4),               -- PnL / initial risk
  status              TEXT        NOT NULL DEFAULT 'OPEN'
                        CHECK (status IN ('OPEN', 'CLOSED', 'STOPPED_OUT', 'TARGET_HIT', 'EOD_CLOSED')),
  exit_reason         TEXT,
  mae                 DECIMAL(12,4),              -- Maximum Adverse Excursion (Rs)
  mfe                 DECIMAL(12,4),              -- Maximum Favourable Excursion (Rs)
  duration_minutes    INT,
  confluence_score    INT         CHECK (confluence_score IS NULL OR (confluence_score >= 0 AND confluence_score <= 6)),
  signal_strength     TEXT        CHECK (signal_strength IS NULL OR signal_strength IN ('WEAK', 'STRONG', 'VERY_STRONG')),
  risk_amount         DECIMAL(12,2),              -- rupees risked at entry
  charges_total       DECIMAL(10,4),              -- brokerage + taxes
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS backtest_trades_run_idx
  ON backtest_trades (run_id, entry_time);

-- ── optimizer_experiments ─────────────────────────────────────────────────────
-- One row per optimizer job; results stores the ranked ExperimentResult array.
CREATE TABLE IF NOT EXISTS optimizer_experiments (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        REFERENCES profiles(id) ON DELETE CASCADE,
  symbol                TEXT        NOT NULL,
  start_date            DATE        NOT NULL,
  end_date              DATE        NOT NULL,
  initial_capital       DECIMAL(14,2) NOT NULL DEFAULT 100000,
  param_grid            JSONB       NOT NULL DEFAULT '{}',
  base_strategy_config  JSONB       NOT NULL DEFAULT '{}',
  base_risk_config      JSONB       NOT NULL DEFAULT '{}',
  results               JSONB       NOT NULL DEFAULT '[]',  -- ExperimentResult[]
  best_config           JSONB,                              -- top-ranked params
  best_score            DECIMAL(10,6),
  total_combinations    INT         NOT NULL DEFAULT 0,
  completed_combinations INT        NOT NULL DEFAULT 0,
  min_trades_guard      INT         NOT NULL DEFAULT 10,
  max_drawdown_cap      DECIMAL(8,2) NOT NULL DEFAULT -30,
  rank_by               TEXT        NOT NULL DEFAULT 'composite',
  status                TEXT        NOT NULL DEFAULT 'RUNNING'
                          CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED')),
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS optimizer_experiments_user_idx
  ON optimizer_experiments (user_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE backtest_runs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_trades        ENABLE ROW LEVEL SECURITY;
ALTER TABLE optimizer_experiments  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "backtest_runs_user_policy" ON backtest_runs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "backtest_trades_via_run" ON backtest_trades
  FOR ALL USING (
    EXISTS (SELECT 1 FROM backtest_runs r WHERE r.id = run_id AND r.user_id = auth.uid())
  );

CREATE POLICY "optimizer_experiments_user_policy" ON optimizer_experiments
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────
ALTER TABLE backtest_runs         REPLICA IDENTITY FULL;
ALTER TABLE optimizer_experiments REPLICA IDENTITY FULL;
