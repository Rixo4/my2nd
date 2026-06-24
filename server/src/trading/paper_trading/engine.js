/**
 * Paper Trading Engine — central orchestrator.
 * Wires together: validator → executor → models → portfolio update.
 */

import { validateOrder, validateClosePosition } from './validators.js'
import { executeBuyOrder, executeSellOrder, getCurrentMarketPrice, fetchLivePrice } from './executors.js'
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
 * @returns {Promise<{ success: boolean, position?: object, trade?: object, error?: string }>}
 */
export async function openPosition({ portfolioId, symbol, quantity, overridePrice }) {
  // 1. Load portfolio
  const portfolio = await getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.' }

  // 2. Get price — use live overridePrice from route, fallback to live fetch or fallback price
  let estimatedPrice = overridePrice
  if (!estimatedPrice) {
    try {
      estimatedPrice = await fetchLivePrice(symbol)
    } catch (err) {
      estimatedPrice = getCurrentMarketPrice(symbol)
    }
  }
  if (!estimatedPrice) {
    return { success: false, error: `No market data available for ${symbol}.` }
  }

  // 3. Load open positions for validation context
  const openPositions = await getOpenPositions(portfolioId)

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
  await updatePortfolioBalance(portfolioId, newBalance)

  // 7. Create the position record
  const position = await createPosition({
    portfolioId,
    symbol: symbol.toUpperCase(),
    side: OrderSide.BUY,
    quantity,
    entryPrice: fillPrice,
  })

  // 8. Record the trade
  const trade = await createTrade({
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
 * @returns {Promise<{ success: boolean, position?: object, trade?: object, error?: string }>}
 */
export async function closePosition({ portfolioId, positionId, overridePrice }) {
  // 1. Load portfolio + position
  const portfolio = await getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.' }

  const position = await getPositionById(positionId)

  // 2. Validate the close request
  const validation = validateClosePosition(position, portfolioId)
  if (!validation.valid) return { success: false, error: validation.error }

  // 3. Use live price if provided, otherwise fall back to live fetching or sync executor
  let fillPrice = overridePrice
  if (!fillPrice) {
    try {
      fillPrice = await fetchLivePrice(position.symbol)
    } catch (err) {
      fillPrice = getCurrentMarketPrice(position.symbol) || position.entry_price
    }
  }
  fillPrice = roundPrice(fillPrice, 6)

  const totalProceeds = roundPrice(fillPrice * position.quantity)
  const pnl           = roundPrice((fillPrice - position.entry_price) * position.quantity)
  const costBasis     = position.entry_price * position.quantity
  const pnlPercent    = costBasis > 0 ? roundPrice((pnl / costBasis) * 100, 4) : 0
  const fill = { fillPrice, quantity: position.quantity, totalProceeds, pnl, pnlPercent }

  // 4. Credit proceeds to cash balance
  const newBalance = roundPrice(portfolio.cash_balance + fill.totalProceeds)
  await updatePortfolioBalance(portfolioId, newBalance)

  // 5. Mark position as closed
  const closedPosition = await dbClosePosition(positionId)

  // 6. Record the closing trade
  const trade = await createTrade({
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
export async function refreshPositionPrices(portfolioId) {
  const openPositions = await getOpenPositions(portfolioId)
  for (const pos of openPositions) {
    let price = null
    try {
      price = await fetchLivePrice(pos.symbol)
    } catch (err) {
      price = getCurrentMarketPrice(pos.symbol)
    }
    if (price != null) {
      await updatePositionCurrentPrice(pos.id, price)
    }
  }
}
