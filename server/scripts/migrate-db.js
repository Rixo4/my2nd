import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, existsSync } from 'fs'
import { initDatabase } from '../src/database/init.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, '../data/paper_trading.db')
const BACKUP_PATH = join(__dirname, '../data/paper_trading_backup.db')

function runMigration() {
  console.log('🔄 Starting TradeWise Database Migration...')

  if (!existsSync(DB_PATH)) {
    console.log('ℹ️ No existing database file found. Initializing fresh consolidated DB.')
    initDatabase()
    console.log('✅ Fresh consolidated DB initialized.')
    return
  }

  // Make a backup copy of the existing database first
  try {
    copyFileSync(DB_PATH, BACKUP_PATH)
    console.log(`💾 Backup of database created at: ${BACKUP_PATH}`)
  } catch (err) {
    console.error('❌ Failed to create database backup:', err.message)
    process.exit(1)
  }

  const db = new Database(DB_PATH)

  // Verify if old tables exist to migrate
  let tablesExist = false
  try {
    const check = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='paper_portfolios'").get()
    if (check) tablesExist = true
  } catch (err) {
    console.error('Error checking database status:', err.message)
  }

  if (!tablesExist) {
    console.log('ℹ️ Old database schema not detected or already migrated. Initializing new schema (if needed).')
    db.close()
    initDatabase()
    console.log('✅ DB Schema updated.')
    return
  }

  console.log('📦 Reading existing data from old schema tables...')
  let portfolios = []
  let positions = []
  let trades = []
  let snapshots = []

  try {
    portfolios = db.prepare('SELECT * FROM paper_portfolios').all()
    positions = db.prepare('SELECT * FROM paper_positions').all()
    trades = db.prepare('SELECT * FROM paper_trades').all()
    snapshots = db.prepare('SELECT * FROM paper_portfolio_snapshots').all()
    console.log(`Loaded: ${portfolios.length} portfolios, ${positions.length} positions, ${trades.length} trades, ${snapshots.length} snapshots.`)
  } catch (err) {
    console.error('❌ Failed to load old data:', err.message)
    db.close()
    process.exit(1)
  }

  // Rename/drop old tables to make room for the new schema
  console.log('🗑️ Dropping old tables...')
  try {
    db.exec(`
      DROP TABLE IF EXISTS paper_portfolio_snapshots;
      DROP TABLE IF EXISTS paper_trades;
      DROP TABLE IF EXISTS paper_positions;
      DROP TABLE IF EXISTS paper_portfolios;
    `)
  } catch (err) {
    console.error('❌ Failed to drop old tables:', err.message)
    db.close()
    process.exit(1)
  }

  db.close()

  // Initialize consolidated schema
  console.log('🔨 Creating new consolidated tables...')
  initDatabase()

  // Re-open DB for insert
  const newDb = new Database(DB_PATH)

  console.log('🚀 Migrating portfolios to user_portfolios...')
  const insertPortfolio = newDb.prepare(`
    INSERT INTO user_portfolios (id, user_id, initial_capital, current_cash, total_equity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  newDb.transaction(() => {
    for (const port of portfolios) {
      // In the new schema, user_id is UNIQUE. If it's undefined, use id.
      // Usually, user_id is the user's login UID, but if not set we use port.id
      const userId = port.id
      insertPortfolio.run(
        port.id,
        userId,
        port.starting_balance,
        port.cash_balance,
        port.cash_balance, // initial equity estimate
        port.created_at,
        port.updated_at
      )
    }
  })()

  console.log('🚀 Migrating positions and trades to trades table...')
  const insertTrade = newDb.prepare(`
    INSERT INTO trades (id, user_id, symbol, type, entry_price, quantity, entry_time, exit_price, exit_time, status, pnl, pnl_percent, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  newDb.transaction(() => {
    // 1. Process positions (representing either OPEN trades or CLOSED positions)
    for (const pos of positions) {
      // Find matching SELL trade in paper_trades if closed
      let exitPrice = null
      let exitTime = null
      let pnl = 0
      let pnlPercent = 0

      if (pos.status === 'CLOSED') {
        const sellTrade = trades.find(t => t.position_id === pos.id && t.side === 'SELL')
        if (sellTrade) {
          exitPrice = sellTrade.price
          exitTime = sellTrade.executed_at
          pnl = sellTrade.pnl || 0
          pnlPercent = sellTrade.pnl_percent || 0
        } else {
          exitPrice = pos.current_price || pos.entry_price
          exitTime = pos.closed_at || Math.floor(Date.now() / 1000)
        }
      }

      insertTrade.run(
        pos.id,
        pos.portfolio_id, // maps to user_id (which is equal to portfolio_id here)
        pos.symbol,
        'BUY', // entry side is BUY (long trades)
        pos.entry_price,
        pos.quantity,
        pos.opened_at,
        exitPrice,
        exitTime,
        pos.status,
        pnl,
        pnlPercent,
        pos.opened_at
      )
    }

    // 2. Process any paper_trades that don't belong to any positions (e.g. standalone records)
    for (const t of trades) {
      const posExists = positions.some(p => p.id === t.position_id)
      if (!posExists) {
        // standalone trade, insert as a completed trade record
        insertTrade.run(
          t.id,
          t.portfolio_id,
          t.symbol,
          t.side,
          t.price,
          t.quantity,
          t.executed_at,
          t.price,
          t.executed_at,
          'CLOSED',
          t.pnl || 0,
          t.pnl_percent || 0,
          t.executed_at
        )
      }
    }
  })()

  console.log('🚀 Migrating snapshots to portfolio_snapshots...')
  const insertSnapshot = newDb.prepare(`
    INSERT INTO portfolio_snapshots (id, user_id, equity, cash, snapshot_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  newDb.transaction(() => {
    for (const snap of snapshots) {
      insertSnapshot.run(
        snap.id,
        snap.portfolio_id,
        snap.total_value,
        snap.cash_balance,
        snap.snapshot_date,
        snap.created_at
      )
    }
  })()

  console.log('🚀 Initializing empty progress table for existing portfolios...')
  const insertProgress = newDb.prepare(`
    INSERT OR IGNORE INTO user_progress (id, user_id, current_level, lessons_completed, xp_points, badges, last_updated)
    VALUES (?, ?, 'BEGINNER', 0, 0, '[]', ?)
  `)
  newDb.transaction(() => {
    for (const port of portfolios) {
      insertProgress.run(port.id, port.id, Math.floor(Date.now() / 1000))
    }
  })()

  newDb.close()
  console.log('✅ TradeWise Database Migration Completed Successfully!')
}

runMigration()
