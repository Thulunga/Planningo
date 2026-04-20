# Phase 7 Refactoring: Weighted Confluence & Market Structure Trading System

## Overview

**Problem**: Original strategy had 0% win rate on RELIANCE.NS (6 losing trades, all counter-trend entries) due to:
- Equal-weight 6-indicator voting with only 4/6 threshold → many false signals
- No trend validation → entries against market direction
- No structure confirmation → entries at local tops/bottoms
- No volume check → entries on declining participation
- No SHORT trades enabled → missed reversals
- No partial profit taking → all-or-nothing exits
- No market hour filters → trapped in volatile periods
- No daily trade limits → overtrading

## Solution: 8-Phase Refactoring

### Phase 1-2: Foundation
✅ **Multi-timeframe HTF trend filter** - 15-min EMA(50) + RSI(14) validates direction
✅ **Enabled SHORT trades** - Symmetric long/short logic

### Phase 3: Market Structure & Volume
✅ **Structure analyzer** - Detects swing breaks, pullbacks, strong candles
✅ **Volume analyzer** - Confirms entry on elevated volume (1.2x MA)

### Phase 4: Exit Mechanics
✅ **Partial booking at 1R** - 50% position closes at break-even + 1R
✅ **Trailing stop for remaining** - Lock profits on swing lows/highs

### Phase 5: Risk Filters
✅ **Time-based blackout periods** - Skip 9:15–9:30 and 3:00–3:30 IST (high volatility)

### Phase 6: Position Limits
✅ **Max 3 trades/day** - Prevent overtrading, reduce drawdown

### Phase 7: Signal Quality (NEW)
✅ **Weighted confluence scoring** - Replace equal voting with weighted system
  - Structure (swing breaks): 2 points (confidence-based, 0-2)
  - Volume confirmation: 1 point (binary, 0-1)
  - VWAP: 2 points (high institutional value)
  - EMA, RSI, MACD, Supertrend: 1 point each
  - Bollinger Bands: 0.5 points (lowest confidence)
  - **Maximum possible: 9.5 points**
  - **New threshold: 6+ points** (vs. old 4/6 equal votes)

### Phase 8: Testing & Documentation
✅ **Comprehensive unit tests** - 22 tests covering all major functions
✅ **JSDoc comments** - Function documentation and design decisions
✅ **This document** - Architecture and design rationale

---

## New Modules & Key Functions

### 1. `multi-timeframe-analyzer.ts`
**Purpose**: HTF (15-min) trend detection as MANDATORY filter

```typescript
getTrendContext(candles, htfConfig): TrendContext
- Aggregates 5-min candles into 15-min bars
- Calculates EMA(50) and RSI(14) on HTF
- Returns: BULLISH (EMA > price, RSI > 40), BEARISH (EMA < price, RSI < 60), NEUTRAL
```

### 2. `structure-analyzer.ts` 
**Purpose**: Price action patterns for high-probability entries

```typescript
analyzeBullishStructure(candles, price, ema9, ema21, atr, vwap, config): StructureSignal
- getSwingHigh(): Find recent local highs (period=10)
- isPullbackToEMA(): Check if price within 1% of EMA
- isStrongCandle(): Range > 2.0 × ATR
- Returns: confidence (0-1) + pattern name

analyzeBearishStructure(...): StructureSignal
- Mirror logic for short setups
```

### 3. `volume-analyzer.ts`
**Purpose**: Volume confirmation to filter weak entries

```typescript
analyzeVolume(candles, config): VolumeAnalysis
- calculateVolumeMA(period=20): 20-candle MA
- volumeRatio = current_volume / MA
- isConfirmed = ratio >= 1.2x threshold

isVolumeConfirmed(candles, multiplier, period): boolean
- Shorthand for quick checks in signal logic
```

### 4. `time-filter.ts`
**Purpose**: Skip high-volatility and low-liquidity periods

```typescript
isTradeAllowedByTime(unixSeconds, config): boolean
- IST timezone math (UTC+5:30)
- Blackout: 9:15–9:30 (open volatility), 3:00–3:30 (close)
- Returns false if within skip ranges

getTimeFilterReason(unixSeconds, config): string
- Explains why trade is blocked/allowed
```

