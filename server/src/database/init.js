/**
 * SQLite database initialization for paper trading.
 * Creates all required tables if they do not exist.
 * Called once at server startup.
 */

import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const isVercel = !!process.env.VERCEL
const DB_PATH = isVercel 
  ? '/tmp/paper_trading.db' 
  : join(__dirname, '../../data/paper_trading.db')

// Ensure the data directory exists
if (!isVercel) {
  mkdirSync(join(__dirname, '../../data'), { recursive: true })
}

let _db = null

/**
 * Get the singleton database connection.
 * @returns {import('better-sqlite3').Database}
 */
export function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH)
    _db.pragma('journal_mode = WAL')   // Better concurrent read performance
    _db.pragma('foreign_keys = ON')    // Enforce referential integrity
  }
  return _db
}

/**
 * Initialize all paper trading tables.
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
 */
export function initDatabase() {
  const db = getDb()

  db.exec(`
    -- ────────────────────────────────────────────────────────────
    -- Paper Portfolios
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS paper_portfolios (
      id               TEXT PRIMARY KEY,
      name             TEXT NOT NULL DEFAULT 'My Portfolio',
      starting_balance REAL NOT NULL DEFAULT 10000.00,
      cash_balance     REAL NOT NULL DEFAULT 10000.00,
      status           TEXT NOT NULL DEFAULT 'ACTIVE',
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    );

    -- ────────────────────────────────────────────────────────────
    -- Paper Positions (open trades)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS paper_positions (
      id             TEXT PRIMARY KEY,
      portfolio_id   TEXT NOT NULL REFERENCES paper_portfolios(id) ON DELETE CASCADE,
      symbol         TEXT NOT NULL,
      side           TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
      quantity       REAL NOT NULL,
      entry_price    REAL NOT NULL,
      current_price  REAL,
      status         TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
      opened_at      INTEGER NOT NULL,
      closed_at      INTEGER
    );

    CREATE INDEX IF NOT EXISTS idx_positions_portfolio ON paper_positions(portfolio_id, status);

    -- ────────────────────────────────────────────────────────────
    -- Paper Trades (completed trade records)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS paper_trades (
      id           TEXT PRIMARY KEY,
      portfolio_id TEXT NOT NULL REFERENCES paper_portfolios(id) ON DELETE CASCADE,
      position_id  TEXT REFERENCES paper_positions(id),
      symbol       TEXT NOT NULL,
      side         TEXT NOT NULL CHECK(side IN ('BUY', 'SELL')),
      trade_type   TEXT NOT NULL DEFAULT 'MARKET',
      quantity     REAL NOT NULL,
      price        REAL NOT NULL,
      total_value  REAL NOT NULL,
      pnl          REAL DEFAULT 0,
      pnl_percent  REAL DEFAULT 0,
      status       TEXT NOT NULL DEFAULT 'FILLED',
      executed_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_trades_portfolio ON paper_trades(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_trades_symbol    ON paper_trades(portfolio_id, symbol);

    -- ────────────────────────────────────────────────────────────
    -- Portfolio Snapshots (daily equity curve)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS paper_portfolio_snapshots (
      id              TEXT PRIMARY KEY,
      portfolio_id    TEXT NOT NULL REFERENCES paper_portfolios(id) ON DELETE CASCADE,
      total_value     REAL NOT NULL,
      cash_balance    REAL NOT NULL,
      positions_value REAL NOT NULL DEFAULT 0,
      realized_pnl    REAL NOT NULL DEFAULT 0,
      snapshot_date   TEXT NOT NULL,
      created_at      INTEGER NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_date
      ON paper_portfolio_snapshots(portfolio_id, snapshot_date);
  `)

  console.log('📊 Paper trading database initialized at:', DB_PATH)
}
