/**
 * Shared test fixtures for paper trading tests.
 */

export const MOCK_PORTFOLIO = {
  id: 'test-portfolio-001',
  name: 'Test Portfolio',
  starting_balance: 10000,
  cash_balance: 10000,
  status: 'ACTIVE',
  created_at: 1700000000,
  updated_at: 1700000000,
}

export const MOCK_PORTFOLIO_LOW_BALANCE = {
  ...MOCK_PORTFOLIO,
  id: 'test-portfolio-002',
  cash_balance: 50, // Very low — used to test insufficient funds
}

export const MOCK_POSITION_OPEN = {
  id: 'test-position-001',
  portfolio_id: 'test-portfolio-001',
  symbol: 'BTC',
  side: 'BUY',
  quantity: 0.1,
  entry_price: 66800,
  current_price: 66800,
  status: 'OPEN',
  opened_at: 1700000000,
  closed_at: null,
}

export const MOCK_POSITION_CLOSED = {
  ...MOCK_POSITION_OPEN,
  id: 'test-position-002',
  status: 'CLOSED',
  closed_at: 1700086400,
}

export const MOCK_TRADE_BUY = {
  id: 'test-trade-001',
  portfolio_id: 'test-portfolio-001',
  position_id: 'test-position-001',
  symbol: 'BTC',
  side: 'BUY',
  trade_type: 'MARKET',
  quantity: 0.1,
  price: 66800,
  total_value: 6680,
  pnl: 0,
  pnl_percent: 0,
  status: 'FILLED',
  executed_at: 1700000000,
}

export const MOCK_TRADE_SELL_WIN = {
  id: 'test-trade-002',
  portfolio_id: 'test-portfolio-001',
  position_id: 'test-position-001',
  symbol: 'BTC',
  side: 'SELL',
  trade_type: 'MARKET',
  quantity: 0.1,
  price: 68000,
  total_value: 6800,
  pnl: 120,
  pnl_percent: 1.796,
  status: 'FILLED',
  executed_at: 1700086400,
}

export const MOCK_TRADE_SELL_LOSS = {
  id: 'test-trade-003',
  portfolio_id: 'test-portfolio-001',
  position_id: 'test-position-002',
  symbol: 'AAPL',
  side: 'SELL',
  trade_type: 'MARKET',
  quantity: 5,
  price: 179,
  total_value: 895,
  pnl: -15,
  pnl_percent: -1.651,
  status: 'FILLED',
  executed_at: 1700172800,
}

export const MOCK_SNAPSHOTS = [
  {
    id: 'snap-001',
    portfolio_id: 'test-portfolio-001',
    total_value: 10000,
    cash_balance: 10000,
    positions_value: 0,
    realized_pnl: 0,
    snapshot_date: '2023-11-14',
    created_at: 1700000000,
  },
  {
    id: 'snap-002',
    portfolio_id: 'test-portfolio-001',
    total_value: 10200,
    cash_balance: 8200,
    positions_value: 2000,
    realized_pnl: 120,
    snapshot_date: '2023-11-15',
    created_at: 1700086400,
  },
  {
    id: 'snap-003',
    portfolio_id: 'test-portfolio-001',
    total_value: 9800,
    cash_balance: 9800,
    positions_value: 0,
    realized_pnl: 105,
    snapshot_date: '2023-11-16',
    created_at: 1700172800,
  },
]

/**
 * Helper: create a batch of trades for analytics testing.
 * @param {number} wins  - Number of winning trades
 * @param {number} losses - Number of losing trades
 * @returns {object[]}
 */
export function createMockTrades(wins = 5, losses = 3) {
  const trades = []
  let id = 1

  for (let i = 0; i < wins; i++) {
    trades.push({
      ...MOCK_TRADE_SELL_WIN,
      id: `gen-win-${id++}`,
      pnl: 50 + Math.random() * 200,
      executed_at: 1700000000 + i * 86400,
    })
  }
  for (let i = 0; i < losses; i++) {
    trades.push({
      ...MOCK_TRADE_SELL_LOSS,
      id: `gen-loss-${id++}`,
      pnl: -(20 + Math.random() * 100),
      executed_at: 1700000000 + (wins + i) * 86400,
    })
  }
  return trades
}
