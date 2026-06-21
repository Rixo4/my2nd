/**
 * Data access layer — all raw SQLite queries for paper trading.
 * Returns plain JS objects; no business logic here.
 */

import { getDb } from '../../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { nowTimestamp } from '../common/utils.js'
import { roundPrice } from '../common/utils.js'

// ─── Mapper Helpers ───────────────────────────────────────────────────────────

function mapPortfolioRow(row) {
  if (!row) return null
  return {
    id: row.id,
    user_id: row.user_id,
    name: 'My Portfolio',
    starting_balance: row.initial_capital,
    cash_balance: row.current_cash,
    total_equity: row.total_equity,
    status: 'ACTIVE',
    created_at: row.created_at,
    updated_at: row.updated_at
  }
}

function mapTradeToPosition(row) {
  if (!row) return null
  return {
    id: row.id,
    portfolio_id: row.user_id,
    symbol: row.symbol,
    side: row.type, // 'BUY' or 'SELL'
    quantity: row.quantity,
    entry_price: row.entry_price,
    current_price: row.exit_price || row.entry_price, // exit_price maps to current_price if open
    status: row.status, // 'OPEN' or 'CLOSED'
    opened_at: row.entry_time,
    closed_at: row.exit_time
  }
}

function projectTrades(rows) {
  const list = []
  for (const r of rows) {
    // 1. Always add the BUY transaction
    list.push({
      id: r.id + '-buy',
      portfolio_id: r.user_id,
      position_id: r.id,
      symbol: r.symbol,
      side: 'BUY',
      trade_type: 'MARKET',
      quantity: r.quantity,
      price: r.entry_price,
      total_value: roundPrice(r.entry_price * r.quantity),
      pnl: 0,
      pnl_percent: 0,
      status: 'FILLED',
      executed_at: r.entry_time
    })

    // 2. Add the SELL transaction if closed
    if (r.status === 'CLOSED') {
      list.push({
        id: r.id + '-sell',
        portfolio_id: r.user_id,
        position_id: r.id,
        symbol: r.symbol,
        side: 'SELL',
        trade_type: 'MARKET',
        quantity: r.quantity,
        price: r.exit_price,
        total_value: roundPrice(r.exit_price * r.quantity),
        pnl: r.pnl,
        pnl_percent: r.pnl_percent,
        status: 'FILLED',
        executed_at: r.exit_time
      })
    }
  }
  // Sort all projected trades by executed_at descending
  return list.sort((a, b) => b.executed_at - a.executed_at)
}

// ─── Portfolios ───────────────────────────────────────────────────────────────

