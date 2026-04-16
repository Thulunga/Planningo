-- ============================================================
-- Trading Bot: Admin-only paper trading tables
-- ============================================================

-- Watchlist: stocks the admin wants to monitor
CREATE TABLE trading_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,           -- e.g. "RELIANCE.NS"
  display_name TEXT NOT NULL,     -- e.g. "Reliance Industries"
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, symbol)
);

-- Signals: generated buy/sell signals from indicator engine
CREATE TABLE trading_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('BUY', 'SELL', 'HOLD')),
  strength TEXT NOT NULL CHECK (strength IN ('WEAK', 'STRONG', 'VERY_STRONG')),
  price DECIMAL(12,2) NOT NULL,
  indicators JSONB NOT NULL DEFAULT '{}',
  confluence_score INT NOT NULL CHECK (confluence_score BETWEEN 0 AND 5),
  candle_time TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Paper trades: simulated trade executions
CREATE TABLE paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES trading_signals(id) ON DELETE SET NULL,
  symbol TEXT NOT NULL,
  trade_type TEXT NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  quantity INT NOT NULL CHECK (quantity > 0),
  entry_price DECIMAL(12,2) NOT NULL,
  exit_price DECIMAL(12,2),
  entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  exit_time TIMESTAMPTZ,
  pnl DECIMAL(12,2),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'STOPPED_OUT')),
  stop_loss DECIMAL(12,2),
  target DECIMAL(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Portfolio: one row per user, tracks virtual capital and stats
CREATE TABLE paper_portfolio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  virtual_capital DECIMAL(14,2) NOT NULL DEFAULT 100000,
  available_cash DECIMAL(14,2) NOT NULL DEFAULT 100000,
  total_pnl DECIMAL(14,2) NOT NULL DEFAULT 0,
  total_trades INT NOT NULL DEFAULT 0,
  winning_trades INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Enable Realtime broadcast for live signal updates
-- ============================================================
ALTER TABLE trading_signals REPLICA IDENTITY FULL;
ALTER TABLE paper_trades REPLICA IDENTITY FULL;
ALTER TABLE paper_portfolio REPLICA IDENTITY FULL;

-- ============================================================
-- Row-Level Security (admin only — RLS enforces it)
-- ============================================================
ALTER TABLE trading_watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE trading_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE paper_portfolio ENABLE ROW LEVEL SECURITY;

-- Only the owning user can read/write their own rows
CREATE POLICY "trading_watchlist_user_policy" ON trading_watchlist
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "trading_signals_user_policy" ON trading_signals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "paper_trades_user_policy" ON paper_trades
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "paper_portfolio_user_policy" ON paper_portfolio
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- Performance indexes
-- ============================================================
CREATE INDEX idx_trading_signals_user_created ON trading_signals (user_id, created_at DESC);
CREATE INDEX idx_trading_signals_symbol ON trading_signals (symbol, candle_time DESC);
CREATE INDEX idx_paper_trades_user_status ON paper_trades (user_id, status);
CREATE INDEX idx_paper_trades_symbol ON paper_trades (symbol, entry_time DESC);
CREATE INDEX idx_trading_watchlist_user_active ON trading_watchlist (user_id, is_active);

-- ============================================================
-- Auto-update updated_at on paper_portfolio
-- ============================================================
CREATE TRIGGER update_paper_portfolio_updated_at
  BEFORE UPDATE ON paper_portfolio
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
