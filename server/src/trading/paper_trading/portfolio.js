/**
 * Portfolio manager — calculates live portfolio value and metrics.
 */

import { getOpenPositions } from './models.js'
import { getCurrentMarketPrice } from './executors.js'
import { roundPrice } from '../common/utils.js'

/**
 * Calculate the current total value of all open positions
 * marked to the latest market price.
 *
 * @param {string} portfolioId
 * @returns {Promise<{ positions: object[], positionsValue: number }>}
 */
export async function markPositionsToMarket(portfolioId) {
  const positions = await getOpenPositions(portfolioId)
  let positionsValue = 0

  const enriched = positions.map((pos) => {
    const currentPrice = getCurrentMarketPrice(pos.symbol) ?? pos.entry_price
    const marketValue = roundPrice(currentPrice * pos.quantity)
    const costBasis = roundPrice(pos.entry_price * pos.quantity)
    const unrealizedPnL = roundPrice(marketValue - costBasis)
    const unrealizedPnLPercent = costBasis > 0
      ? roundPrice((unrealizedPnL / costBasis) * 100, 4)
      : 0

    positionsValue += marketValue

    return {
      ...pos,
      current_price: currentPrice,
      market_value: marketValue,
      cost_basis: costBasis,
      unrealized_pnl: unrealizedPnL,
      unrealized_pnl_percent: unrealizedPnLPercent,
    }
  })

  return {
    positions: enriched,
    positionsValue: roundPrice(positionsValue),
  }
}

/**
 * Build the full portfolio summary object.
 *
 * @param {object} portfolio - Raw portfolio record from DB
 * @param {object[]} trades  - All trades for this portfolio
 * @returns {Promise<object>}
 */
export async function buildPortfolioSummary(portfolio, trades = []) {
  const { positions, positionsValue } = await markPositionsToMarket(portfolio.id)
  const totalValue = roundPrice(portfolio.cash_balance + positionsValue)
  const totalReturn = roundPrice(totalValue - portfolio.starting_balance)
  const totalReturnPercent = portfolio.starting_balance > 0
    ? roundPrice((totalReturn / portfolio.starting_balance) * 100, 4)
    : 0

  // Realized P&L from closed trades (SELL side pnl)
  const realizedPnL = roundPrice(
    trades
      .filter((t) => t.side === 'SELL')
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  )

  return {
    id: portfolio.id,
    name: portfolio.name,
    status: portfolio.status,
    starting_balance: portfolio.starting_balance,
    cash_balance: roundPrice(portfolio.cash_balance),
    positions_value: positionsValue,
    total_value: totalValue,
    total_return: totalReturn,
    total_return_percent: totalReturnPercent,
    realized_pnl: realizedPnL,
    open_positions: positions.length,
    total_trades: trades.length,
    positions,
    created_at: portfolio.created_at,
    updated_at: portfolio.updated_at,
  }
}