### 5. `signal-engine.ts` (REFACTORED)
**Purpose**: Generate weighted-scoring signals with structure + volume

**Old System** (REMOVED):
- 6 equal-weight indicators voting
- Threshold: 4/6 votes needed
- Strength: 4→WEAK, 5→STRONG, 6→VERY_STRONG

**New System** (PHASE 7):
```typescript
generateSignal(indicators, candles, config, trendContext): Signal
1. Calculate 6 traditional indicator votes (EMA, RSI, MACD, Supertrend, BB, VWAP)
2. Add structure analysis (bullish/bearish patterns) → weight 0-2
3. Add volume confirmation → weight 0-1
4. Sum weighted scores:
   - buyScore, sellScore = sum of matching votes' weights
   - Threshold: 6+ points for BUY or SELL
   - Signal = 'HOLD' if score < 6
5. Apply mandatory HTF trend filter:
   - Reject BUY if trend = BEARISH or NEUTRAL
   - Reject SELL if trend = BULLISH or NEUTRAL
6. Assign strength:
   - WEAK: 6-7 points
   - STRONG: 7-8 points
   - VERY_STRONG: 8+ points
```

### 6. `trade-simulator.ts` (ENHANCED)
**Purpose**: Lifecycle management with partial exits and trailing

```typescript
checkPartialBooking1R(trade, candle): number | null
- LONG: returns (entry + (entry - SL)) if candle.high hits it
- SHORT: returns (entry - (SL - entry)) if candle.low hits it
- Returns null if 1R not reached

executePartialBooking(trade, oneRExitPrice, atr, candle, config): [closedPartial, remaining]
- Closes 50% at oneRExitPrice (with charges/slippage)
- Remaining 50%: SL moved to entry ± 0.5×ATR (break-even buffer)
- Returns pair: [closed trade for P&L calc, remaining trade for trailing]

updateTrailingStop(trade, recentCandles, atr): void
- LONG: trailing SL = min(recent_close) - 1.5×ATR
- SHORT: trailing SL = max(recent_close) + 1.5×ATR

checkTrailingStopHit(trade, candle): number | null
- Returns exit price if trailing SL breached, else null
```

### 7. `backtester.ts` (INTEGRATED)
**Step 1 - Update Positions**:
- Check partial booking at 1R, execute if hit
- Update trailing stop, check trailing hit
- Normal stop/target checks

**Step 2 - EOD Close**: Force close at 3:30 IST

**Step 3 - Signal Generation**:
- Time filter check: skip 9:15–9:30, 3:00–3:30
- HTF trend context calculation
- Signal generation with trend filter

**Step 4-5 - Entry Logic**:
- Max daily trade limit check (3 trades/day)
- Risk manager validation
- Position opening

---

## Weights & Scoring Example

**Setup**: RELIANCE.NS, 11:00 IST, bullish momentum

| Indicator | Vote | Weight | Score |
|-----------|------|--------|-------|
| EMA Cross (9 > 21) | BUY | 1.0 | 1.0 |
| RSI (65) | BUY | 1.0 | 1.0 |
| MACD (positive hist) | BUY | 1.0 | 1.0 |
| Supertrend (up) | BUY | 1.0 | 1.0 |
| BB (above mid) | BUY | 0.5 | 0.5 |
| VWAP (price > VWAP) | BUY | 2.0 | 2.0 |
| **Structure** (swing high break) | BUY | 2.0 × 0.8 conf = **1.6** | 1.6 |
| **Volume** (1.8x MA) | BUY | 1.0 | **1.0** |
| | | | **Total: 9.1** |

**HTF Trend**: BULLISH (EMA50 < price, RSI 65) ✅ Allows BUY

**Signal Result**:
- Type: **BUY** ✅ (9.1 ≥ 6)
- Strength: **VERY_STRONG** ✅ (9.1 ≥ 8)
- Confidence: High conviction due to structure + volume confirmation

---

## Configuration

