/**
 * Order execution logic.
 * Fetches current market price from mock data and fills the order.
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { roundPrice, tradeCost } from '../common/utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const MOCK_DATA_PATH = join(__dirname, '../../../data/mockOHLC.json')

/**
 * Get the latest close price for a symbol from mock OHLC data.
 * Falls back to a reasonable default if symbol not found in candle data.
 *
 * @param {string} symbol
 * @returns {number|null}
 */
export function getCurrentMarketPrice(symbol) {
  try {
    const raw = readFileSync(MOCK_DATA_PATH, 'utf-8')
    const data = JSON.parse(raw)
    const candles = data.candles?.[symbol.toUpperCase()]
    if (!candles || candles.length === 0) return null
    return candles[candles.length - 1].close
  } catch {
    return null
  }
}

/**
 * Execute a market BUY order.
 * Returns the fill details (price, quantity, totalCost) or throws on failure.
 *
 * @param {object} params
 * @param {string} params.symbol
 * @param {number} params.quantity
 * @param {number} params.cashBalance - Available cash to deduct from
 * @returns {{ fillPrice: number, quantity: number, totalCost: number }}
 */
export function executeBuyOrder({ symbol, quantity }) {
  const fillPrice = getCurrentMarketPrice(symbol)
  if (fillPrice === null) {
    throw new Error(`Cannot get market price for symbol: ${symbol}`)
  }
  const totalCost = tradeCost(fillPrice, quantity)
  return {
    fillPrice: roundPrice(fillPrice, 6),
    quantity: Number(quantity),
    totalCost: roundPrice(totalCost),
  }
}

/**
 * Execute a market SELL order (close a position).
 * Returns the fill details and P&L.
 *
 * @param {object} params
 * @param {string} params.symbol
 * @param {number} params.quantity
 * @param {number} params.entryPrice - Original position entry price
 * @returns {{ fillPrice: number, quantity: number, totalProceeds: number, pnl: number, pnlPercent: number }}
 */
export function executeSellOrder({ symbol, quantity, entryPrice }) {
  const fillPrice = getCurrentMarketPrice(symbol)
  if (fillPrice === null) {
    throw new Error(`Cannot get market price for symbol: ${symbol}`)
  }

  const totalProceeds = tradeCost(fillPrice, quantity)
  const pnl = roundPrice((fillPrice - entryPrice) * quantity)
  const costBasis = entryPrice * quantity
  const pnlPercent = costBasis > 0 ? roundPrice((pnl / costBasis) * 100, 4) : 0

  return {
    fillPrice: roundPrice(fillPrice, 6),
    quantity: Number(quantity),
    totalProceeds: roundPrice(totalProceeds),
    pnl,
    pnlPercent,
  }
}
