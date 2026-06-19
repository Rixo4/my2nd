/**
 * Paper Trading Service — business logic orchestrator.
 * Sits between Express routes and the core engine/models.
 * All methods return plain JS objects suitable for JSON serialization.
 */

import {
  createPortfolio,
  getPortfolio,
  getTrades,
  getSnapshots,
  deletePortfolioData,
  resetPortfolioBalance,
  createSnapshot,
} from '../trading/paper_trading/models.js'
import {
  openPosition,
  closePosition,
  refreshPositionPrices,
} from '../trading/paper_trading/engine.js'
import { buildPortfolioSummary } from '../trading/paper_trading/portfolio.js'
import { calculateMetrics } from '../trading/paper_trading/analytics.js'

// ─── Portfolio ────────────────────────────────────────────────────────────────

/**
 * Create a new paper trading portfolio.
 * @param {{ name?: string, startingBalance?: number }} opts
 * @returns {{ success: boolean, portfolio: object }}
 */
export function createNewPortfolio({ id, name, startingBalance = 10000 } = {}) {
  const portfolio = createPortfolio({ id, name, startingBalance })
  return { success: true, portfolio }
}

/**
 * Get full portfolio summary (balance, positions marked-to-market, P&L).
 * @param {string} portfolioId
 * @returns {{ success: boolean, portfolio?: object, error?: string }}
 */
export function getPortfolioSummary(portfolioId) {
  const portfolio = getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.' }

  refreshPositionPrices(portfolioId)

  const trades = getTrades(portfolioId, { limit: 1000 })
  const summary = buildPortfolioSummary(portfolio, trades)

  // Take a daily snapshot while we're here
  _takeSnapshot(portfolio.id, summary)

  return { success: true, portfolio: summary }
}

// ─── Positions ────────────────────────────────────────────────────────────────

/**
 * Open a new BUY position for a portfolio.
 * @param {{ portfolioId: string, symbol: string, quantity: number }} params
 * @returns {{ success: boolean, position?: object, trade?: object, error?: string }}
 */
export function openNewPosition({ portfolioId, symbol, quantity, overridePrice }) {
  return openPosition({ portfolioId, symbol, quantity, overridePrice })
}

/**
 * Close (SELL) an existing open position.
 * @param {{ portfolioId: string, positionId: string }} params
 * @returns {{ success: boolean, position?: object, trade?: object, error?: string }}
 */
export function closeExistingPosition({ portfolioId, positionId, overridePrice }) {
  return closePosition({ portfolioId, positionId, overridePrice })
}

// ─── Trades ───────────────────────────────────────────────────────────────────

/**
 * Get trade history for a portfolio.
 * @param {{ portfolioId: string, symbol?: string, limit?: number, offset?: number }} params
 * @returns {{ success: boolean, trades: object[], count: number }}
 */
export function getTradeHistory({ portfolioId, symbol, limit = 50, offset = 0 }) {
  const portfolio = getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.', trades: [] }

  const trades = getTrades(portfolioId, { symbol, limit, offset })
  return { success: true, trades, count: trades.length }
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

/**
 * Get performance metrics for a portfolio.
 * @param {string} portfolioId
 * @returns {{ success: boolean, metrics?: object, error?: string }}
 */
export function getPortfolioMetrics(portfolioId) {
  const portfolio = getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.' }

  const trades    = getTrades(portfolioId, { limit: 10000 })
  const snapshots = getSnapshots(portfolioId, 90)
  const metrics   = calculateMetrics(trades, snapshots, portfolio.starting_balance)

  return { success: true, metrics }
}

// ─── Reset ────────────────────────────────────────────────────────────────────

/**
 * Reset a portfolio: wipe all positions/trades and restore starting balance.
 * @param {{ portfolioId: string, newBalance?: number }} params
 * @returns {{ success: boolean, portfolio?: object, error?: string }}
 */
export function resetPortfolio({ portfolioId, newBalance }) {
  const portfolio = getPortfolio(portfolioId)
  if (!portfolio) return { success: false, error: 'Portfolio not found.' }

  const startingBalance = newBalance ?? portfolio.starting_balance

  deletePortfolioData(portfolioId)
  resetPortfolioBalance(portfolioId, startingBalance)

  const fresh = getPortfolio(portfolioId)
  return { success: true, portfolio: fresh }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _takeSnapshot(portfolioId, summary) {
  try {
    createSnapshot({
      portfolioId,
      totalValue: summary.total_value,
      cashBalance: summary.cash_balance,
      positionsValue: summary.positions_value,
      realizedPnl: summary.realized_pnl,
    })
  } catch {
    // Silently ignore duplicate snapshot for the same day (UNIQUE index)
  }
}
