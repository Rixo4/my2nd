/**
 * Common enums for the paper trading system.
 * OrderSide, OrderStatus, TradeType, PositionStatus constants.
 */

export const OrderSide = Object.freeze({
  BUY: 'BUY',
  SELL: 'SELL',
})

export const OrderStatus = Object.freeze({
  PENDING: 'PENDING',
  FILLED: 'FILLED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
})

export const TradeType = Object.freeze({
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',   // Future: limit order support
  STOP: 'STOP',     // Future: stop-loss support
})

export const PositionStatus = Object.freeze({
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
})

export const PortfolioStatus = Object.freeze({
  ACTIVE: 'ACTIVE',
  RESET: 'RESET',
  ARCHIVED: 'ARCHIVED',
})

export const SignalType = Object.freeze({
  BULLISH: 'bullish',
  BEARISH: 'bearish',
  NEUTRAL: 'neutral',
})
