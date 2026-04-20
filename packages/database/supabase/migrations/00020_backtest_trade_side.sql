-- Add missing `side` column to backtest_trades.
-- Without this every trade defaulted to 'LONG' in the UI export,
-- masking SHORT trades and making win-rate analysis unreliable.
ALTER TABLE backtest_trades
  ADD COLUMN IF NOT EXISTS side TEXT DEFAULT 'LONG'
    CHECK (side IN ('LONG', 'SHORT'));
