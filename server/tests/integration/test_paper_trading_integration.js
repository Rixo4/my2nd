/**
 * Integration tests — full API lifecycle testing against a real in-memory SQLite DB.
 * Tests the complete flow: Create Portfolio → Open Position → Check Portfolio → Close Position → Metrics → Reset.
 *
 * Run: npx vitest run tests/integration/test_paper_trading_integration.js
 */

import { describe, it, expect, beforeAll } from 'vitest'
import {
  createNewPortfolio,
  getPortfolioSummary,
  openNewPosition,
  closeExistingPosition,
  getTradeHistory,
  getPortfolioMetrics,
  resetPortfolio,
} from '../../src/services/paper_trading_service.js'
import { initDatabase } from '../../src/database/init.js'

beforeAll(async () => {
  initDatabase()
})

let portfolioId = null
let positionId  = null

// ─── Portfolio Creation ────────────────────────────────────────────────────────

describe('Paper Trading Integration', () => {

  describe('1. Create Portfolio', () => {
    it('creates a portfolio with default balance of $10,000', async () => {
      const result = await createNewPortfolio({ name: 'Integration Test Portfolio' })
      expect(result.success).toBe(true)
      expect(result.portfolio).toBeDefined()
      expect(result.portfolio.cash_balance).toBe(10000)
      expect(result.portfolio.starting_balance).toBe(10000)
      portfolioId = result.portfolio.id
    })

    it('creates a portfolio with a custom balance', async () => {
      const result = await createNewPortfolio({ name: 'Custom Balance', startingBalance: 50000 })
      expect(result.success).toBe(true)
      expect(result.portfolio.cash_balance).toBe(50000)
    })

    it('portfolio ID is a non-empty string', () => {
      expect(portfolioId).toBeTypeOf('string')
      expect(portfolioId.length).toBeGreaterThan(0)
    })
  })

  // ─── Get Portfolio ─────────────────────────────────────────────────────────

  describe('2. Get Portfolio Summary', () => {
    it('retrieves the portfolio by ID', async () => {
      const result = await getPortfolioSummary(portfolioId)
      expect(result.success).toBe(true)
      expect(result.portfolio.id).toBe(portfolioId)
    })

    it('returns empty positions array initially', async () => {
      const result = await getPortfolioSummary(portfolioId)
      expect(result.portfolio.positions).toHaveLength(0)
    })

    it('returns error for unknown portfolio', async () => {
      const result = await getPortfolioSummary('non-existent-id')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not found/)
    })
  })

  // ─── Open Position ─────────────────────────────────────────────────────────

  describe('3. Open Position (BUY)', () => {
    it('successfully opens a BTC BUY position', async () => {
      const result = await openNewPosition({ portfolioId, symbol: 'BTC', quantity: 0.1 })
      expect(result.success).toBe(true)
      expect(result.position).toBeDefined()
      expect(result.position.symbol).toBe('BTC')
      expect(result.position.side).toBe('BUY')
      expect(result.position.status).toBe('OPEN')
      positionId = result.position.id
    })

    it('deducts cost from cash balance after BUY', async () => {
      const summary = await getPortfolioSummary(portfolioId)
      expect(summary.portfolio.cash_balance).toBeLessThan(10000)
    })

    it('shows 1 open position after BUY', async () => {
      const summary = await getPortfolioSummary(portfolioId)
      expect(summary.portfolio.positions).toHaveLength(1)
    })

    it('rejects BUY for unsupported symbol', async () => {
      const result = await openNewPosition({ portfolioId, symbol: 'DOGE', quantity: 100 })
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('rejects BUY with zero quantity', async () => {
      const result = await openNewPosition({ portfolioId, symbol: 'AAPL', quantity: 0 })
      expect(result.success).toBe(false)
    })

    it('rejects BUY when insufficient funds', async () => {
      const result = await openNewPosition({ portfolioId, symbol: 'BTC', quantity: 999 })
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/Insufficient/)
    })
  })

  // ─── Trade History ─────────────────────────────────────────────────────────

  describe('4. Trade History', () => {
    it('shows 1 BUY trade after opening position', async () => {
      const result = await getTradeHistory({ portfolioId })
      expect(result.success).toBe(true)
      expect(result.trades).toHaveLength(1)
      expect(result.trades[0].side).toBe('BUY')
    })

    it('filters trades by symbol', async () => {
      const result = await getTradeHistory({ portfolioId, symbol: 'BTC' })
      expect(result.trades.every((t) => t.symbol === 'BTC')).toBe(true)
    })

    it('returns empty for unknown symbol', async () => {
      const result = await getTradeHistory({ portfolioId, symbol: 'AAPL' })
      expect(result.trades).toHaveLength(0)
    })
  })

  // ─── Close Position ────────────────────────────────────────────────────────

  describe('5. Close Position (SELL)', () => {
    it('successfully closes the BTC position', async () => {
      const result = await closeExistingPosition({ portfolioId, positionId })
      expect(result.success).toBe(true)
      expect(result.position.status).toBe('CLOSED')
      expect(result.trade.side).toBe('SELL')
    })

    it('credits proceeds back to cash balance', async () => {
      const summary = await getPortfolioSummary(portfolioId)
      expect(summary.portfolio.cash_balance).toBeGreaterThan(0)
      expect(summary.portfolio.positions).toHaveLength(0)
    })

    it('rejects closing an already-closed position', async () => {
      const result = await closeExistingPosition({ portfolioId, positionId })
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/already closed/)
    })

    it('rejects closing a position from wrong portfolio', async () => {
      const result = await closeExistingPosition({ portfolioId: 'wrong-id', positionId })
      expect(result.success).toBe(false)
    })
  })

  // ─── Trade History After Sell ──────────────────────────────────────────────

  describe('6. Trade History After Close', () => {
    it('shows 2 trades (BUY + SELL) after full lifecycle', async () => {
      const result = await getTradeHistory({ portfolioId })
      expect(result.trades).toHaveLength(2)
      const sides = result.trades.map((t) => t.side)
      expect(sides).toContain('BUY')
      expect(sides).toContain('SELL')
    })

    it('SELL trade has a P&L value', async () => {
      const result = await getTradeHistory({ portfolioId })
      const sellTrade = result.trades.find((t) => t.side === 'SELL')
      expect(sellTrade).toBeDefined()
      expect(sellTrade.pnl).toBeTypeOf('number')
    })
  })

  // ─── Metrics ────────────────────────────────────────────────────────────────

  describe('7. Portfolio Metrics', () => {
    it('returns metrics object', async () => {
      const result = await getPortfolioMetrics(portfolioId)
      expect(result.success).toBe(true)
      expect(result.metrics).toBeDefined()
    })

    it('reports 1 closed trade', async () => {
      const result = await getPortfolioMetrics(portfolioId)
      expect(result.metrics.closed_trades).toBe(1)
    })

    it('win rate is 0 or 100 (only one trade)', async () => {
      const result = await getPortfolioMetrics(portfolioId)
      expect([0, 100]).toContain(result.metrics.win_rate)
    })

    it('returns error for non-existent portfolio', async () => {
      const result = await getPortfolioMetrics('bad-id')
      expect(result.success).toBe(false)
    })
  })

  // ─── Reset ──────────────────────────────────────────────────────────────────

  describe('8. Portfolio Reset', () => {
    it('resets portfolio to original starting balance', async () => {
      const result = await resetPortfolio({ portfolioId })
      expect(result.success).toBe(true)
      expect(result.portfolio.cash_balance).toBe(10000)
    })

    it('clears all trades after reset', async () => {
      const result = await getTradeHistory({ portfolioId })
      expect(result.trades).toHaveLength(0)
    })

    it('clears all positions after reset', async () => {
      const summary = await getPortfolioSummary(portfolioId)
      expect(summary.portfolio.positions).toHaveLength(0)
    })

    it('allows custom new balance on reset', async () => {
      const result = await resetPortfolio({ portfolioId, newBalance: 25000 })
      expect(result.portfolio.cash_balance).toBe(25000)
      expect(result.portfolio.starting_balance).toBe(25000)
    })

    it('rejects reset for non-existent portfolio', async () => {
      const result = await resetPortfolio({ portfolioId: 'ghost-id' })
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not found/)
    })
  })
})
