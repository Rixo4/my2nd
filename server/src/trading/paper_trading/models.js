/**
 * Data access layer — queries both local SQLite or Supabase PostgreSQL (production).
 * All methods are asynchronous to support network-based Postgres queries.
 */

import { getDb } from '../../database/init.js'
import { getSupabase, isSupabaseConfigured } from '../../database/supabase.js'
import { v4 as uuidv4 } from 'uuid'
import { nowTimestamp, roundPrice } from '../common/utils.js'

// ─── SQLite Mapper Helpers ───────────────────────────────────────────────────

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
    current_price: row.exit_price || row.entry_price,
    status: row.status, // 'OPEN' or 'CLOSED'
    opened_at: row.entry_time,
    closed_at: row.exit_time
  }
}

function projectTrades(rows) {
  const list = []
  for (const r of rows) {
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
  return list.sort((a, b) => b.executed_at - a.executed_at)
}

// ─── Portfolios ───────────────────────────────────────────────────────────────

export async function createPortfolio({ id, name = 'My Portfolio', startingBalance = 10000 } = {}) {
  const portfolioId = id || uuidv4()
  const now = nowTimestamp()

  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    
    // Check if portfolio already exists
    const existing = await getPortfolio(portfolioId)
    if (existing) return existing

    // Insert user profile mapping if not exists
    await supabase.from('profiles').insert({
      id: portfolioId,
      email: `${portfolioId.slice(0,8)}@tradewise-paper.com`,
      full_name: name
    }).select()

    const { data: port, error } = await supabase.from('portfolios').insert({
      id: portfolioId,
      user_id: portfolioId,
      name,
      starting_balance: startingBalance,
      cash_balance: startingBalance,
      total_equity: startingBalance
    }).select().single()

    if (error) throw error

    // Initialize progress tracking
    await supabase.from('academy_progress').insert({
      id: uuidv4(),
      user_id: portfolioId,
      current_level: 'BEGINNER',
      lessons_completed: 0,
      xp_points: 0,
      badges: []
    })

    return {
      id: port.id,
      user_id: port.user_id,
      name: port.name,
      starting_balance: port.starting_balance,
      cash_balance: port.cash_balance,
      total_equity: port.total_equity,
      status: 'ACTIVE',
      created_at: Math.floor(new Date(port.created_at).getTime() / 1000),
      updated_at: Math.floor(new Date(port.updated_at).getTime() / 1000)
    }
  }

  // SQLite fallback
  const db = getDb()
  const existing = await getPortfolio(portfolioId)
  if (existing) return existing

  db.prepare(`
    INSERT INTO user_portfolios (id, user_id, initial_capital, current_cash, total_equity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(portfolioId, portfolioId, startingBalance, startingBalance, startingBalance, now, now)

  db.prepare(`
    INSERT OR IGNORE INTO user_progress (id, user_id, current_level, lessons_completed, xp_points, badges, last_updated)
    VALUES (?, ?, 'BEGINNER', 0, 0, '[]', ?)
  `).run(uuidv4(), portfolioId, now)

  return getPortfolio(portfolioId)
}

export async function getPortfolio(id) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('portfolios').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      id: data.id,
      user_id: data.user_id,
      name: data.name,
      starting_balance: data.starting_balance,
      cash_balance: data.cash_balance,
      total_equity: data.total_equity,
      status: 'ACTIVE',
      created_at: Math.floor(new Date(data.created_at).getTime() / 1000),
      updated_at: Math.floor(new Date(data.updated_at).getTime() / 1000)
    }
  }

  // SQLite
  const db = getDb()
  const row = db.prepare('SELECT * FROM user_portfolios WHERE id = ?').get(id)
  return mapPortfolioRow(row)
}

export async function updatePortfolioBalance(id, cashBalance) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { error } = await supabase.from('portfolios').update({
      cash_balance: cashBalance,
      total_equity: cashBalance,
      updated_at: new Date().toISOString()
    }).eq('id', id)
    if (error) throw error
    return
  }

  // SQLite
  const db = getDb()
  const now = nowTimestamp()
  db.prepare(`
    UPDATE user_portfolios SET current_cash = ?, total_equity = ?, updated_at = ? WHERE id = ?
  `).run(cashBalance, cashBalance, now, id)
}

export async function resetPortfolioBalance(id, startingBalance) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { error } = await supabase.from('portfolios').update({
      cash_balance: startingBalance,
      starting_balance: startingBalance,
      total_equity: startingBalance,
      updated_at: new Date().toISOString()
    }).eq('id', id)
    if (error) throw error
    return
  }

  // SQLite
  const db = getDb()
  const now = nowTimestamp()
  db.prepare(`
    UPDATE user_portfolios
    SET current_cash = ?, initial_capital = ?, total_equity = ?, updated_at = ?
    WHERE id = ?
  `).run(startingBalance, startingBalance, startingBalance, now, id)
}

export async function getAllPortfolios() {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('portfolios').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data.map(d => ({
      id: d.id,
      user_id: d.user_id,
      name: d.name,
      starting_balance: d.starting_balance,
      cash_balance: d.cash_balance,
      total_equity: d.total_equity,
      status: 'ACTIVE',
      created_at: Math.floor(new Date(d.created_at).getTime() / 1000)
    }))
  }

  // SQLite
  const db = getDb()
  const rows = db.prepare('SELECT * FROM user_portfolios ORDER BY created_at DESC').all()
  return rows.map(mapPortfolioRow)
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function createPosition({ portfolioId, symbol, side, quantity, entryPrice }) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('positions').insert({
      id: uuidv4(),
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      entry_price: entryPrice,
      current_price: entryPrice,
      status: 'OPEN'
    }).select().single()

    if (error) throw error
    return {
      id: data.id,
      portfolio_id: data.portfolio_id,
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      entry_price: data.entry_price,
      current_price: data.current_price,
      status: data.status,
      opened_at: Math.floor(new Date(data.opened_at).getTime() / 1000)
    }
  }

  // SQLite
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

export async function getPositionById(id) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('positions').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      id: data.id,
      portfolio_id: data.portfolio_id,
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      entry_price: data.entry_price,
      current_price: data.current_price,
      status: data.status,
      opened_at: Math.floor(new Date(data.opened_at).getTime() / 1000),
      closed_at: data.closed_at ? Math.floor(new Date(data.closed_at).getTime() / 1000) : null
    }
  }

  // SQLite
  const db = getDb()
  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(id)
  return mapTradeToPosition(row)
}

export async function getOpenPositions(portfolioId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })

    if (error) throw error
    return data.map(d => ({
      id: d.id,
      portfolio_id: d.portfolio_id,
      symbol: d.symbol,
      side: d.side,
      quantity: d.quantity,
      entry_price: d.entry_price,
      current_price: d.current_price,
      status: d.status,
      opened_at: Math.floor(new Date(d.opened_at).getTime() / 1000)
    }))
  }

  // SQLite
  const db = getDb()
  const rows = db.prepare(`
    SELECT * FROM trades
    WHERE user_id = ? AND status = 'OPEN'
    ORDER BY entry_time DESC
  `).all(portfolioId)
  return rows.map(mapTradeToPosition)
}

export async function updatePositionCurrentPrice(id, currentPrice) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { error } = await supabase.from('positions').update({
      current_price: currentPrice
    }).eq('id', id)
    if (error) throw error
    return
  }

  // SQLite
  const db = getDb()
  db.prepare('UPDATE trades SET exit_price = ? WHERE id = ?').run(currentPrice, id)
}

export async function closePosition(id, closedAt = nowTimestamp()) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const closedTime = new Date(closedAt * 1000).toISOString()
    const { data, error } = await supabase.from('positions').update({
      status: 'CLOSED',
      closed_at: closedTime
    }).eq('id', id).select().single()

    if (error) throw error
    return {
      id: data.id,
      portfolio_id: data.portfolio_id,
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      entry_price: data.entry_price,
      current_price: data.current_price,
      status: data.status,
      opened_at: Math.floor(new Date(data.opened_at).getTime() / 1000),
      closed_at: Math.floor(new Date(data.closed_at).getTime() / 1000)
    }
  }

  // SQLite
  const db = getDb()
  db.prepare(`
    UPDATE trades SET status = 'CLOSED', exit_time = ? WHERE id = ?
  `).run(closedAt, id)
  return getPositionById(id)
}

// ─── Trades ───────────────────────────────────────────────────────────────────

export async function createTrade({ portfolioId, positionId, symbol, side, tradeType = 'MARKET', quantity, price, totalValue, pnl = 0, pnlPercent = 0 }) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('trades').insert({
      id: uuidv4(),
      portfolio_id: portfolioId,
      position_id: positionId,
      symbol: symbol.toUpperCase(),
      side,
      quantity,
      price,
      total_value: totalValue,
      pnl,
      pnl_percent: pnlPercent
    }).select().single()

    if (error) throw error
    return {
      id: data.id,
      portfolio_id: data.portfolio_id,
      position_id: data.position_id,
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      price: data.price,
      total_value: data.total_value,
      pnl: data.pnl,
      pnl_percent: data.pnl_percent,
      executed_at: Math.floor(new Date(data.executed_at).getTime() / 1000)
    }
  }

  // SQLite
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

export async function getTradeById(id) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('trades').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      id: data.id,
      portfolio_id: data.portfolio_id,
      position_id: data.position_id,
      symbol: data.symbol,
      side: data.side,
      quantity: data.quantity,
      price: data.price,
      total_value: data.total_value,
      pnl: data.pnl,
      pnl_percent: data.pnl_percent,
      executed_at: Math.floor(new Date(data.executed_at).getTime() / 1000)
    }
  }

  // SQLite
  const isBuy = id.endsWith('-buy')
  const isSell = id.endsWith('-sell')
  const baseId = isBuy ? id.slice(0, -4) : (isSell ? id.slice(0, -5) : id)

  const db = getDb()
  const row = db.prepare('SELECT * FROM trades WHERE id = ?').get(baseId)
  if (!row) return null

  const projected = projectTrades([row])
  return projected.find(t => t.id === id) || projected[0]
}

export async function getTrades(portfolioId, { symbol, limit = 50, offset = 0 } = {}) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    let query = supabase.from('trades').select('*').eq('portfolio_id', portfolioId).order('executed_at', { ascending: false })
    if (symbol) {
      query = query.eq('symbol', symbol.toUpperCase())
    }
    const { data, error } = await query.range(offset, offset + limit - 1)
    if (error) throw error
    return data.map(d => ({
      id: d.id,
      portfolio_id: d.portfolio_id,
      position_id: d.position_id,
      symbol: d.symbol,
      side: d.side,
      quantity: d.quantity,
      price: d.price,
      total_value: d.total_value,
      pnl: d.pnl,
      pnl_percent: d.pnl_percent,
      executed_at: Math.floor(new Date(d.executed_at).getTime() / 1000)
    }))
  }

  // SQLite
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

export async function getTradeCount(portfolioId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { count, error } = await supabase
      .from('trades')
      .select('*', { count: 'exact', head: true })
      .eq('portfolio_id', portfolioId)
    if (error) throw error
    return count
  }

  // SQLite
  const db = getDb()
  const rows = db.prepare('SELECT * FROM trades WHERE user_id = ?').all(portfolioId)
  return projectTrades(rows).length
}

// ─── Snapshots ────────────────────────────────────────────────────────────────

export async function createSnapshot({ portfolioId, totalValue, cashBalance, positionsValue, realizedPnl }) {
  const date = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const now = nowTimestamp()

  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { error } = await supabase.from('portfolio_snapshots').upsert({
      portfolio_id: portfolioId,
      equity: totalValue,
      cash: cashBalance,
      snapshot_date: date,
      created_at: new Date().toISOString()
    }, { onConflict: 'portfolio_id,snapshot_date' })
    
    if (error) throw error
    return
  }

  // SQLite
  const db = getDb()
  const id = uuidv4()
  db.prepare(`
    INSERT OR REPLACE INTO portfolio_snapshots
      (id, user_id, equity, cash, snapshot_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, portfolioId, totalValue, cashBalance, date, now)
}

export async function getSnapshots(portfolioId, limit = 30) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('portfolio_snapshots')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('snapshot_date', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data.map(r => ({
      id: r.id,
      portfolio_id: r.portfolio_id,
      total_value: r.equity,
      cash_balance: r.cash,
      positions_value: r.equity - r.cash,
      realized_pnl: 0,
      snapshot_date: r.snapshot_date,
      created_at: Math.floor(new Date(r.created_at).getTime() / 1000)
    }))
  }

  // SQLite
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

export async function deletePortfolioData(portfolioId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    await supabase.from('portfolio_snapshots').delete().eq('portfolio_id', portfolioId)
    await supabase.from('trades').delete().eq('portfolio_id', portfolioId)
    await supabase.from('positions').delete().eq('portfolio_id', portfolioId)
    await supabase.from('orders').delete().eq('portfolio_id', portfolioId)
    await supabase.from('academy_progress').delete().eq('user_id', portfolioId)
    await supabase.from('quiz_results').delete().eq('user_id', portfolioId)
    return
  }

  // SQLite
  const db = getDb()
  const deleteAll = db.transaction(() => {
    db.prepare('DELETE FROM portfolio_snapshots WHERE user_id = ?').run(portfolioId)
    db.prepare('DELETE FROM trades WHERE user_id = ?').run(portfolioId)
    db.prepare('DELETE FROM user_progress WHERE user_id = ?').run(portfolioId)
    db.prepare('DELETE FROM watchlists WHERE user_id = ?').run(portfolioId)
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(portfolioId)
    db.prepare('DELETE FROM settings WHERE user_id = ?').run(portfolioId)
  })
  deleteAll()
}