### Strategy Config
```typescript
confluenceThreshold: 6  // Weighted points threshold (was 4/6)
emaFast: 9, emaSlow: 21
rsiPeriod: 14, rsiOversold: 30, rsiOverbought: 70
macdFast: 12, macdSlow: 26, macdSignal: 9
// ... etc
```

### HTF Config
```typescript
htfPeriod: 3        // 3 × 5-min = 15-min candles
emaPeriod: 50       // EMA(50) on HTF for trend
rsiPeriod: 14       // RSI(14) on HTF for strength
```

### Risk Config (NEW)
```typescript
maxTradesPerDay: 3  // Enforce daily limit
```

### Time Filter Config
```typescript
enabled: true
skipRanges: [
  { start: '09:15', end: '09:30' },  // Market open volatility
  { start: '15:00', end: '15:30' },  // Market close volatility
]
// IST timezone-aware
```

---

## Expected Improvements

**Metric** | **Before (0% WR)** | **Target (Phase 8)**
---------|------------------|--------------------
Win Rate | 0% | 25–40%
Max Drawdown | -2.74% | <2%
Sharpe Ratio | n/a (0 wins) | >0.5
Profit Factor | 0 | >1.0
Avg Trade | -650₹ | +500–1000₹
R:R Ratio | 0 (all losses) | 2:1 (target/stop)
Trades/Day | 6 (overtrading) | ≤3 (disciplined)
Avg MAE | -30₹ (counter-trend) | -10₹ (direction validated)

---

## Testing Strategy

### Unit Tests (`__tests__/refactored-strategy.test.ts`)
- **22 total tests** across 8 test suites
- Multi-timeframe trend detection
- Structure pattern recognition
- Volume confirmation
- Time filtering (IST timezone)
- Partial booking & trailing
- Weighted scoring (6+ threshold)
- HTF trend filter enforcement
- Full integration pipeline

### Running Tests
```bash
cd packages/trading-core
npm test                    # Run all tests
npm test -- refactored      # Run only refactored-strategy tests
```

### Test Data
- Mock candles with 'up', 'down', 'sideways' trends
- Realistic indicator values (EMA, RSI, MACD, etc.)
- High/low volume scenarios
- Various time-of-day conditions (IST)

---

## Backtesting & Validation

### Phase 8 Extended Testing (PENDING)
1. **RELIANCE.NS** (21 Mar – 20 Apr 2026)
   - Expected: 10–15 trades, 30–40% win rate, +1000₹ net

2. **Other Symbols** (INFY.NS, TCS.NS, HDFC.NS)
   - Validate generalization across liquid stocks
   - 2–3 month per symbol

3. **Metrics to Track**
   - Win rate distribution (by pattern, by hour)
   - Drawdown analysis (daily, weekly, monthly)
   - Trade efficiency (MAE/MFE, risk:reward)
   - Time filter effectiveness (% blocked trades)
   - Partial booking success rate (1R hit frequency)

### Example Expected Backtest Output
```
Backtest Results: RELIANCE.NS (21 Mar – 20 Apr 2026)
================================================
Total Trades: 14
Closed: 14 | Open: 0
Win Rate: 35.7% (5 wins / 14 total)
Profit Factor: 1.42
Net P&L: +2450₹
Avg Win: +850₹ | Avg Loss: -620₹
Max Drawdown: -1.45%
Sharpe Ratio: 0.68

Trade Examples:
[1] BUY  2026-03-21 09:45 @ 2750 | STRONG signal (8.2 pts) | HTF BULLISH
    SL 2740 | Target 2770 | Partial 1R @ 2760
    Hit 1R ✅ | Partial closed +500₹ | Remaining trailed, closed @ 2768 +450₹
    Total: +950₹

[2] BUY  2026-03-22 10:15 @ 2755 | STRONG signal (7.8 pts) | HTF NEUTRAL
    Rejected by trend filter ❌ | Skipped (prevented loss)

[3] SELL 2026-03-23 14:20 @ 2745 | WEAK signal (6.1 pts) | HTF BEARISH
    Volume not confirmed | Price bounced at 2750
    SL hit @ 2750 | Loss -250₹ (tight stop)
    
... (11 more trades)
```

