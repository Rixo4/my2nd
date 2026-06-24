/**
 * technicalIndicators.js
 * Computes EMA, RSI, MACD, Support and Resistance pivot levels.
 */

export function calculateEMA(prices, period) {
  if (prices.length < period) return []
  const k = 2 / (period + 1)
  const ema = []
  
  // First EMA is simple SMA
  let sum = 0
  for (let i = 0; i < period; i++) {
    sum += prices[i]
  }
  ema[period - 1] = sum / period

  for (let i = period; i < prices.length; i++) {
    ema[i] = prices[i] * k + ema[i - 1] * (1 - k)
  }
  return ema
}

export function calculateRSI(prices, period = 14) {
  if (prices.length <= period) return []
  const rsi = []
  
  let gains = 0
  let losses = 0

  // First RSI setup
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1]
    if (diff > 0) {
      gains += diff
    } else {
      losses -= diff
    }
  }

  let avgGain = gains / period
  let avgLoss = losses / period

  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1]
    const gain = diff > 0 ? diff : 0
    const loss = diff < 0 ? -diff : 0

    avgGain = (avgGain * (period - 1) + gain) / period
    avgLoss = (avgLoss * (period - 1) + loss) / period

    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss)
  }

  return rsi
}

export function calculateMACD(prices) {
  const ema12 = calculateEMA(prices, 12)
  const ema26 = calculateEMA(prices, 26)
  
  if (ema26.length === 0) return { macd: [], signal: [], histogram: [] }

  const macd = []
  for (let i = 0; i < prices.length; i++) {
    if (ema26[i] !== undefined && ema12[i] !== undefined) {
      macd[i] = ema12[i] - ema26[i]
    }
  }

  // Filter out undefined and run 9 EMA on MACD values
  const macdValid = macd.filter(v => v !== undefined)
  const signalValid = calculateEMA(macdValid, 9)

  const signal = new Array(prices.length).fill(undefined)
  const histogram = new Array(prices.length).fill(undefined)

  const offset = prices.length - macdValid.length
  const signalOffset = macdValid.length - signalValid.length

  for (let i = 0; i < signalValid.length; i++) {
    const pricesIdx = offset + signalOffset + i
    signal[pricesIdx] = signalValid[i]
    if (macd[pricesIdx] !== undefined) {
      histogram[pricesIdx] = macd[pricesIdx] - signal[pricesIdx]
    }
  }

  return { macd, signal, histogram }
}

export function calculateSupportResistance(candles) {
  if (candles.length === 0) return { support: 0, resistance: 0 }
  
  let highest = -Infinity
  let lowest = Infinity

  for (const c of candles) {
    if (c.high > highest) highest = c.high
    if (c.low < lowest) lowest = c.low
  }

  return { support: lowest, resistance: highest }
}

export function computeTechnicalSummary(candles) {
  if (!candles || candles.length < 26) {
    return {
      rsi: 50,
      macd: { value: 0, signal: 0, histogram: 0 },
      ema9: 0,
      ema21: 0,
      support: 0,
      resistance: 0,
      trend: 'NEUTRAL'
    }
  }

  const prices = candles.map(c => c.close)
  const rsis = calculateRSI(prices, 14)
  const macds = calculateMACD(prices)
  const ema9s = calculateEMA(prices, 9)
  const ema21s = calculateEMA(prices, 21)
  const sr = calculateSupportResistance(candles)

  const lastIdx = prices.length - 1
  const lastRSI = rsis[lastIdx] || 50
  const lastMACD = macds.macd[lastIdx] || 0
  const lastSignal = macds.signal[lastIdx] || 0
  const lastHist = macds.histogram[lastIdx] || 0
  const lastEma9 = ema9s[lastIdx] || prices[lastIdx]
  const lastEma21 = ema21s[lastIdx] || prices[lastIdx]

  let trend = 'NEUTRAL'
  if (lastEma9 > lastEma21) {
    trend = 'BULLISH'
  } else if (lastEma9 < lastEma21) {
    trend = 'BEARISH'
  }

  return {
    rsi: lastRSI,
    macd: { value: lastMACD, signal: lastSignal, histogram: lastHist },
    ema9: lastEma9,
    ema21: lastEma21,
    support: sr.support,
    resistance: sr.resistance,
    trend
  }
}
