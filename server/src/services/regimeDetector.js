import { roundPrice } from '../trading/common/utils.js'

/**
 * Calculates exponential moving average for a slice of values.
 */
function calculateEMA(values, period) {
  if (values.length < period) return values[values.length - 1] || 0
  const k = 2 / (period + 1)
  let ema = values[0]
  for (let i = 1; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k)
  }
  return ema
}

/**
 * Detects the current market regime based on candlestick moving averages.
 * @param {object[]} candles - Historic daily candles (requires at least 50)
 * @returns {{ regime: string, description: string, penalty: number }}
 */
export function detectMarketRegime(candles) {
  if (!candles || candles.length < 50) {
    return {
      regime: 'SIDEWAYS',
      description: 'Insufficient candlestick data to determine market regime (using Sideways default).',
      penalty: 0
    }
  }

  const closes = candles.map(c => c.close)
  const latestPrice = closes[closes.length - 1]

  const ema9 = calculateEMA(closes, 9)
  const ema21 = calculateEMA(closes, 21)
  const ema50 = calculateEMA(closes, 50)

  // Calculate moving average slope/differences
  const maDiffPct = ((ema9 - ema21) / ema21) * 100
  const isAboveFifty = latestPrice > ema50

  let regime = 'SIDEWAYS'
  let description = ''
  let penalty = 0

  if (ema9 > ema21 && isAboveFifty) {
    if (maDiffPct > 0.3) {
      regime = 'BULL'
      description = 'Moving averages (EMA9/EMA21) are aligned bullishly with price above EMA50, confirming strong uptrend momentum.'
    } else {
      regime = 'SIDEWAYS'
      description = 'Uptrend is decelerating, moving averages are flat, suggesting sideways range-bound action.'
    }
  } else if (ema9 < ema21 && !isAboveFifty) {
    if (maDiffPct < -0.3) {
      regime = 'BEAR'
      description = 'Moving averages (EMA9/EMA21) are aligned bearishly with price below EMA50, confirming strong downtrend momentum.'
    } else {
      regime = 'SIDEWAYS'
      description = 'Downtrend is consolidating, moving averages are converging, suggesting sideways range-bound action.'
    }
  } else {
    regime = 'SIDEWAYS'
    description = 'Moving averages are frequently crossing with price near EMA50, indicating a sideways/consolidated regime.'
  }

  return {
    regime,
    description,
    ema9: roundPrice(ema9, 4),
    ema21: roundPrice(ema21, 4),
    ema50: roundPrice(ema50, 4)
  }
}

/**
 * Calculates a confidence penalty based on alignment of pattern signal and market regime.
 * @param {string} regime - BULL, BEAR, or SIDEWAYS
 * @param {string} signal - BUY, SELL, or NEUTRAL
 * @returns {number} The penalty percentage (e.g. -15 for -15%)
 */
export function getRegimePenalty(regime, signal) {
  if (regime === 'BEAR' && signal === 'BUY') {
    return -15 // -15% confidence penalty for buying in a bear market
  }
  if (regime === 'BULL' && signal === 'SELL') {
    return -15 // -15% confidence penalty for selling/shorting in a bull market
  }
  if (regime === 'SIDEWAYS' && (signal === 'BUY' || signal === 'SELL')) {
    return -5 // minor -5% penalty for trading in range bound sideways markets
  }
  return 0 // no penalty if setup aligns with trend regime
}
