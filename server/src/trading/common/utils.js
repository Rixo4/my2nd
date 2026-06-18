/**
 * Shared utility/math helpers for the paper trading system.
 */

/**
 * Round a price to a given number of decimal places.
 * @param {number} price
 * @param {number} decimals
 * @returns {number}
 */
export function roundPrice(price, decimals = 2) {
  return Math.round(price * Math.pow(10, decimals)) / Math.pow(10, decimals)
}

/**
 * Calculate unrealized or realized P&L.
 * @param {number} entryPrice
 * @param {number} exitPrice
 * @param {number} quantity
 * @param {'BUY'|'SELL'} side
 * @returns {number}
 */
export function calculatePnL(entryPrice, exitPrice, quantity, side) {
  if (side === 'BUY') {
    return roundPrice((exitPrice - entryPrice) * quantity)
  }
  // Short position: profit when price falls
  return roundPrice((entryPrice - exitPrice) * quantity)
}

/**
 * Calculate P&L percentage relative to cost basis.
 * @param {number} pnl
 * @param {number} entryPrice
 * @param {number} quantity
 * @returns {number}
 */
export function calculatePnLPercent(pnl, entryPrice, quantity) {
  const costBasis = entryPrice * quantity
  if (costBasis === 0) return 0
  return roundPrice((pnl / costBasis) * 100, 4)
}

/**
 * Format a number as currency string.
 * @param {number} amount
 * @param {string} currency
 * @returns {string}
 */
export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Convert a Unix timestamp (seconds) to an ISO date string.
 * @param {number} timestamp
 * @returns {string}
 */
export function timestampToISO(timestamp) {
  return new Date(timestamp * 1000).toISOString()
}

/**
 * Get the current Unix timestamp in seconds.
 * @returns {number}
 */
export function nowTimestamp() {
  return Math.floor(Date.now() / 1000)
}

/**
 * Calculate the cost of a trade (price × quantity).
 * @param {number} price
 * @param {number} quantity
 * @returns {number}
 */
export function tradeCost(price, quantity) {
  return roundPrice(price * quantity)
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
