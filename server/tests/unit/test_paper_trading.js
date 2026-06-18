/**
 * Unit tests for paper trading modules.
 * Tests validators, utils, analytics — pure logic, no DB/network required.
 *
 * Run: npx vitest run tests/unit/test_paper_trading.js
 */

import { describe, it, expect } from 'vitest'
import { validateOrder, validateClosePosition } from '../../src/trading/paper_trading/validators.js'
import {
  roundPrice,
  calculatePnL,
  calculatePnLPercent,
  tradeCost,
  formatCurrency,
  nowTimestamp,
} from '../../src/trading/common/utils.js'
import { calculateMetrics } from '../../src/trading/paper_trading/analytics.js'
import { OrderSide } from '../../src/trading/common/enums.js'
import {
  MOCK_PORTFOLIO,
  MOCK_PORTFOLIO_LOW_BALANCE,
  MOCK_POSITION_OPEN,
  MOCK_POSITION_CLOSED,
  MOCK_SNAPSHOTS,
  createMockTrades,
} from '../fixtures/paper_trading_fixtures.js'

// ─── Utils ────────────────────────────────────────────────────────────────────

describe('Utils', () => {
  describe('roundPrice', () => {
    it('rounds to 2 decimal places by default', () => {
      expect(roundPrice(1.23456)).toBe(1.23)
    })
    it('rounds to specified decimals', () => {
      expect(roundPrice(1.23456, 4)).toBe(1.2346)
    })
    it('handles zero', () => {
      expect(roundPrice(0)).toBe(0)
    })
    it('handles negative numbers', () => {
      expect(roundPrice(-1.567)).toBe(-1.57)
    })
  })

  describe('calculatePnL', () => {
    it('calculates positive P&L for BUY when price rises', () => {
      expect(calculatePnL(100, 110, 1, 'BUY')).toBe(10)
    })
    it('calculates negative P&L for BUY when price falls', () => {
      expect(calculatePnL(100, 90, 1, 'BUY')).toBe(-10)
    })
    it('calculates positive P&L for SELL (short) when price falls', () => {
      expect(calculatePnL(100, 90, 1, 'SELL')).toBe(10)
    })
    it('scales with quantity', () => {
      expect(calculatePnL(100, 110, 5, 'BUY')).toBe(50)
    })
    it('returns 0 for no price change', () => {
      expect(calculatePnL(100, 100, 1, 'BUY')).toBe(0)
    })
  })

  describe('calculatePnLPercent', () => {
    it('calculates positive percent', () => {
      expect(calculatePnLPercent(10, 100, 1)).toBe(10)
    })
    it('returns 0 when cost basis is 0', () => {
      expect(calculatePnLPercent(10, 0, 1)).toBe(0)
    })
  })

  describe('tradeCost', () => {
    it('calculates correct trade cost', () => {
      expect(tradeCost(66800, 0.1)).toBe(6680)
    })
    it('handles floating point correctly', () => {
      expect(tradeCost(1.086, 500000)).toBe(543000)
    })
  })

  describe('formatCurrency', () => {
    it('formats positive amounts', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
    })
    it('formats negative amounts', () => {
      expect(formatCurrency(-50)).toBe('-$50.00')
    })
  })

  describe('nowTimestamp', () => {
    it('returns a number close to Date.now() / 1000', () => {
      const ts = nowTimestamp()
      expect(ts).toBeTypeOf('number')
      expect(ts).toBeGreaterThan(1_700_000_000)
    })
  })
})

// ─── Validators ───────────────────────────────────────────────────────────────

