/**
 * Paper Trading Engine — central orchestrator.
 * Wires together: validator → executor → models → portfolio update.
 */

import { validateOrder, validateClosePosition } from './validators.js'
import { executeBuyOrder, executeSellOrder, getCurrentMarketPrice } from './executors.js'
import {
  getPortfolio,
  getOpenPositions,
  getPositionById,
  createPosition,
  closePosition as dbClosePosition,
  createTrade,
  updatePortfolioBalance,
  updatePositionCurrentPrice,
} from './models.js'
import { roundPrice } from '../common/utils.js'
import { OrderSide } from '../common/enums.js'

/**
 * Open a new paper trading position (BUY order).
 *
 * @param {object} params
 * @param {string} params.portfolioId
 * @param {string} params.symbol
 * @param {number} params.quantity
 * @returns {{ success: boolean, position?: object, trade?: object, error?: string }}
 */
export function openPosition({ portfolioId, symbol, quantity, overridePrice }) {
  // 1. Load portfolio
  const portfolio = getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.' }

  // 2. Get price — use live overridePrice from route, fallback to local data
  const estimatedPrice = overridePrice || getCurrentMarketPrice(symbol.toUpperCase())
  if (!estimatedPrice) {
    return { success: false, error: `No market data available for ${symbol}.` }
  }

  // 3. Load open positions for validation context
  const openPositions = getOpenPositions(portfolioId)

  // 4. Validate the order
  const validation = validateOrder(
    { side: OrderSide.BUY, symbol: symbol.toUpperCase(), quantity, estimatedPrice },
    portfolio,
    openPositions
  )
  if (!validation.valid) return { success: false, error: validation.error }

  // 5. Execute the buy using the live price
  const fillPrice = roundPrice(estimatedPrice, 6)
  const totalCost = roundPrice(fillPrice * quantity)

  // 6. Deduct cost from cash balance
  const newBalance = roundPrice(portfolio.cash_balance - totalCost)
  updatePortfolioBalance(portfolioId, newBalance)

  // 7. Create the position record
  const position = createPosition({
    portfolioId,
    symbol: symbol.toUpperCase(),
    side: OrderSide.BUY,
    quantity,
    entryPrice: fillPrice,
  })

  // 8. Record the trade
  const trade = createTrade({
    portfolioId,
    positionId: position.id,
    symbol: symbol.toUpperCase(),
    side: OrderSide.BUY,
    tradeType: 'MARKET',
    quantity,
    price: fillPrice,
    totalValue: totalCost,
    pnl: 0,
    pnlPercent: 0,
  })

  const fill = { fillPrice, quantity, totalCost }
  return { success: true, position, trade, fill }
}

/**
 * Close an existing open position (SELL order).
 *
 * @param {object} params
 * @param {string} params.portfolioId
 * @param {string} params.positionId
 * @returns {{ success: boolean, position?: object, trade?: object, error?: string }}
 */
export function closePosition({ portfolioId, positionId, overridePrice }) {
  // 1. Load portfolio + position
  const portfolio = getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.' }

  const position = getPositionById(positionId)

  // 2. Validate the close request
  const validation = validateClosePosition(position, portfolioId)
  if (!validation.valid) return { success: false, error: validation.error }

  // 3. Use live price if provided, otherwise fall back to sync executor
  const fillPrice = overridePrice
    ? roundPrice(overridePrice, 6)
    : roundPrice(getCurrentMarketPrice(position.symbol) || position.entry_price, 6)

  const totalProceeds = roundPrice(fillPrice * position.quantity)
  const pnl           = roundPrice((fillPrice - position.entry_price) * position.quantity)
  const costBasis     = position.entry_price * position.quantity
  const pnlPercent    = costBasis > 0 ? roundPrice((pnl / costBasis) * 100, 4) : 0
  const fill = { fillPrice, quantity: position.quantity, totalProceeds, pnl, pnlPercent }

  // 4. Credit proceeds to cash balance
  const newBalance = roundPrice(portfolio.cash_balance + fill.totalProceeds)
  updatePortfolioBalance(portfolioId, newBalance)

  // 5. Mark position as closed
  const closedPosition = dbClosePosition(positionId)

  // 6. Record the closing trade
  const trade = createTrade({
    portfolioId,
    positionId,
    symbol: position.symbol,
    side: OrderSide.SELL,
    tradeType: 'MARKET',
    quantity: fill.quantity,
    price: fill.fillPrice,
    totalValue: fill.totalProceeds,
    pnl: fill.pnl,
    pnlPercent: fill.pnlPercent,
  })

  return { success: true, position: closedPosition, trade, fill }
}

/**
 * Refresh current_price on all open positions for a portfolio.
 * Call this before building the portfolio summary.
 *
 * @param {string} portfolioId
 */
export function refreshPositionPrices(portfolioId) {
  const openPositions = getOpenPositions(portfolioId)
  for (const pos of openPositions) {
    const price = getCurrentMarketPrice(pos.symbol)
    if (price != null) {
      updatePositionCurrentPrice(pos.id, price)
    }
  }
}
