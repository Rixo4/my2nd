/**
 * Paper Trading API routes.
 * All endpoints are under /api/v1/paper/
 */

import { Router } from 'express'
import {
  createNewPortfolio,
  getPortfolioSummary,
  openNewPosition,
  closeExistingPosition,
  getTradeHistory,
  getPortfolioMetrics,
  resetPortfolio,
} from '../src/services/paper_trading_service.js'

const router = Router()

// ── Helpers ────────────────────────────────────────────────────────────────────

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, ...data })
}

function fail(res, error, status = 400) {
  res.status(status).json({ success: false, error })
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/paper/portfolio
 * Create a new paper trading portfolio.
 * Body: { name?: string, startingBalance?: number }
 */
router.post('/portfolio', (req, res) => {
  try {
    const { id, name, startingBalance } = req.body || {}
    if (startingBalance !== undefined && (isNaN(startingBalance) || startingBalance < 100)) {
      return fail(res, 'startingBalance must be a number >= 100')
    }
    const result = createNewPortfolio({ id, name, startingBalance })
    ok(res, result, 201)
  } catch (err) {
    console.error('[paper/portfolio POST]', err)
    fail(res, err.message, 500)
  }
})

/**
 * GET /api/v1/paper/portfolio/:id
 * Get full portfolio summary.
 */
router.get('/portfolio/:id', (req, res) => {
  try {
    const result = getPortfolioSummary(req.params.id)
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/portfolio GET]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/paper/positions
 * Open a new position (BUY order).
 * Body: { portfolioId, symbol, quantity }
 */
router.post('/positions', (req, res) => {
  try {
    const { portfolioId, symbol, quantity } = req.body || {}
    if (!portfolioId) return fail(res, 'Missing required field: portfolioId')
    if (!symbol)      return fail(res, 'Missing required field: symbol')
    if (!quantity)    return fail(res, 'Missing required field: quantity')

    const result = openNewPosition({ portfolioId, symbol, quantity: Number(quantity) })
    if (!result.success) return fail(res, result.error)
    ok(res, result, 201)
  } catch (err) {
    console.error('[paper/positions POST]', err)
    fail(res, err.message, 500)
  }
})

/**
 * GET /api/v1/paper/positions/:portfolioId
 * Get all open positions for a portfolio.
 * (Positions are returned inside the portfolio summary)
 */
router.get('/positions/:portfolioId', (req, res) => {
  try {
    const result = getPortfolioSummary(req.params.portfolioId)
    if (!result.success) return fail(res, result.error, 404)
    ok(res, { positions: result.portfolio.positions })
  } catch (err) {
    console.error('[paper/positions GET]', err)
    fail(res, err.message, 500)
  }
})

/**
 * DELETE /api/v1/paper/positions/:positionId
 * Close (SELL) a specific position.
 * Query: ?portfolioId=<id>
 */
router.delete('/positions/:positionId', (req, res) => {
  try {
    const { portfolioId } = req.query
    if (!portfolioId) return fail(res, 'Missing query param: portfolioId')

    const result = closeExistingPosition({ portfolioId, positionId: req.params.positionId })
    if (!result.success) return fail(res, result.error)
    ok(res, result)
  } catch (err) {
    console.error('[paper/positions DELETE]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// TRADES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/paper/trades/:portfolioId
 * Get trade history. Optional: ?symbol=BTC&limit=20&offset=0
 */
router.get('/trades/:portfolioId', (req, res) => {
  try {
    const { symbol, limit, offset } = req.query
    const result = getTradeHistory({
      portfolioId: req.params.portfolioId,
      symbol,
      limit:  limit  ? Number(limit)  : 50,
      offset: offset ? Number(offset) : 0,
    })
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/trades GET]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/paper/metrics/:portfolioId
 * Get performance analytics (win rate, drawdown, Sharpe, etc.)
 */
router.get('/metrics/:portfolioId', (req, res) => {
  try {
    const result = getPortfolioMetrics(req.params.portfolioId)
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/metrics GET]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/paper/reset/:portfolioId
 * Wipe all trades/positions and reset cash balance.
 * Body: { newBalance?: number }
 */
router.post('/reset/:portfolioId', (req, res) => {
  try {
    const { newBalance } = req.body || {}
    if (newBalance !== undefined && (isNaN(newBalance) || newBalance < 100)) {
      return fail(res, 'newBalance must be a number >= 100')
    }
    const result = resetPortfolio({
      portfolioId: req.params.portfolioId,
      newBalance: newBalance ? Number(newBalance) : undefined,
    })
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/reset POST]', err)
    fail(res, err.message, 500)
  }
})

export default router