---

## Design Decisions & Trade-Offs

### 1. Structure Confidence (0-1) vs Fixed Weight
**Decision**: Use confidence multiplier (weight = structure_confidence × 2)
**Rationale**: 
- Stronger patterns contribute more points (0-2 range)
- Weak patterns (0.3 confidence) add only 0.6 points
- Prevents weak structure from driving signals alone
**Alternative Rejected**: Fixed 2-point weight regardless of pattern strength

### 2. Volume as Binary (0 or 1) vs Ratio-Based Weighting
**Decision**: Binary 1 point if confirmed, 0 if not
**Rationale**:
- Volume confirmation is threshold-based (1.2x)
- Ratio variation (1.2x vs 1.8x) less predictive than pattern quality
- Simplifies scoring logic
**Alternative Rejected**: Weight = volumeRatio / maxRatio (complex, requires tuning)

### 3. VWAP Weight Upgrade (1→2 points)
**Decision**: VWAP elevated from 1 to 2 (same as Structure)
**Rationale**:
- Institutional participation strongest signal
- VWAP breakouts historically high-probability
- Reduces reliance on lagging indicators (BB)
**Alternative**: Keep equal at 1, but higher threshold (7 points)

### 4. Bollinger Bands Downgrade (1→0.5 points)
**Decision**: BB reduced to 0.5 (lowest weight)
**Rationale**:
- BB extremes often lag (price reverses inside bands)
- Midline signals noisy on 5-min charts
- Structure + Volume > BB for entry timing
**Alternative**: Remove BB entirely, but maintains mean-reversion view

### 5. HTF Trend as MANDATORY (not weighted)
**Decision**: Trend must match signal type, not additive points
**Rationale**:
- Direction mismatch = wrong side of market (unacceptable risk)
- Trend filter prevents all 0% win rate root cause
- Market structure > indicator confluence
**Alternative Rejected**: Trend as 3-point vote (dilutes signal quality)

### 6. Partial Booking at 1R (not 2R or 3R)
**Decision**: Close 50% when price moves by (entry - SL)
**Rationale**:
- 1R = confirmed directional bias (smallest target)
- 50% close locks 50% of max R:R potential
- Remaining 50% unlimited upside (trailed)
- Psychologically safe (profit lock-in)
**Alternative**: 2R (less frequent), 0.5R (too early)

### 7. Max 3 Trades/Day (not 5 or unlimited)
**Decision**: Hard cap at 3 per day per symbol
**Rationale**:
- Prevents impulse overtrading (original: 6 trades, all losses)
- Enforces trade quality > quantity
- 3 trades × 1% risk = max 3% daily loss
- Aligns with institutional trading desks
**Alternative**: Time-based cooldown (too lenient)

---

## Maintenance & Future Improvements

### Short-Term (Next 1-2 backtests)
- [ ] Validate 25–40% win rate on different stocks
- [ ] Optimize HTF period (currently 15-min; test 20, 10-min)
- [ ] A/B test structure confidence thresholds

### Medium-Term (Post-backtest validation)
- [ ] Add multi-timeframe support (1-hour HTF for daily traders)
- [ ] Integrate support/resistance levels
- [ ] Add ML-based pattern recognition (vs. hardcoded rules)
- [ ] Portfolio mode (multiple symbols with position sizing)

### Long-Term
- [ ] Live trading with micro-lots
- [ ] Real-time structure detection
- [ ] Market-wide signal aggregation
- [ ] Risk parity position sizing

---

## References

- **Multi-Timeframe Analysis**: Technicalindicators.js (EMA, RSI calculations)
- **Structure Recognition**: Price Action trading (Al Brooks, Renko theory)
- **Partial Booking**: Professional trader risk management (1% rule)
- **Confluence**: Indicator weighting best practices (not equal voting)

---

**Document Version**: 1.0 (Phase 7 complete, Phase 8 in progress)  
**Last Updated**: 2025 (current refactoring cycle)  
**Status**: Ready for extended backtest validation