// ─── Watchlists, Notifications, and Settings ───────────────────────────────

export async function getWatchlist(userId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('watchlists').select('*').eq('user_id', userId)
    if (error) throw error
    return data || []
  }

  const db = getDb()
  const rows = db.prepare('SELECT * FROM watchlists WHERE user_id = ?').all(userId)
  return rows.map(r => ({ id: r.id, user_id: r.user_id, symbol: r.symbol, created_at: r.created_at }))
}

export async function getAllWatchlistItems() {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('watchlists').select('*')
    if (error) throw error
    return data || []
  }

  const db = getDb()
  const rows = db.prepare('SELECT * FROM watchlists').all()
  return rows.map(r => ({ id: r.id, user_id: r.user_id, symbol: r.symbol, created_at: r.created_at }))
}

export async function addToWatchlist(userId, symbol) {
  const now = nowTimestamp()
  const sym = symbol.toUpperCase()

  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('watchlists').insert({
      id: uuidv4(),
      user_id: userId,
      symbol: sym
    }).select().single()
    if (error && error.code !== '23505') throw error // Ignore unique constraint violation
    return data
  }

  const db = getDb()
  const id = uuidv4()
  try {
    db.prepare(`
      INSERT INTO watchlists (id, user_id, symbol, created_at)
      VALUES (?, ?, ?, ?)
    `).run(id, userId, sym, now)
  } catch (err) {
    // Ignore unique constraint violation
  }
  return { id, user_id: userId, symbol: sym, created_at: now }
}