export function createPortfolio({ id, name = 'My Portfolio', startingBalance = 10000 } = {}) {
  const db = getDb()
  const portfolioId = id || uuidv4()
  
  // Return existing portfolio if it already exists to avoid primary key constraints
  const existing = getPortfolio(portfolioId)
  if (existing) {
    return existing
  }

  const now = nowTimestamp()
  db.prepare(`
    INSERT INTO user_portfolios (id, user_id, initial_capital, current_cash, total_equity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(portfolioId, portfolioId, startingBalance, startingBalance, startingBalance, now, now)

  // Initialize progress tracking for this user
  db.prepare(`
    INSERT OR IGNORE INTO user_progress (id, user_id, current_level, lessons_completed, xp_points, badges, last_updated)
    VALUES (?, ?, 'BEGINNER', 0, 0, '[]', ?)
  `).run(uuidv4(), portfolioId, now)

  return getPortfolio(portfolioId)
}

export function getPortfolio(id) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM user_portfolios WHERE id = ?').get(id)
  return mapPortfolioRow(row)
}

export function updatePortfolioBalance(id, cashBalance) {
  const db = getDb()
  const now = nowTimestamp()
  db.prepare(`
    UPDATE user_portfolios SET current_cash = ?, total_equity = ?, updated_at = ? WHERE id = ?
  `).run(cashBalance, cashBalance, now, id)
}

export function resetPortfolioBalance(id, startingBalance) {
  const db = getDb()
  const now = nowTimestamp()
  db.prepare(`
    UPDATE user_portfolios
    SET current_cash = ?, initial_capital = ?, total_equity = ?, updated_at = ?
    WHERE id = ?
  `).run(startingBalance, startingBalance, startingBalance, now, id)
}

export function getAllPortfolios() {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM user_portfolios ORDER BY created_at DESC').all()
  return rows.map(mapPortfolioRow)
}

// ─── Positions ────────────────────────────────────────────────────────────────

export function createPosition({ portfolioId, symbol, side, quantity, entryPrice }) {
  const db = getDb()
  const id = uuidv4()
  const now = nowTimestamp()
  db.prepare(`
    INSERT INTO trades
      (id, user_id, symbol, type, entry_price, quantity, entry_time, status, pnl, pnl_percent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', 0, 0, ?)
  `).run(id, portfolioId, symbol, 'BUY', entryPrice, quantity, now, now)
  return getPositionById(id)
}

export function getPositionById(id) {
  const db = getDb()
  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(id)
  return mapTradeToPosition(row)
}

export function getOpenPositions(portfolioId) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM trades
    WHERE user_id = ? AND status = 'OPEN'
    ORDER BY entry_time DESC
  `).all(portfolioId)
  return rows.map(mapTradeToPosition)
}

export function updatePositionCurrentPrice(id, currentPrice) {
  const db = getDb()
  db.prepare('UPDATE trades SET exit_price = ? WHERE id = ?').run(currentPrice, id)
}

export function closePosition(id, closedAt = nowTimestamp()) {
  const db = getDb()
  db.prepare(`
    UPDATE trades SET status = 'CLOSED', exit_time = ? WHERE id = ?
  `).run(closedAt, id)
  return getPositionById(id)
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export function createTrade({ portfolioId, positionId, symbol, side, tradeType = 'MARKET', quantity, price, totalValue, pnl = 0, pnlPercent = 0 }) {
  const db = getDb()
  const now = nowTimestamp()

  if (side === 'BUY') {
    const existing = db.prepare('SELECT * FROM trades WHERE id = ?').get(positionId)
    if (!existing) {
      db.prepare(`
        INSERT INTO trades (id, user_id, symbol, type, entry_price, quantity, entry_time, status, pnl, pnl_percent, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', 0, 0, ?)
      `).run(positionId, portfolioId, symbol, 'BUY', price, quantity, now, now)
    }
    return getTradeById(positionId + '-buy')
  } else {
    db.prepare(`
      UPDATE trades
      SET status = 'CLOSED', exit_price = ?, exit_time = ?, pnl = ?, pnl_percent = ?
      WHERE id = ?
    `).run(price, now, pnl, pnlPercent, positionId)
    return getTradeById(positionId + '-sell')
  }
}

export function getTradeById(id) {
  const isBuy = id.endsWith('-buy')
  const isSell = id.endsWith('-sell')
  const baseId = isBuy ? id.slice(0, -4) : (isSell ? id.slice(0, -5) : id)

  const db = getDb()
  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(baseId)
  if (!row) return null

  const projected = projectTrades([row])
  return projected.find(t => t.id === id) || projected[0]
}

export function getTrades(portfolioId, { symbol, limit = 50, offset = 0 } = {}) {
  const db = getDb()
  let rows = []
  if (symbol) {
    rows = db.prepare(`
      SELECT * FROM trades
      WHERE user_id = ? AND symbol = ?
      ORDER BY entry_time DESC
    `).all(portfolioId, symbol)
  } else {
    rows = db.prepare(`
      SELECT * FROM trades
      WHERE user_id = ?
      ORDER BY entry_time DESC
    `).all(portfolioId)
  }

  const projected = projectTrades(rows)
  return projected.slice(offset, offset + limit)
}

export function getTradeCount(portfolioId) {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM trades WHERE user_id = ?').all(portfolioId)
  return projectTrades(rows).length
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

export function createSnapshot({ portfolioId, totalValue, cashBalance, positionsValue, realizedPnl }) {
  const db = getDb()
  const id = uuidv4()
  const now = nowTimestamp()
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  db.prepare(`
    INSERT OR REPLACE INTO portfolio_snapshots
      (id, user_id, equity, cash, snapshot_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, portfolioId, totalValue, cashBalance, date, now)
}

export function getSnapshots(portfolioId, limit = 30) {
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM portfolio_snapshots
    WHERE user_id = ?
    ORDER BY snapshot_date DESC LIMIT ?
  `).all(portfolioId, limit)

  return rows.map(r => ({
    id: r.id,
    portfolio_id: r.user_id,
    total_value: r.equity,
    cash_balance: r.cash,
    positions_value: r.equity - r.cash,
    realized_pnl: 0,
    snapshot_date: r.snapshot_date,
    created_at: r.created_at
  }))
}

// ─── Bulk delete (for reset) ──────────────────────────────────────────────────

export function deletePortfolioData(portfolioId) {
  const db = getDb()
  const deleteAll = db.transaction(() => {
    db.prepare('DELETE FROM portfolio_snapshots WHERE user_id = ?').run(portfolioId)
    db.prepare('DELETE FROM trades WHERE user_id = ?').run(portfolioId)
    db.prepare('DELETE FROM user_progress WHERE user_id = ?').run(portfolioId)
  })
  deleteAll()
}
