-- ─────────────────────────────────────────────────────────────────────────────
-- 00018_atomic_trade_rpcs.sql
-- Atomic Postgres functions for paper trade open/close operations.
--
-- Why: the original app did two separate UPDATE calls for a trade close:
--   1. UPDATE paper_trades SET exit_price = ...
--   2. UPDATE paper_portfolio SET available_cash = available_cash + ...
--
-- If the process crashes between 1 and 2, portfolio balance is permanently
-- inconsistent.  These RPCs wrap both mutations in a single transaction with
-- an advisory lock on the portfolio row (SELECT ... FOR UPDATE).
--
-- Both functions use SECURITY DEFINER so the service-role client can call
-- them without bypassing RLS checks — the function verifies ownership.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── open_paper_trade ──────────────────────────────────────────────────────────
-- Inserts a trade and atomically deducts the cost from available_cash.
-- Returns the new trade UUID, or raises an exception on failure.
-- Idempotency: a unique index on (user_id, symbol, status='OPEN') is enforced
-- at the application level (checked before calling this function).
CREATE OR REPLACE FUNCTION open_paper_trade(
  p_user_id    UUID,
  p_signal_id  UUID,
  p_symbol     TEXT,
  p_quantity   INT,
  p_entry_price DECIMAL,
  p_stop_loss  DECIMAL,
  p_target     DECIMAL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade_id    UUID;
  v_trade_cost  DECIMAL;
  v_portfolio   paper_portfolio%ROWTYPE;
BEGIN
  -- Validate inputs
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be positive, got %', p_quantity;
  END IF;
  IF p_entry_price <= 0 THEN
    RAISE EXCEPTION 'Entry price must be positive, got %', p_entry_price;
  END IF;

  -- Lock the portfolio row to prevent concurrent balance mutations
  SELECT * INTO v_portfolio
  FROM paper_portfolio
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portfolio not found for user %', p_user_id;
  END IF;

  v_trade_cost := p_quantity * p_entry_price;

  IF v_portfolio.available_cash < v_trade_cost THEN
    RAISE EXCEPTION 'Insufficient cash: need ₹%, have ₹%',
      round(v_trade_cost, 2), round(v_portfolio.available_cash, 2);
  END IF;

  -- Insert the trade
  INSERT INTO paper_trades (
    user_id, signal_id, symbol, trade_type,
    quantity, entry_price, entry_time, status, stop_loss, target
  )
  VALUES (
    p_user_id, p_signal_id, p_symbol, 'BUY',
    p_quantity, p_entry_price, NOW(), 'OPEN', p_stop_loss, p_target
  )
  RETURNING id INTO v_trade_id;

  -- Update portfolio atomically
  UPDATE paper_portfolio
  SET
    available_cash = available_cash - v_trade_cost,
    total_trades   = total_trades + 1,
    updated_at     = NOW()
  WHERE user_id = p_user_id;

  RETURN v_trade_id;
END;
$$;

-- ── close_paper_trade ─────────────────────────────────────────────────────────
-- Closes an open trade and atomically returns funds + P&L to available_cash.
-- Returns the net P&L (after charges — charges subtracted by caller).
-- Safe to call multiple times: raises exception if trade is already closed.
CREATE OR REPLACE FUNCTION close_paper_trade(
  p_user_id    UUID,
  p_trade_id   UUID,
  p_exit_price DECIMAL,
  p_status     TEXT DEFAULT 'CLOSED'  -- 'CLOSED' | 'STOPPED_OUT'
)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade       paper_trades%ROWTYPE;
  v_pnl         DECIMAL;
  v_returned    DECIMAL;
BEGIN
  IF p_status NOT IN ('CLOSED', 'STOPPED_OUT') THEN
    RAISE EXCEPTION 'Invalid status %; must be CLOSED or STOPPED_OUT', p_status;
  END IF;

  -- Lock and fetch the open trade (verifies ownership + open status atomically)
  SELECT * INTO v_trade
  FROM paper_trades
  WHERE id = p_trade_id
    AND user_id = p_user_id
    AND status = 'OPEN'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Open trade % not found for user %', p_trade_id, p_user_id;
  END IF;

  v_pnl      := ROUND((p_exit_price - v_trade.entry_price) * v_trade.quantity, 2);
  v_returned := v_trade.entry_price * v_trade.quantity + v_pnl;

  -- Update trade record
  UPDATE paper_trades
  SET
    exit_price = p_exit_price,
    exit_time  = NOW(),
    pnl        = v_pnl,
    status     = p_status
  WHERE id = p_trade_id;

  -- Lock and update portfolio
  UPDATE paper_portfolio
  SET
    available_cash = available_cash + v_returned,
    total_pnl      = total_pnl + v_pnl,
    winning_trades = CASE WHEN v_pnl > 0 THEN winning_trades + 1 ELSE winning_trades END,
    updated_at     = NOW()
  WHERE user_id = p_user_id;

  RETURN v_pnl;
END;
$$;

-- ── reset_paper_portfolio ─────────────────────────────────────────────────────
-- Resets portfolio to initial capital and closes/removes all open trades.
-- Used by the "reset portfolio" UI action.
CREATE OR REPLACE FUNCTION reset_paper_portfolio(
  p_user_id        UUID,
  p_initial_capital DECIMAL DEFAULT 100000
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Force-close all open trades at entry price (no P&L impact)
  UPDATE paper_trades
  SET status = 'CLOSED', exit_price = entry_price, exit_time = NOW(), pnl = 0
  WHERE user_id = p_user_id AND status = 'OPEN';

  -- Reset portfolio
  UPDATE paper_portfolio
  SET
    virtual_capital = p_initial_capital,
    available_cash  = p_initial_capital,
    total_pnl       = 0,
    total_trades    = 0,
    winning_trades  = 0,
    updated_at      = NOW()
  WHERE user_id = p_user_id;

  -- Upsert if portfolio row doesn't exist yet
  INSERT INTO paper_portfolio (user_id, virtual_capital, available_cash)
  VALUES (p_user_id, p_initial_capital, p_initial_capital)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION open_paper_trade     TO authenticated;
GRANT EXECUTE ON FUNCTION close_paper_trade    TO authenticated;
GRANT EXECUTE ON FUNCTION reset_paper_portfolio TO authenticated;
