/**
 * Order execution logic.
 * Fetches the current market price from live APIs:
 *  - Crypto  → Binance REST (no key needed)
 *  - Stocks/Forex → Twelve Data (TWELVE_DATA_API_KEY in server/.env)
 */

import { roundPrice, tradeCost } from '../common/utils.js'

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || ''

// Twelve Data symbol mapping for stocks & forex
const TD_SYMBOLS = {
  AAPL: 'AAPL', MSFT: 'MSFT', GOOGL: 'GOOGL', AMZN: 'AMZN',
  TSLA: 'TSLA', NVDA: 'NVDA', META: 'META',
  RELIANCE: 'RELIANCE.NS', TCS: 'TCS.NS', INFY: 'INFY',
  EURUSD: 'EUR/USD', GBPUSD: 'GBP/USD', USDJPY: 'USD/JPY',
  AUDUSD: 'AUD/USD', USDCAD: 'USD/CAD', USDCHF: 'USD/CHF',
  NZDUSD: 'NZD/USD', EURGBP: 'EUR/GBP',
}

const CRYPTO_SYMBOLS = new Set([
  'BTC','ETH','SOL','BNB','XRP','ADA','DOT','AVAX','DOGE','MATIC'
])

// Fallback prices if APIs are unavailable
const FALLBACKS = {
  AAPL: 182, MSFT: 415, GOOGL: 176, AMZN: 192, TSLA: 246, NVDA: 820,
  META: 485, RELIANCE: 2950, TCS: 4100, INFY: 1600,
  BTC: 64000, ETH: 3500, SOL: 175, BNB: 590, XRP: 0.62, ADA: 0.45,
  DOT: 7.2, AVAX: 35.5, DOGE: 0.15, MATIC: 0.70,
  EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 153.4, AUDUSD: 0.655,
  USDCAD: 1.352, USDCHF: 0.905, NZDUSD: 0.602, EURGBP: 0.858,
}

/**
 * Fetch live price from Binance (crypto) or Twelve Data (stocks/forex).
 * Returns a number, or null if all attempts fail.
 */
export async function fetchLivePrice(symbol) {
  const sym = symbol.toUpperCase()

  // ── Crypto via Binance public REST ─────────────────────────────────────────
  if (CRYPTO_SYMBOLS.has(sym)) {
    try {
      const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}USDT`)
      const data = await res.json()
      const price = parseFloat(data.price)
      if (!isNaN(price) && price > 0) return price
    } catch (err) {
      console.error(`[executor] Binance price fetch failed for ${sym}:`, err.message)
    }
  }

  // ── Stocks & Forex via Twelve Data ─────────────────────────────────────────
  const tdSym = TD_SYMBOLS[sym]
  if (tdSym && TWELVE_DATA_KEY) {
    try {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=${tdSym}&apikey=${TWELVE_DATA_KEY}`)
      const data = await res.json()
      const price = parseFloat(data.price)
      if (!isNaN(price) && price > 0) return price
    } catch (err) {
      console.error(`[executor] Twelve Data price fetch failed for ${sym}:`, err.message)
    }
  }

  // ── Fallback ────────────────────────────────────────────────────────────────
  const fallback = FALLBACKS[sym]
  if (fallback) {
    console.warn(`[executor] Using fallback price for ${sym}: ${fallback}`)
    return fallback
  }

  return null
}

/**
 * Synchronous price lookup — returns last known fallback immediately.
 * Used by analysis routes that cannot await.
 */
export function getCurrentMarketPrice(symbol) {
  return FALLBACKS[symbol.toUpperCase()] || null
}

/**
 * Execute a market BUY order (async — fetches live price).
 */
export async function executeBuyOrderLive({ symbol, quantity }) {
  const fillPrice = await fetchLivePrice(symbol)
  if (fillPrice === null) throw new Error(`Cannot get market price for symbol: ${symbol}`)
  const totalCost = tradeCost(fillPrice, quantity)
  return {
    fillPrice:  roundPrice(fillPrice, 6),
    quantity:   Number(quantity),
    totalCost:  roundPrice(totalCost),
  }
}

/**
 * Execute a market SELL order (async — fetches live price).
 */
export async function executeSellOrderLive({ symbol, quantity, entryPrice }) {
  const fillPrice = await fetchLivePrice(symbol)
  if (fillPrice === null) throw new Error(`Cannot get market price for symbol: ${symbol}`)
  const totalProceeds = tradeCost(fillPrice, quantity)
  const pnl           = roundPrice((fillPrice - entryPrice) * quantity)
  const costBasis     = entryPrice * quantity
  const pnlPercent    = costBasis > 0 ? roundPrice((pnl / costBasis) * 100, 4) : 0
  return {
    fillPrice:     roundPrice(fillPrice, 6),
    quantity:      Number(quantity),
    totalProceeds: roundPrice(totalProceeds),
    pnl,
    pnlPercent,
  }
}

// Keep legacy sync exports so existing code that calls these still compiles
export function executeBuyOrder({ symbol, quantity }) {
  const fillPrice = getCurrentMarketPrice(symbol)
  if (fillPrice === null) throw new Error(`Cannot get market price for symbol: ${symbol}`)
  return {
    fillPrice:  roundPrice(fillPrice, 6),
    quantity:   Number(quantity),
    totalCost:  roundPrice(tradeCost(fillPrice, quantity)),
  }
}

export function executeSellOrder({ symbol, quantity, entryPrice }) {
  const fillPrice = getCurrentMarketPrice(symbol)
  if (fillPrice === null) throw new Error(`Cannot get market price for symbol: ${symbol}`)
  const totalProceeds = tradeCost(fillPrice, quantity)
  const pnl           = roundPrice((fillPrice - entryPrice) * quantity)
  const costBasis     = entryPrice * quantity
  return {
    fillPrice:     roundPrice(fillPrice, 6),
    quantity:      Number(quantity),
    totalProceeds: roundPrice(totalProceeds),
    pnl,
    pnlPercent:    costBasis > 0 ? roundPrice((pnl / costBasis) * 100, 4) : 0,
  }
}
