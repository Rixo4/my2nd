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
    if (!isVercel) {
      _db.pragma('journal_mode = WAL')   // Better concurrent read performance
    }
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
    -- 1. USERS & PORTFOLIOS (user_portfolios)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_portfolios (
      id              TEXT PRIMARY KEY,
      user_id         TEXT UNIQUE,
      initial_capital REAL NOT NULL DEFAULT 10000.00,
      current_cash    REAL NOT NULL DEFAULT 10000.00,
      total_equity    REAL NOT NULL DEFAULT 10000.00,
      created_at      INTEGER NOT NULL,
      updated_at      INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_portfolios_user ON user_portfolios(user_id);

    -- ────────────────────────────────────────────────────────────
    -- 2. TRADES & POSITIONS (trades)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS trades (
      id           TEXT PRIMARY KEY,
      user_id      TEXT,
      symbol       TEXT NOT NULL,
      type         TEXT NOT NULL CHECK(type IN ('BUY', 'SELL')),
      entry_price  REAL NOT NULL,
      quantity     REAL NOT NULL,
      entry_time   INTEGER NOT NULL,
      exit_price   REAL,
      exit_time    INTEGER,
      status       TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'CLOSED')),
      pnl          REAL DEFAULT 0,
      pnl_percent  REAL DEFAULT 0,
      created_at   INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES user_portfolios(user_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id);
    CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
    CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(user_id, status);

    -- ────────────────────────────────────────────────────────────
    -- 3. PORTFOLIO SNAPSHOTS (portfolio_snapshots)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS portfolio_snapshots (
      id            TEXT PRIMARY KEY,
      user_id       TEXT,
      equity        REAL NOT NULL,
      cash          REAL NOT NULL,
      snapshot_date TEXT NOT NULL,
      created_at    INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES user_portfolios(user_id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_user ON portfolio_snapshots(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_snapshots_user_date ON portfolio_snapshots(user_id, snapshot_date);

    -- ────────────────────────────────────────────────────────────
    -- 4. LEARNING PROGRESS (user_progress)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS user_progress (
      id                TEXT PRIMARY KEY,
      user_id           TEXT UNIQUE,
      current_level     TEXT NOT NULL DEFAULT 'BEGINNER' CHECK(current_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED')),
      lessons_completed INTEGER NOT NULL DEFAULT 0,
      xp_points         INTEGER NOT NULL DEFAULT 0,
      badges            TEXT NOT NULL DEFAULT '[]', -- JSON string of badges
      last_updated      INTEGER NOT NULL,
      FOREIGN KEY(user_id) REFERENCES user_portfolios(user_id) ON DELETE CASCADE
    );

    -- ────────────────────────────────────────────────────────────
    -- 5. PATTERN RECOGNITION CACHE (pattern_cache)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS pattern_cache (
      id               TEXT PRIMARY KEY,
      symbol           TEXT NOT NULL,
      timeframe        TEXT NOT NULL,
      pattern_type     TEXT NOT NULL,
      confidence_score REAL,
      detected_at      INTEGER NOT NULL,
      expires_at       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_pattern_symbol_timeframe ON pattern_cache(symbol, timeframe);

    -- ────────────────────────────────────────────────────────────
    -- 6. NEWS & SENTIMENT (news_sentiment)
    -- ────────────────────────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS news_sentiment (
      id              TEXT PRIMARY KEY,
      symbol          TEXT NOT NULL,
      title           TEXT NOT NULL,
      summary         TEXT,
      sentiment_score REAL, -- -1 (bearish) to 1 (bullish)
      source          TEXT,
      published_at    INTEGER NOT NULL,
      cached_at       INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_news_symbol ON news_sentiment(symbol);
  `)

  // Expire caches older than 6 hours at start
  try {
    const now = Math.floor(Date.now() / 1000)
    db.prepare('DELETE FROM pattern_cache WHERE expires_at < ?').run(now)
    db.prepare('DELETE FROM news_sentiment WHERE cached_at < ?').run(now - 6 * 3600)
  } catch (err) {
    console.error('Failed to run database cache auto-cleanup:', err.message)
  }

  console.log('📊 Consolidated paper trading database initialized at:', DB_PATH)
}