export async function removeFromWatchlist(userId, symbol) {
  const sym = symbol.toUpperCase()

  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { error } = await supabase.from('watchlists').delete().eq('user_id', userId).eq('symbol', sym)
    if (error) throw error
    return { success: true }
  }

  const db = getDb()
  db.prepare('DELETE FROM watchlists WHERE user_id = ? AND symbol = ?').run(userId, sym)
  return { success: true }
}

export async function getUserNotifications(userId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }

  const db = getDb()
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC').all(userId)
  return rows.map(r => ({
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    message: r.message,
    read: !!r.read,
    created_at: r.created_at
  }))
}

export async function createNotification(userId, title, message) {
  const now = nowTimestamp()
  const id = uuidv4()

  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('notifications').insert({
      id,
      user_id: userId,
      title,
      message,
      read: false
    }).select().single()
    if (error) throw error
    return data
  }

  const db = getDb()
  db.prepare(`
    INSERT INTO notifications (id, user_id, title, message, read, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `).run(id, userId, title, message, now)
  return { id, user_id: userId, title, message, read: false, created_at: now }
}

export async function markNotificationRead(userId, notificationId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('notifications').update({
      read: true
    }).eq('id', notificationId).eq('user_id', userId).select().single()
    if (error) throw error
    return data
  }

  const db = getDb()
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(notificationId, userId)
  return { success: true }
}