describe('Validators', () => {
  describe('validateOrder', () => {
    const validBuyOrder = {
      side: 'BUY',
      symbol: 'BTC',
      quantity: 0.1,
      estimatedPrice: 66800,
    }

    it('accepts a valid BUY order with sufficient funds', () => {
      const result = validateOrder(validBuyOrder, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(true)
    })

    it('rejects when side is missing', () => {
      const result = validateOrder({ ...validBuyOrder, side: undefined }, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/side/)
    })

    it('rejects when symbol is missing', () => {
      const result = validateOrder({ ...validBuyOrder, symbol: undefined }, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/symbol/)
    })

    it('rejects when quantity is missing', () => {
      const result = validateOrder({ ...validBuyOrder, quantity: undefined }, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/quantity/)
    })

    it('rejects an unsupported symbol', () => {
      const result = validateOrder({ ...validBuyOrder, symbol: 'FAKE' }, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not supported/)
    })

    it('rejects an invalid side value', () => {
      const result = validateOrder({ ...validBuyOrder, side: 'HOLD' }, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/BUY or SELL/)
    })

    it('rejects zero quantity', () => {
      const result = validateOrder({ ...validBuyOrder, quantity: 0 }, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/positive/)
    })

    it('rejects negative quantity', () => {
      const result = validateOrder({ ...validBuyOrder, quantity: -1 }, MOCK_PORTFOLIO, [])
      expect(result.valid).toBe(false)
    })

    it('rejects BUY when insufficient funds', () => {
      const result = validateOrder(validBuyOrder, MOCK_PORTFOLIO_LOW_BALANCE, [])
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/Insufficient funds/)
    })

    it('rejects SELL when no open position exists', () => {
      const result = validateOrder(
        { ...validBuyOrder, side: 'SELL' },
        MOCK_PORTFOLIO,
        [] // no open positions
      )
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/No open BUY position/)
    })

    it('rejects SELL when position quantity is insufficient', () => {
      const position = { ...MOCK_POSITION_OPEN, quantity: 0.01 }
      const result = validateOrder(
        { ...validBuyOrder, side: 'SELL', quantity: 0.1 }, // trying to sell more than held
        MOCK_PORTFOLIO,
        [position]
      )
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/Insufficient position/)
    })

    it('accepts SELL when position has sufficient quantity', () => {
      const result = validateOrder(
        { side: 'SELL', symbol: 'BTC', quantity: 0.05, estimatedPrice: 66800 },
        MOCK_PORTFOLIO,
        [MOCK_POSITION_OPEN]
      )
      expect(result.valid).toBe(true)
    })
  })

  describe('validateClosePosition', () => {
    it('accepts a valid open position', () => {
      const result = validateClosePosition(MOCK_POSITION_OPEN, 'test-portfolio-001')
      expect(result.valid).toBe(true)
    })

    it('rejects null position', () => {
      const result = validateClosePosition(null, 'test-portfolio-001')
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/not found/)
    })

    it('rejects position belonging to different portfolio', () => {
      const result = validateClosePosition(MOCK_POSITION_OPEN, 'other-portfolio')
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/belong/)
    })

    it('rejects already closed position', () => {
      const result = validateClosePosition(MOCK_POSITION_CLOSED, 'test-portfolio-001')
      expect(result.valid).toBe(false)
      expect(result.error).toMatch(/already closed/)
    })
  })
})

// ─── Analytics ────────────────────────────────────────────────────────────────

describe('Analytics', () => {
  describe('calculateMetrics with no trades', () => {
    it('returns zero metrics when no closed trades', () => {
      const metrics = calculateMetrics([], [], 10000)
      expect(metrics.win_rate).toBe(0)
      expect(metrics.closed_trades).toBe(0)
      expect(metrics.total_realized_pnl).toBe(0)
    })
  })

  describe('calculateMetrics with mock trades', () => {
    const trades = createMockTrades(6, 2) // 6 wins, 2 losses
    const metrics = calculateMetrics(trades, MOCK_SNAPSHOTS, 10000)

    it('calculates correct win rate (75%)', () => {
      expect(metrics.win_rate).toBe(75)
    })

    it('returns correct trade counts', () => {
      expect(metrics.closed_trades).toBe(8)
      expect(metrics.winning_trades).toBe(6)
      expect(metrics.losing_trades).toBe(2)
    })

    it('best trade has positive P&L', () => {
      expect(metrics.best_trade.pnl).toBeGreaterThan(0)
    })

    it('worst trade has negative P&L', () => {
      expect(metrics.worst_trade.pnl).toBeLessThan(0)
    })

    it('profit factor is positive', () => {
      expect(metrics.profit_factor).toBeGreaterThan(0)
    })

    it('returns an equity curve array', () => {
      expect(Array.isArray(metrics.equity_curve)).toBe(true)
    })

    it('current streak type is WIN or LOSS', () => {
      expect(['WIN', 'LOSS']).toContain(metrics.current_streak.type)
    })
  })

  describe('calculateMetrics max drawdown', () => {
    it('calculates max drawdown from snapshots', () => {
      const metrics = calculateMetrics([], MOCK_SNAPSHOTS, 10000)
      // Peak is 10200, trough is 9800 → drawdown = 400
      expect(metrics.max_drawdown).toBe(400)
    })
  })
})

// ─── Enums ────────────────────────────────────────────────────────────────────

describe('Enums', () => {
  it('OrderSide has BUY and SELL', () => {
    expect(OrderSide.BUY).toBe('BUY')
    expect(OrderSide.SELL).toBe('SELL')
  })

  it('OrderSide is frozen (immutable)', () => {
    expect(Object.isFrozen(OrderSide)).toBe(true)
  })
})
