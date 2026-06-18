/**
 * Order validation rules.
 * All validators return { valid: boolean, error?: string }.
 */

import { OrderSide } from '../common/enums.js'
import { roundPrice } from '../common/utils.js'

const VALID_SYMBOLS = new Set(['AAPL', 'MSFT', 'GOOGL', 'BTC', 'ETH', 'EURUSD', 'GBPUSD'])
const MIN_QUANTITY = 0.0001
const MAX_QUANTITY = 1_000_000

/**
 * Validate an incoming order before execution.
 *
 * @param {object} order - { side, symbol, quantity, estimatedPrice }
 * @param {object} portfolio - Current portfolio record from DB
 * @param {object[]} openPositions - Current open positions for this portfolio
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateOrder(order, portfolio, openPositions = []) {
  const { side, symbol, quantity, estimatedPrice } = order

  // ── 1. Required fields ───────────────────────────────────────────────────
  if (!side) return { valid: false, error: 'Missing field: side (BUY or SELL)' }
  if (!symbol) return { valid: false, error: 'Missing field: symbol' }
  if (quantity == null) return { valid: false, error: 'Missing field: quantity' }
  if (estimatedPrice == null) return { valid: false, error: 'Missing field: estimatedPrice' }

  // ── 2. Side validation ────────────────────────────────────────────────────
  if (!Object.values(OrderSide).includes(side)) {
    return { valid: false, error: `Invalid side "${side}". Must be BUY or SELL.` }
  }

  // ── 3. Symbol validation ──────────────────────────────────────────────────
  if (!VALID_SYMBOLS.has(symbol.toUpperCase())) {
    return {
      valid: false,
      error: `Symbol "${symbol}" is not supported. Valid symbols: ${[...VALID_SYMBOLS].join(', ')}`,
    }
  }

  // ── 4. Quantity validation ────────────────────────────────────────────────
  const qty = Number(quantity)
  if (isNaN(qty) || qty <= 0) {
    return { valid: false, error: 'Quantity must be a positive number.' }
  }
  if (qty < MIN_QUANTITY) {
    return { valid: false, error: `Quantity too small. Minimum is ${MIN_QUANTITY}.` }
  }
  if (qty > MAX_QUANTITY) {
    return { valid: false, error: `Quantity too large. Maximum is ${MAX_QUANTITY}.` }
  }

  // ── 5. Price sanity check ─────────────────────────────────────────────────
  const price = Number(estimatedPrice)
  if (isNaN(price) || price <= 0) {
    return { valid: false, error: 'Estimated price must be a positive number.' }
  }

  // ── 6. Funds check for BUY ────────────────────────────────────────────────
  if (side === OrderSide.BUY) {
    const requiredFunds = roundPrice(price * qty)
    if (portfolio.cash_balance < requiredFunds) {
      return {
        valid: false,
        error: `Insufficient funds. Required: $${requiredFunds.toFixed(2)}, Available: $${portfolio.cash_balance.toFixed(2)}`,
      }
    }
  }

  // ── 7. Position check for SELL ────────────────────────────────────────────
  if (side === OrderSide.SELL) {
    const sym = symbol.toUpperCase()
    const position = openPositions.find(
      (p) => p.symbol === sym && p.side === OrderSide.BUY && p.status === 'OPEN'
    )
    if (!position) {
      return {
        valid: false,
        error: `No open BUY position found for ${sym}. You must own the asset before selling.`,
      }
    }
    if (position.quantity < qty) {
      return {
        valid: false,
        error: `Insufficient position size. You own ${position.quantity} ${sym}, trying to sell ${qty}.`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate a close-position request.
 * @param {object} position - The position to close
 * @param {string} portfolioId - Expected owner portfolio
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateClosePosition(position, portfolioId) {
  if (!position) return { valid: false, error: 'Position not found.' }
  if (position.portfolio_id !== portfolioId) {
    return { valid: false, error: 'Position does not belong to this portfolio.' }
  }
  if (position.status === 'CLOSED') {
    return { valid: false, error: 'Position is already closed.' }
  }
  return { valid: true }
}
