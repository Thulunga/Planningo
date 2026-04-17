-- ─────────────────────────────────────────────────────────────────────────────
-- 00014_engine_tables.sql
-- Railway trading-engine support tables:
--   service_heartbeat  — single-row status beacon (public read, service writes)
--   scan_logs          — per-symbol scan results with full indicator breakdown
-- ─────────────────────────────────────────────────────────────────────────────

-- ── service_heartbeat ──────────────────────────────────────────────────────
-- One row, upserted every 30 s by the Railway engine.
-- The UI subscribes via Realtime to know if the engine is alive.
CREATE TABLE IF NOT EXISTS service_heartbeat (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name      TEXT NOT NULL DEFAULT 'trading-engine',
  status            TEXT NOT NULL DEFAULT 'STARTING',  -- STARTING | RUNNING | STOPPING | OFFLINE
  last_heartbeat    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scan_count        INT  NOT NULL DEFAULT 0,     -- total scans executed since boot
  signal_count      INT  NOT NULL DEFAULT 0,     -- signals generated today
  symbols_watched   INT  NOT NULL DEFAULT 0,     -- watchlist size
  current_symbol    TEXT,                        -- symbol being scanned right now (NULL = idle)
  engine_version    TEXT,
  started_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Only one row per service name
CREATE UNIQUE INDEX IF NOT EXISTS service_heartbeat_name_idx ON service_heartbeat (service_name);

-- Enable Realtime so dashboard sees status changes instantly
ALTER TABLE service_heartbeat REPLICA IDENTITY FULL;

-- No RLS — engine uses service-role key, UI reads anonymously
-- (Row contains no personal data)

-- ── scan_logs ──────────────────────────────────────────────────────────────
-- One row per symbol per scan cycle.
-- Stores every indicator value and the trade-decision reasoning.
CREATE TABLE IF NOT EXISTS scan_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID REFERENCES profiles(id) ON DELETE CASCADE,
  symbol            TEXT NOT NULL,
  scanned_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price             DECIMAL(12,2),

  -- Raw indicator values
  rsi               DECIMAL(8,4),
  macd              DECIMAL(10,4),
  macd_signal       DECIMAL(10,4),
  macd_histogram    DECIMAL(10,4),
  ema9              DECIMAL(12,4),
  ema21             DECIMAL(12,4),
  bb_upper          DECIMAL(12,4),
  bb_middle         DECIMAL(12,4),
  bb_lower          DECIMAL(12,4),
  supertrend        TEXT,          -- 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  supertrend_line   DECIMAL(12,4),
  atr               DECIMAL(10,4),
  vwap              DECIMAL(12,4),

  -- Individual indicator votes (+1 BUY, -1 SELL, 0 HOLD)
  votes             JSONB,         -- { ema_cross, rsi, macd, supertrend, bb, vwap }

  -- Confluence result
  confluence_score  INT,
  signal_type       TEXT,          -- 'BUY' | 'SELL' | 'HOLD'
  signal_strength   TEXT,          -- 'WEAK' | 'STRONG' | 'VERY_STRONG' | null

  -- Human-readable reason for each indicator vote
  reasons           JSONB,         -- { ema_cross: "EMA9 ↑ EMA21", rsi: "RSI 58 — neutral momentum", ... }

  -- Trade execution outcome
  trade_action      TEXT,          -- 'OPENED' | 'CLOSED' | 'SKIPPED' | 'HOLD'
  trade_reason      TEXT,          -- e.g. "BUY 14 × RELIANCE.NS @ ₹2845 | SL: ₹2805 | Target: ₹2905"
  trade_id          UUID REFERENCES paper_trades(id) ON DELETE SET NULL,

  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Realtime for live activity log in UI
ALTER TABLE scan_logs REPLICA IDENTITY FULL;

-- Performance indexes
CREATE INDEX IF NOT EXISTS scan_logs_user_scanned_idx ON scan_logs (user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS scan_logs_symbol_idx       ON scan_logs (symbol, scanned_at DESC);

-- RLS: each admin user sees only their own logs
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own scan logs"
  ON scan_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scan logs"
  ON scan_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- service_heartbeat is intentionally public (no personal data)
-- No RLS on service_heartbeat