export async function getUserSettings(userId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('settings').select('*').eq('user_id', userId).maybeSingle()
    if (error) throw error
    if (data) return data

    // If settings row missing, create default
    const { data: newSettings } = await supabase.from('settings').insert({
      user_id: userId,
      email_alerts: true,
      weekly_report: true,
      theme: 'dark'
    }).select().single()
    return newSettings
  }

  const db = getDb()
  let row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId)
  if (!row) {
    const now = nowTimestamp()
    db.prepare(`
      INSERT OR IGNORE INTO settings (user_id, email_alerts, weekly_report, theme, created_at, updated_at)
      VALUES (?, 1, 1, 'dark', ?, ?)
    `).run(userId, now, now)
    row = db.prepare('SELECT * FROM settings WHERE user_id = ?').get(userId)
  }
  return {
    user_id: row.user_id,
    email_alerts: !!row.email_alerts,
    weekly_report: !!row.weekly_report,
    theme: row.theme
  }
}

export async function updateUserSettings(userId, { email_alerts, weekly_report, theme }) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data, error } = await supabase.from('settings').upsert({
      user_id: userId,
      email_alerts: email_alerts !== undefined ? email_alerts : true,
      weekly_report: weekly_report !== undefined ? weekly_report : true,
      theme: theme || 'dark',
      updated_at: new Date().toISOString()
    }).select().single()
    if (error) throw error
    return data
  }

  const db = getDb()
  const now = nowTimestamp()
  db.prepare(`
    INSERT OR REPLACE INTO settings (user_id, email_alerts, weekly_report, theme, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    email_alerts ? 1 : 0,
    weekly_report ? 1 : 0,
    theme || 'dark',
    now,
    now
  )
  return getUserSettings(userId)
}

export async function getUserEmail(userId) {
  if (isSupabaseConfigured) {
    const supabase = getSupabase()
    const { data } = await supabase.from('profiles').select('email').eq('id', userId).maybeSingle()
    return data?.email || `${userId.slice(0, 8)}@tradewise-paper.com`
  }
  return `${userId.slice(0, 8)}@tradewise-paper.com`
}
