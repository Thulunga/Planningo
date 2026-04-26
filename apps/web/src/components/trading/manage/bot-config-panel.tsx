'use client'

import { useState, useEffect } from 'react'
import { Info, RotateCcw, Save, CheckCircle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { cn } from '@planningo/ui'
import { useTradingConfig, BOT_CONFIG_DEFAULTS } from '@/stores/trading-config-store'
import type { BotConfig } from '@/stores/trading-config-store'

// ── InfoTooltip ──────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground transition-colors"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-label="More info"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute z-50 bottom-6 left-0 w-72 rounded-lg border border-border bg-popover p-3 text-xs text-popover-foreground shadow-xl">
          {text}
        </div>
      )}
    </div>
  )
}

// ── Field components ─────────────────────────────────────────────────────────

function NumberField({
  label, value, onChange, min, max, step = 1, info, unit,
}: {
  label: string; value: number; onChange: (v: number) => void
  min?: number; max?: number; step?: number; info?: string; unit?: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {info && <InfoTooltip text={info} />}
      </div>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring tabular-nums"
        />
        {unit && <span className="text-xs text-muted-foreground shrink-0">{unit}</span>}
      </div>
    </div>
  )
}

function ToggleField({
  label, value, onChange, info,
}: {
  label: string; value: boolean; onChange: (v: boolean) => void; info?: string
}) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
          value ? 'bg-primary' : 'bg-muted'
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform',
          value ? 'translate-x-4' : 'translate-x-0'
        )} />
      </button>
      <span className="text-sm">{label}</span>
      {info && <InfoTooltip text={info} />}
    </label>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({
  title, description, badge, enabled, onToggleEnable, defaultOpen = true, children,
}: {
  title: string
  description: string
  badge?: string
  enabled?: boolean
  onToggleEnable?: (v: boolean) => void
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const isFilter = onToggleEnable !== undefined

  return (
    <div className={cn(
      'rounded-xl border bg-card transition-opacity',
      isFilter && !enabled ? 'border-border/50 opacity-60' : 'border-border'
    )}>
      {/* Section header */}
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
        onClick={() => setOpen((v) => !v)}
      >
        {isFilter && (
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={(e) => { e.stopPropagation(); onToggleEnable!(!enabled) }}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
              enabled ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span className={cn(
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform',
              enabled ? 'translate-x-4' : 'translate-x-0'
            )} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{title}</span>
            {badge && (
              <span className="rounded-full bg-primary/10 text-primary px-2 py-px text-[10px] font-medium">
                {badge}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>

      {/* Section content */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Panel ────────────────────────────────────────────────────────────────

export function BotConfigPanel() {
  const { config, setField, resetToDefaults, saveToDb, loadFromDb, isSaving, isLoading, lastSavedAt } = useTradingConfig()
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Load DB config on first mount (overwrites any stale localStorage value)
  useEffect(() => { void loadFromDb() }, [loadFromDb])

  function set<K extends keyof BotConfig>(key: K) {
    return (v: BotConfig[K]) => setField(key, v)
  }

  async function handleSave() {
    setSaveError(null)
    const err = await saveToDb()
    if (err) { setSaveError(err); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // Count how many fields differ from defaults
  const diffCount = (Object.keys(BOT_CONFIG_DEFAULTS) as (keyof BotConfig)[])
    .filter((k) => config[k] !== BOT_CONFIG_DEFAULTS[k]).length

  return (
    <div className="space-y-4">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 rounded-xl border border-border bg-card/90 backdrop-blur px-4 py-3">
        <div className="text-sm text-muted-foreground">
          {isLoading
            ? <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading saved settings…</span>
            : diffCount === 0
              ? 'All settings are at their defaults.'
              : <span>{diffCount} setting{diffCount !== 1 ? 's' : ''} differ from defaults</span>}
        </div>
        <div className="flex items-center gap-2">
          {saveError && <span className="text-xs text-destructive">{saveError}</span>}
          <button
            type="button"
            onClick={resetToDefaults}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isSaving
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : saved ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {isSaving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* ── Confluence Engine ────────────────────────────────────────────── */}
      <Section
        title="Confluence Engine"
        description="Controls how many indicator points are needed to generate a BUY or SELL signal."
        badge="Core"
        defaultOpen
      >
        <NumberField
          label="Confluence Threshold"
          value={config.confluenceThreshold}
          onChange={set('confluenceThreshold')}
          min={1} max={9} step={0.5}
          info="Minimum weighted score required to emit a signal. Max possible score is ~9.5 pts. Recommended: 4 (more signals) or 5 (stricter)."
        />
        <NumberField
          label="Min Candles Required"
          value={config.minCandlesRequired}
          onChange={set('minCandlesRequired')}
          min={20} max={100}
          info="Minimum historical candles needed before any signal is generated. Too low = unreliable indicators. Recommended: 35."
        />
      </Section>

      {/* ── EMA Cross ───────────────────────────────────────────────────── */}
      <Section
        title="EMA Cross"
        description="Exponential Moving Average crossover detects trend direction. Fast EMA > Slow EMA = bullish."
        badge="Weight 1pt"
        enabled={config.enableEMA}
        onToggleEnable={set('enableEMA')}
      >
        <NumberField
          label="Fast EMA Period"
          value={config.emaFast}
          onChange={set('emaFast')}
          min={3} max={50}
          info="Short-term EMA period. Lower = more reactive. Default 9 on 5-min bars ≈ 45 minutes of price action."
        />
        <NumberField
          label="Slow EMA Period"
          value={config.emaSlow}
          onChange={set('emaSlow')}
          min={10} max={200}
          info="Long-term EMA period. Trend is UP when Fast > Slow. Default 21 ≈ ~105 minutes of context."
        />
      </Section>

      {/* ── RSI ─────────────────────────────────────────────────────────── */}
      <Section
        title="RSI"
        description="Relative Strength Index measures momentum. Oversold = BUY, Overbought = SELL."
        badge="Weight 1pt"
        enabled={config.enableRSI}
        onToggleEnable={set('enableRSI')}
      >
        <NumberField
          label="RSI Period"
          value={config.rsiPeriod}
          onChange={set('rsiPeriod')}
          min={5} max={30}
          info="Smoothing period for RSI. Default 14. Lower = faster but noisier."
        />
        <NumberField
          label="Oversold Level"
          value={config.rsiOversold}
          onChange={set('rsiOversold')}
          min={10} max={45}
          info="RSI below this → deep oversold, strong BUY bias. Default 35. Lowering catches only extreme drops."
        />
        <NumberField
          label="Neutral Low"
          value={config.rsiNeutralZone}
          onChange={set('rsiNeutralZone')}
          min={30} max={55}
          info="RSI between Oversold and this → mild BUY bias zone. Default 45."
        />
        <NumberField
          label="Bullish Zone Ceiling"
          value={config.rsiBullishZone}
          onChange={set('rsiBullishZone')}
          min={50} max={75}
          info="RSI up to this → healthy bullish momentum, still BUY signal. Default 60."
        />
        <NumberField
          label="Overbought Level"
          value={config.rsiOverbought}
          onChange={set('rsiOverbought')}
          min={60} max={95}
          info="RSI above this → overbought, SELL bias. Default 70. Raising catches only extreme peaks."
        />
      </Section>

      {/* ── MACD ────────────────────────────────────────────────────────── */}
      <Section
        title="MACD"
        description="Moving Average Convergence/Divergence. MACD line above Signal line = bullish crossover."
        badge="Weight 1pt"
        enabled={config.enableMACD}
        onToggleEnable={set('enableMACD')}
      >
        <NumberField
          label="Fast Period"
          value={config.macdFast}
          onChange={set('macdFast')}
          min={5} max={30}
          info="Fast EMA for MACD line calculation. Standard: 12."
        />
        <NumberField
          label="Slow Period"
          value={config.macdSlow}
          onChange={set('macdSlow')}
          min={15} max={60}
          info="Slow EMA for MACD line calculation. Standard: 26."
        />
        <NumberField
          label="Signal Period"
          value={config.macdSignalPeriod}
          onChange={set('macdSignalPeriod')}
          min={3} max={20}
          info="EMA of the MACD line. Used to detect crossovers. Standard: 9."
        />
      </Section>

      {/* ── Supertrend ──────────────────────────────────────────────────── */}
      <Section
        title="Supertrend"
        description="ATR-based trailing stop indicator. Price above Supertrend line = uptrend."
        badge="Weight 1pt"
        enabled={config.enableSupertrend}
        onToggleEnable={set('enableSupertrend')}
      >
        <NumberField
          label="ATR Period"
          value={config.supertrendPeriod}
          onChange={set('supertrendPeriod')}
          min={3} max={30}
          info="Number of candles to calculate the ATR for Supertrend. Default 7. Lower = faster-reacting band."
        />
        <NumberField
          label="Multiplier"
          value={config.supertrendMultiplier}
          onChange={set('supertrendMultiplier')}
          min={1} max={6} step={0.5}
          info="ATR multiplier for the Supertrend band width. Default 3. Higher = wider band, fewer flips."
        />
      </Section>

      {/* ── Bollinger Bands ─────────────────────────────────────────────── */}
      <Section
        title="Bollinger Bands"
        description="Price channel based on standard deviation. Price at lower band = oversold, upper = overbought."
        badge="Weight 0.5pt"
        enabled={config.enableBB}
        onToggleEnable={set('enableBB')}
      >
        <NumberField
          label="BB Period"
          value={config.bbPeriod}
          onChange={set('bbPeriod')}
          min={10} max={50}
          info="Moving average period for the middle band. Default 20 = 100 minutes on 5-min bars."
        />
        <NumberField
          label="Std Dev Width"
          value={config.bbStdDev}
          onChange={set('bbStdDev')}
          min={1} max={4} step={0.5}
          info="Width of the bands in standard deviations. Default 2. Higher = wider bands, fewer touches."
        />
      </Section>

      {/* ── VWAP ────────────────────────────────────────────────────────── */}
      <Section
        title="VWAP"
        description="Volume Weighted Average Price. Price above VWAP = institutional buying. Carries highest weight."
        badge="Weight 2pt"
        enabled={config.enableVWAP}
        onToggleEnable={set('enableVWAP')}
      >
        <NumberField
          label="Rolling Window"
          value={config.vwapHours}
          onChange={set('vwapHours')}
          min={1} max={24} unit="hrs"
          info="Hours of history to use for VWAP calculation. Default 8 hrs ≈ one trading session. Shorter = more responsive to intraday price action."
        />
        <NumberField
          label="ATR Period"
          value={config.atrPeriod}
          onChange={set('atrPeriod')}
          min={5} max={30}
          info="Average True Range period used for stop/target distance AND by MA Boundary filter. Default 14."
        />
      </Section>

      {/* ── Structure Analysis ───────────────────────────────────────────── */}
      <Section
        title="Structure Analysis"
        description="Price action patterns: swing breaks, pullbacks to EMAs, and strong candles. High confidence entries."
        badge="Weight up to 2pt"
        enabled={config.enableStructure}
        onToggleEnable={set('enableStructure')}
      >
        <NumberField
          label="Swing Lookback"
          value={config.swingPeriod}
          onChange={set('swingPeriod')}
          min={3} max={30} unit="candles"
          info="How many candles to look back for swing high/low detection. Default 10 = 50 minutes. Increase for bigger swing structures."
        />
        <NumberField
          label="EMA Pullback Tolerance"
          value={config.pullbackEmaThresholdPct}
          onChange={set('pullbackEmaThresholdPct')}
          min={0.001} max={0.05} step={0.001} unit="%"
          info="Price is considered 'at EMA' if within this % of the EMA value. Default 1%. Increase for looser pullback detection."
        />
        <NumberField
          label="Strong Candle × ATR"
          value={config.strongCandleAtrMultiplier}
          onChange={set('strongCandleAtrMultiplier')}
          min={0.5} max={4} step={0.1}
          info="A candle is 'strong' if its body range > ATR × this value. Default 1.0. Higher = only very large candles qualify."
        />
        <NumberField
          label="VWAP Proximity"
          value={config.vwapThresholdPct}
          onChange={set('vwapThresholdPct')}
          min={0.001} max={0.02} step={0.001} unit="%"
          info="Price is 'near VWAP' (adds confidence) if within this %. Default 0.5%. Widen for looser VWAP proximity bonus."
        />
      </Section>

      {/* ── Volume Confirmation ──────────────────────────────────────────── */}
      <Section
        title="Volume Confirmation"
        description="Entries must happen on above-average volume. Low volume moves are often false breakouts."
        badge="Weight 1pt"
        enabled={config.enableVolume}
        onToggleEnable={set('enableVolume')}
      >
        <NumberField
          label="Volume MA Period"
          value={config.volumeMaPeriod}
          onChange={set('volumeMaPeriod')}
          min={5} max={50} unit="candles"
          info="Period to calculate the volume moving average (baseline). Default 20 candles ≈ 100 minutes."
        />
        <NumberField
          label="Volume Threshold"
          value={config.volumeMultiplier}
          onChange={set('volumeMultiplier')}
          min={0.8} max={3} step={0.05} unit="× MA"
          info="Current candle volume must exceed Volume MA × this multiplier. Default 1.1 = 10% above average. Lower to allow more trades in thin markets."
        />
      </Section>

      {/* ── MA Boundary Filter ───────────────────────────────────────────── */}
      <Section
        title="MA Boundary Filter"
        description="Three moving averages must be in a stable trending stack and price must be within a pullback zone."
        enabled={config.enableMABoundaryFilter}
        onToggleEnable={set('enableMABoundaryFilter')}
      >
        <NumberField
          label="MA1 (Fast)"
          value={config.ma1Length}
          onChange={set('ma1Length')}
          min={3} max={30} unit="periods"
          info="Fastest of the three MAs. MA1 > MA2 > MA3 = stable uptrend required for BUY. Default 9."
        />
        <NumberField
          label="MA2 (Mid)"
          value={config.ma2Length}
          onChange={set('ma2Length')}
          min={10} max={60} unit="periods"
          info="Middle MA - price must be near this to enter. Acts as the pullback zone reference. Default 21."
        />
        <NumberField
          label="MA3 (Slow)"
          value={config.ma3Length}
          onChange={set('ma3Length')}
          min={20} max={200} unit="periods"
          info="Slowest MA, defines the major trend direction. Price must be on the correct side of MA3. Default 50."
        />
        <NumberField
          label="No-Trade Spread"
          value={config.noTradeSpreadThreshold}
          onChange={set('noTradeSpreadThreshold')}
          min={0.0005} max={0.01} step={0.0005} unit="ratio"
          info="If MA1–MA3 spread is below this % of price, the market is too choppy to trade. Default 0.2%."
        />
        <NumberField
          label="Slope Threshold"
          value={config.slopeThreshold}
          onChange={set('slopeThreshold')}
          min={0.01} max={0.5} step={0.01} unit="₹/candle"
          info="MA1 must be changing by at least this many rupees per candle. Default 0.05. Increase on high-price stocks."
        />
        <NumberField
          label="Max Distance from MA2"
          value={config.maxDistanceFromMA2}
          onChange={set('maxDistanceFromMA2')}
          min={0.005} max={0.06} step={0.005} unit="ratio"
          info="Price must be within this % of MA2. Default 2%. Wider = allows entries further from the pullback zone."
        />
        <NumberField
          label="Pullback ATR Mult"
          value={config.pullbackAtrMultiplier}
          onChange={set('pullbackAtrMultiplier')}
          min={0.1} max={2} step={0.1}
          info="Secondary check: price must also be within ATR × this of MA2. Default 0.5. Used alongside Max Distance."
        />
      </Section>

      {/* ── Trend Filter (HTF) ───────────────────────────────────────────── */}
      <Section
        title="Trend Filter (HTF)"
        description="Higher-timeframe trend direction gate. Only BUY in uptrends, only SELL in downtrends."
        enabled={config.enableTrendFilter}
        onToggleEnable={set('enableTrendFilter')}
      >
        <NumberField
          label="HTF Period"
          value={config.htfPeriodSec}
          onChange={set('htfPeriodSec')}
          min={300} max={7200} step={300} unit="sec"
          info="Higher timeframe period in seconds. Default 1800 = 30-min bars. Set to 900 for 15-min trend filter."
        />
        <NumberField
          label="Slow EMA Period"
          value={config.htfEmaTrendPeriod}
          onChange={set('htfEmaTrendPeriod')}
          min={5} max={50} unit="HTF bars"
          info="Slow EMA on the HTF. BULLISH requires: price > fast EMA > slow EMA. Default 20."
        />
        <NumberField
          label="Fast EMA Period"
          value={config.htfFastEmaPeriod}
          onChange={set('htfFastEmaPeriod')}
          min={3} max={30} unit="HTF bars"
          info="Fast EMA on the HTF for dual-EMA confirmation. Default 9."
        />
        <NumberField
          label="RSI Bullish Threshold"
          value={config.htfRsiBullishThreshold}
          onChange={set('htfRsiBullishThreshold')}
          min={45} max={70}
          info="HTF RSI must be above this for BULLISH trend. Default 52. Raise to require stronger upward momentum."
        />
        <NumberField
          label="RSI Bearish Threshold"
          value={config.htfRsiBearishThreshold}
          onChange={set('htfRsiBearishThreshold')}
          min={30} max={55}
          info="HTF RSI must be below this for BEARISH trend. Default 48. Lower to require stronger downward momentum."
        />
      </Section>

      {/* ── Risk Management ─────────────────────────────────────────────── */}
      <Section
        title="Risk Management"
        description="Position sizing, stop loss / target multipliers, and daily risk limits. Applied to all trades."
        badge="Critical"
        defaultOpen
      >
        <NumberField
          label="Risk per Trade"
          value={config.riskPerTradePct * 100}
          onChange={(v) => set('riskPerTradePct')(v / 100)}
          min={0.1} max={5} step={0.1} unit="%"
          info="% of total equity to risk per trade. Default 1%. At ₹1 lakh capital = ₹1,000 risk per trade."
        />
        <NumberField
          label="Daily Loss Limit"
          value={config.dailyLossLimitPct * 100}
          onChange={(v) => set('dailyLossLimitPct')(v / 100)}
          min={0.5} max={10} step={0.5} unit="%"
          info="If realized P&L drops below this % of start-of-day equity, no new trades for rest of day. Default 3%."
        />
        <NumberField
          label="Min Reward:Risk"
          value={config.minRewardRiskRatio}
          onChange={set('minRewardRiskRatio')}
          min={1} max={5} step={0.5} unit=":1"
          info="Only take trades where potential reward ≥ this × risk. Default 2.0 means target must be 2× the stop distance."
        />
        <NumberField
          label="Cooldown After Loss"
          value={config.cooldownMinutesAfterLoss}
          onChange={set('cooldownMinutesAfterLoss')}
          min={0} max={120} unit="min"
          info="Wait this many minutes after a stop-out before allowing new entries. Default 30. Prevents revenge trading."
        />
        <NumberField
          label="ATR Stop Multiplier"
          value={config.atrMultiplierStop}
          onChange={set('atrMultiplierStop')}
          min={0.5} max={4} step={0.25} unit="× ATR"
          info="Stop loss = entry ± ATR × this. Default 1.5. Wider stop = less noise, but higher risk amount per trade."
        />
        <NumberField
          label="ATR Target Multiplier"
          value={config.atrMultiplierTarget}
          onChange={set('atrMultiplierTarget')}
          min={1} max={8} step={0.25} unit="× ATR"
          info="Target = entry ± ATR × this. Default 3.0 → R:R = 3.0/1.5 = 2:1. Always keep ≥ 2× stop multiplier."
        />
        <NumberField
          label="Max Concurrent Positions"
          value={config.maxConcurrentPositions}
          onChange={set('maxConcurrentPositions')}
          min={1} max={20}
          info="Maximum number of open paper trades at the same time. Default 5."
        />
        <NumberField
          label="Max Trades per Day"
          value={config.maxTradesPerDay}
          onChange={set('maxTradesPerDay')}
          min={1} max={20}
          info="Maximum new trades allowed per trading day. Prevents overtrading. Default 3."
        />
        <div className="col-span-full">
          <ToggleField
            label="Allow Short Selling (SELL signals)"
            value={config.allowShorts}
            onChange={set('allowShorts')}
            info="When enabled, SELL signals open short positions. Only use in bearish markets. Paper trading supports both directions."
          />
        </div>
      </Section>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        Settings are saved to your account and apply to all devices, scheduled scans, and new backtests.
        {lastSavedAt && (
          <span className="block mt-0.5">
            Last saved: {new Date(lastSavedAt).toLocaleString('en-IN')}
          </span>
        )}
      </p>
    </div>
  )
}
