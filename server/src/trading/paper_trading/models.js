/**
 * Data access layer — all raw SQLite queries for paper trading.
 * Returns plain JS objects; no business logic here.
 */

import { getDb } from '../../database/init.js'
import { v4 as uuidv4 } from 'uuid'
import { nowTimestamp } from '../common/utils.js'

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
    INSERT INTO paper_portfolios (id, name, starting_balance, cash_balance, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?)
  `).run(portfolioId, name, startingBalance, startingBalance, now, now)
  return getPortfolio(portfolioId)
}

export function getPortfolio(id) {
  const db = getDb()
  return db.prepare('SELECT * FROM paper_portfolios WHERE id = ?').get(id) || null
}

export function updatePortfolioBalance(id, cashBalance) {
  const db = getDb()
  db.prepare(`
    UPDATE paper_portfolios SET cash_balance = ?, updated_at = ? WHERE id = ?
  `).run(cashBalance, nowTimestamp(), id)
}

export function resetPortfolioBalance(id, startingBalance) {
  const db = getDb()
  const now = nowTimestamp()
  db.prepare(`
    UPDATE paper_portfolios
    SET cash_balance = ?, starting_balance = ?, updated_at = ?
    WHERE id = ?
  `).run(startingBalance, startingBalance, now, id)
}

export function getAllPortfolios() {
  const db = getDb()
  return db.prepare('SELECT * FROM paper_portfolios ORDER BY created_at DESC').all()
}

// ─── Positions ────────────────────────────────────────────────────────────────

export function createPosition({ portfolioId, symbol, side, quantity, entryPrice }) {
  const db = getDb()
  const id = uuidv4()
  const now = nowTimestamp()
  db.prepare(`
    INSERT INTO paper_positions
      (id, portfolio_id, symbol, side, quantity, entry_price, current_price, status, opened_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
  `).run(id, portfolioId, symbol, side, quantity, entryPrice, entryPrice, now)
  return getPositionById(id)
}

export function getPositionById(id) {
  const db = getDb()
  return db.prepare('SELECT * FROM paper_positions WHERE id = ?').get(id) || null
}

export function getOpenPositions(portfolioId) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM paper_positions
    WHERE portfolio_id = ? AND status = 'OPEN'
    ORDER BY opened_at DESC
  `).all(portfolioId)
}

export function updatePositionCurrentPrice(id, currentPrice) {
  const db = getDb()
  db.prepare('UPDATE paper_positions SET current_price = ? WHERE id = ?').run(currentPrice, id)
}

export function closePosition(id, closedAt = nowTimestamp()) {
  const db = getDb()
  db.prepare(`
    UPDATE paper_positions SET status = 'CLOSED', closed_at = ? WHERE id = ?
  `).run(closedAt, id)
  return getPositionById(id)
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export function createTrade({ portfolioId, positionId, symbol, side, tradeType = 'MARKET', quantity, price, totalValue, pnl = 0, pnlPercent = 0 }) {
  const db = getDb()
  const id = uuidv4()
  const now = nowTimestamp()
  db.prepare(`
    INSERT INTO paper_trades
      (id, portfolio_id, position_id, symbol, side, trade_type, quantity, price, total_value, pnl, pnl_percent, status, executed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'FILLED', ?)
  `).run(id, portfolioId, positionId, symbol, side, tradeType, quantity, price, totalValue, pnl, pnlPercent, now)
  return getTradeById(id)
}

export function getTradeById(id) {
  const db = getDb()
  return db.prepare('SELECT * FROM paper_trades WHERE id = ?').get(id) || null
}

export function getTrades(portfolioId, { symbol, limit = 50, offset = 0 } = {}) {
  const db = getDb()
  if (symbol) {
    return db.prepare(`
      SELECT * FROM paper_trades
      WHERE portfolio_id = ? AND symbol = ?
      ORDER BY executed_at DESC LIMIT ? OFFSET ?
    `).all(portfolioId, symbol, limit, offset)
  }
  return db.prepare(`
    SELECT * FROM paper_trades
    WHERE portfolio_id = ?
    ORDER BY executed_at DESC LIMIT ? OFFSET ?
  `).all(portfolioId, limit, offset)
}

export function getTradeCount(portfolioId) {
  const db = getDb()
  return db.prepare('SELECT COUNT(*) as count FROM paper_trades WHERE portfolio_id = ?').get(portfolioId)?.count ?? 0
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

export function createSnapshot({ portfolioId, totalValue, cashBalance, positionsValue, realizedPnl }) {
  const db = getDb()
  const id = uuidv4()
  const now = nowTimestamp()
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  db.prepare(`
    INSERT OR REPLACE INTO paper_portfolio_snapshots
      (id, portfolio_id, total_value, cash_balance, positions_value, realized_pnl, snapshot_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, portfolioId, totalValue, cashBalance, positionsValue, realizedPnl, date, now)
}

export function getSnapshots(portfolioId, limit = 30) {
  const db = getDb()
  return db.prepare(`
    SELECT * FROM paper_portfolio_snapshots
    WHERE portfolio_id = ?
    ORDER BY snapshot_date DESC LIMIT ?
  `).all(portfolioId, limit)
}

// ─── Bulk delete (for reset) ──────────────────────────────────────────────────

export function deletePortfolioData(portfolioId) {
  const db = getDb()
  // Cascades handle positions/trades via FK, but we do it explicitly for clarity
  const deleteAll = db.transaction(() => {
    db.prepare('DELETE FROM paper_portfolio_snapshots WHERE portfolio_id = ?').run(portfolioId)
    db.prepare('DELETE FROM paper_trades WHERE portfolio_id = ?').run(portfolioId)
    db.prepare('DELETE FROM paper_positions WHERE portfolio_id = ?').run(portfolioId)
  })
  deleteAll()
}
