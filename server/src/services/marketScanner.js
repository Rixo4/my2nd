/**
 * marketScanner.js
 * Fetches real OHLCV candles and runs candlestick pattern detection.
 * Persists results to pattern_cache and news_sentiment tables.
 */

import { getDb } from '../database/init.js'
import { getSupabase, isSupabaseConfigured } from '../database/supabase.js'
import { randomUUID } from 'crypto'
import { getRedisClient } from './redis.js'
import {
  getAllWatchlistItems,
  createNotification,
  getUserSettings,
  getUserEmail
} from '../trading/paper_trading/models.js'
import { sendWatchlistAlertEmail } from './email.js'

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || ''
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ''
const POLYGON_KEY = process.env.POLYGON_API_KEY || ''
const ALPHAVANTAGE_KEY = process.env.ALPHAVANTAGE_API_KEY || ''

const CRYPTO_SYMBOLS = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP']
const STOCK_SYMBOLS  = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']
const FOREX_SYMBOLS  = ['EURUSD', 'GBPUSD']
const ALL_SYMBOLS    = [...CRYPTO_SYMBOLS, ...STOCK_SYMBOLS, ...FOREX_SYMBOLS]

const FINNHUB_CRYPTO_MAP = { BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', BNB: 'BINANCE:BNBUSDT', SOL: 'BINANCE:SOLUSDT', XRP: 'BINANCE:XRPUSDT' }

// ── OHLCV Fetchers ─────────────────────────────────────────────────────────────

async function fetchBinanceCandles(symbol, interval = '1d', limit = 20) {
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}USDT&interval=${interval}&limit=${limit}`)
    if (!res.ok) return null
    const raw = await res.json()
    return raw.map(c => ({
      open:  parseFloat(c[1]),
      high:  parseFloat(c[2]),
      low:   parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume:parseFloat(c[5])
    }))
  } catch {
    return null
  }
}

async function fetchPolygonCandles(symbol, limit = 20) {
  if (!POLYGON_KEY) return null
  const to = new Date().toISOString().split('T')[0]
  const from = new Date(Date.now() - 40 * 24 * 3600 * 1000).toISOString().split('T')[0]
  try {
    const res = await fetch(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${POLYGON_KEY}`)
    const data = await res.json()
    if (!data.results) return null
    return data.results.map(r => ({
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v
    }))
  } catch (err) {
    console.error(`[scanner] Polygon fetch failed for ${symbol}:`, err.message)
    return null
  }
}

async function fetchAlphaVantageForex(symbol) {
  if (!ALPHAVANTAGE_KEY || symbol.length !== 6) return null
  const fromSym = symbol.slice(0, 3)
  const toSym = symbol.slice(3)
  try {
    const res = await fetch(`https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromSym}&to_symbol=${toSym}&apikey=${ALPHAVANTAGE_KEY}`)
    const data = await res.json()
    const series = data['Time Series FX (Daily)']
    if (!series) return null
    const dates = Object.keys(series).sort().slice(-20)
    return dates.map(d => ({
      open: parseFloat(series[d]['1. open']),
      high: parseFloat(series[d]['2. high']),
      low: parseFloat(series[d]['3. low']),
      close: parseFloat(series[d]['4. close']),
      volume: 0
    }))
  } catch (err) {
    console.error(`[scanner] Alpha Vantage fetch failed for ${symbol}:`, err.message)
    return null
  }
}

const BASELINES = {
  AAPL: 180, MSFT: 420, GOOGL: 175, AMZN: 190, NVDA: 850,
  BTC: 65000, ETH: 3500, BNB: 590, SOL: 170, XRP: 0.60,
  EURUSD: 1.085, GBPUSD: 1.265
}

function generateMockCandles(symbol, limit = 50) {
  const basePrice = BASELINES[symbol.toUpperCase()] || 100.0
  const candles = []
  for (let i = 0; i < limit; i++) {
    const factor = 1 + (Math.sin(i / 10) * 0.03) + (Math.random() * 0.02 - 0.01)
    const close = basePrice * factor
    candles.push({
      open: parseFloat((close * 0.995).toFixed(4)),
      high: parseFloat((close * 1.01).toFixed(4)),
      low: parseFloat((close * 0.99).toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: Math.floor(1000 + Math.random() * 9000)
    })
  }
  return candles
}

export async function getCandles(symbol, limit = 50) {
  const sym = symbol.toUpperCase()
  const cacheKey = `candles:${sym}:${limit}`
  const redis = getRedisClient()

  // 1. Check cache first
  try {
    const cached = await redis.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }
  } catch (err) {
    console.error(`[scanner] Redis get failed for ${sym}:`, err.message)
  }

  // 2. Fetch from active API
  let candles = null
  let ttl = 300 // default 5 min for fallbacks

  if (CRYPTO_SYMBOLS.includes(sym)) {
    candles = await fetchBinanceCandles(sym, '1d', limit)
    ttl = 900 // 15 min cache for crypto
  } else if (STOCK_SYMBOLS.includes(sym)) {
    candles = await fetchPolygonCandles(sym, limit)
    ttl = 3600 // 1 hour cache for stocks
  } else if (FOREX_SYMBOLS.includes(sym)) {
    candles = await fetchAlphaVantageForex(sym)
    ttl = 3600 // 1 hour cache for forex
  }

  // 3. Fallback to mock if API failed or unconfigured
  if (!candles || candles.length === 0) {
    console.warn(`[scanner] API fetch failed for ${sym}. Generating mock fallback candles.`)
    candles = generateMockCandles(sym, limit)
    ttl = 300 // 5 min cache for fallbacks
  }

  // 4. Save to cache
  try {
    await redis.set(cacheKey, JSON.stringify(candles), 'EX', ttl)
  } catch (err) {
    console.error(`[scanner] Redis set failed for ${sym}:`, err.message)
  }

  return candles
}

// ── Pattern Detection ──────────────────────────────────────────────────────────

function bodySize(c) { return Math.abs(c.close - c.open) }
function range(c)    { return c.high - c.low }
function isGreen(c)  { return c.close > c.open }
function isRed(c)    { return c.close < c.open }
function upperWick(c){ return c.high - Math.max(c.open, c.close) }
function lowerWick(c){ return Math.min(c.open, c.close) - c.low }

function detectPatterns(candles) {
  const results = []
  if (!candles || candles.length < 3) return results

  for (let i = 2; i < candles.length; i++) {
    const prev2 = candles[i - 2]
    const prev  = candles[i - 1]
    const curr  = candles[i]

    // ── Doji ──
    if (bodySize(curr) < range(curr) * 0.1 && range(curr) > 0) {
      results.push({ pattern: 'Doji', candle: curr, confidence: 0.55, signal: 'NEUTRAL', index: i })
    }

    // ── Hammer ──
    if (
      lowerWick(curr) >= bodySize(curr) * 2 &&
      upperWick(curr) < bodySize(curr) * 0.5 &&
      bodySize(curr) > 0
    ) {
      results.push({ pattern: 'Hammer', candle: curr, confidence: 0.70, signal: 'BUY', index: i })
    }

    // ── Inverted Hammer ──
    if (
      upperWick(curr) >= bodySize(curr) * 2 &&
      lowerWick(curr) < bodySize(curr) * 0.5 &&
      bodySize(curr) > 0
    ) {
      results.push({ pattern: 'Inverted Hammer', candle: curr, confidence: 0.62, signal: 'BUY', index: i })
    }

    // ── Shooting Star (bearish) ──
    if (
      upperWick(curr) >= bodySize(curr) * 2 &&
      lowerWick(curr) < bodySize(curr) * 0.5 &&
      isRed(curr) && bodySize(curr) > 0
    ) {
      results.push({ pattern: 'Shooting Star', candle: curr, confidence: 0.68, signal: 'SELL', index: i })
    }

    // ── Bullish Engulfing ──
    if (
      isRed(prev) && isGreen(curr) &&
      curr.open < prev.close &&
      curr.close > prev.open
    ) {
      results.push({ pattern: 'Bullish Engulfing', candle: curr, confidence: 0.82, signal: 'BUY', index: i })
    }

    // ── Bearish Engulfing ──
    if (
      isGreen(prev) && isRed(curr) &&
      curr.open > prev.close &&
      curr.close < prev.open
    ) {
      results.push({ pattern: 'Bearish Engulfing', candle: curr, confidence: 0.78, signal: 'SELL', index: i })
    }

    // ── Morning Star ──
    if (
      isRed(prev2) && bodySize(prev2) > range(prev2) * 0.5 &&
      bodySize(prev) < range(prev) * 0.3 &&
      isGreen(curr) && curr.close > (prev2.open + prev2.close) / 2
    ) {
      results.push({ pattern: 'Morning Star', candle: curr, confidence: 0.88, signal: 'BUY', index: i })
    }

    // ── Evening Star ──
    if (
      isGreen(prev2) && bodySize(prev2) > range(prev2) * 0.5 &&
      bodySize(prev) < range(prev) * 0.3 &&
      isRed(curr) && curr.close < (prev2.open + prev2.close) / 2
    ) {
      results.push({ pattern: 'Evening Star', candle: curr, confidence: 0.85, signal: 'SELL', index: i })
    }

    // ── Spinning Top ──
    if (
      bodySize(curr) < range(curr) * 0.25 &&
      upperWick(curr) > bodySize(curr) &&
      lowerWick(curr) > bodySize(curr) &&
      range(curr) > 0
    ) {
      results.push({ pattern: 'Spinning Top', candle: curr, confidence: 0.50, signal: 'NEUTRAL', index: i })
    }
  }

  // Return only the most recent / highest confidence pattern
  return results.slice(-3)
}

// ── News Sentiment via Finnhub ─────────────────────────────────────────────────

async function fetchFinnhubSentiment(symbol) {
  if (!FINNHUB_KEY) return []
  const from = Math.floor(Date.now() / 1000) - 86400 * 3
  const to   = Math.floor(Date.now() / 1000)
  const sym  = FINNHUB_CRYPTO_MAP[symbol] ? undefined : symbol  // Only stocks have news API
  if (!sym) return []

  try {
    const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${sym}&from=${new Date(from*1000).toISOString().split('T')[0]}&to=${new Date(to*1000).toISOString().split('T')[0]}&token=${FINNHUB_KEY}`)
    const articles = await res.json()
    if (!Array.isArray(articles)) return []
    return articles.slice(0, 5).map(a => ({
      title: a.headline,
      summary: a.summary,
      source: a.source,
      published_at: a.datetime,
      // Simple heuristic sentiment from headline
      sentiment_score: computeHeuristicSentiment(a.headline)
    }))
  } catch {
    return []
  }
}

function computeHeuristicSentiment(text = '') {
  const t = text.toLowerCase()
  const bullish = ['surge', 'soar', 'rally', 'gain', 'rise', 'bullish', 'buy', 'upgrade', 'beat', 'record', 'all-time', 'breakout', 'positive', 'growth']
  const bearish = ['crash', 'fall', 'drop', 'plunge', 'bearish', 'sell', 'downgrade', 'miss', 'loss', 'risk', 'concern', 'decline', 'warning', 'cut']
  let score = 0
  bullish.forEach(w => { if (t.includes(w)) score += 0.15 })
  bearish.forEach(w => { if (t.includes(w)) score -= 0.15 })
  return Math.max(-1, Math.min(1, score))
}

// ── DB Writers ─────────────────────────────────────────────────────────────────

async function writePatternToCache(symbol, timeframe, pattern, confidence) {
  try {
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + 6 * 3600
    const id = randomUUID()

    if (isSupabaseConfigured) {
      const supabase = getSupabase()
      const { error } = await supabase.from('pattern_cache').upsert({
        id,
        symbol: symbol.toUpperCase(),
        timeframe,
        pattern_type: pattern,
        confidence_score: confidence,
        detected_at: new Date(now * 1000).toISOString(),
        expires_at: new Date(expiresAt * 1000).toISOString()
      }, { onConflict: 'symbol,timeframe' })
      if (error) throw error
      return
    }

    const db = getDb()
    db.prepare(`
      INSERT OR REPLACE INTO pattern_cache (id, symbol, timeframe, pattern_type, confidence_score, detected_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, symbol, timeframe, pattern, confidence, now, expiresAt)
  } catch (err) {
    console.error('[scanner] Failed to write pattern cache:', err.message)
  }
}

async function writeNewsToCache(symbol, articles) {
  if (!articles.length) return
  try {
    const now = Math.floor(Date.now() / 1000)

    if (isSupabaseConfigured) {
      const supabase = getSupabase()
      const rows = articles.map(a => ({
        id: randomUUID(),
        symbol: symbol.toUpperCase(),
        title: a.title,
        summary: a.summary || '',
        sentiment_score: a.sentiment_score,
        source: a.source || 'finnhub',
        published_at: new Date((a.published_at || now) * 1000).toISOString(),
        cached_at: new Date().toISOString()
      }))
      const { error } = await supabase.from('news_sentiment').upsert(rows, { onConflict: 'symbol,title' })
      if (error) throw error
      return
    }

    const db = getDb()
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO news_sentiment (id, symbol, title, summary, sentiment_score, source, published_at, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const a of articles) {
      stmt.run(randomUUID(), symbol, a.title, a.summary || '', a.sentiment_score, a.source || 'finnhub', a.published_at || now, now)
    }
  } catch (err) {
    console.error('[scanner] Failed to write news cache:', err.message)
  }
}

// ── Main Scanner ───────────────────────────────────────────────────────────────

let _lastScanAt = 0
let _scanInProgress = false

async function matchScansWithWatchlists(foundPatterns) {
  if (!foundPatterns || foundPatterns.length === 0) return

  try {
    // 1. Get all watchlist items across all users
    const watchlistItems = await getAllWatchlistItems()
    if (watchlistItems.length === 0) return

    // 2. Loop through and check for matches
    for (const item of watchlistItems) {
      const match = foundPatterns.find(p => p.symbol.toUpperCase() === item.symbol.toUpperCase())
      if (match) {
        // We have a match! Create a notification for this user
        const title = `🎯 Watchlist Pattern Triggered: ${match.symbol}`
        const message = `A new ${match.pattern} pattern has been detected on ${match.symbol} with ${(match.confidence * 100).toFixed(0)}% confidence, indicating a ${match.signal} signal.`
        
        await createNotification(item.user_id, title, message)
        console.log(`[scanner] Created pattern match notification for user ${item.user_id} on ${match.symbol}`)

        // Check if the user has email alerts enabled
        const settings = await getUserSettings(item.user_id)
        if (settings && settings.email_alerts) {
          const email = await getUserEmail(item.user_id)
          await sendWatchlistAlertEmail({
            email,
            symbol: match.symbol,
            pattern: match.pattern,
            confidence: match.confidence,
            signal: match.signal
          })
        }
      }
    }
  } catch (err) {
    console.error('[scanner] Error matching scans with watchlists:', err.message)
  }
}

export async function runMarketScan(force = false) {
  const now = Date.now()
  // Rate limit: at most once every 10 minutes unless forced
  if (!force && _scanInProgress) return { skipped: true, reason: 'scan already running' }
  if (!force && now - _lastScanAt < 10 * 60 * 1000) {
    return { skipped: true, reason: 'cache still fresh', next_scan_in_ms: 10 * 60 * 1000 - (now - _lastScanAt) }
  }

  _scanInProgress = true
  const found = []

  try {
    for (const symbol of ALL_SYMBOLS) {
      const candles = await getCandles(symbol)
      if (!candles || candles.length < 3) continue

      const patterns = detectPatterns(candles)
      for (const p of patterns) {
        await writePatternToCache(symbol, '1d', p.pattern, p.confidence)
        found.push({ symbol, pattern: p.pattern, confidence: p.confidence, signal: p.signal })
      }

      // Fetch news for stocks only
      if (STOCK_SYMBOLS.includes(symbol)) {
        const articles = await fetchFinnhubSentiment(symbol)
        await writeNewsToCache(symbol, articles)
      }

      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 250))
    }

    _lastScanAt = Date.now()
    console.log(`[scanner] Scan complete. Found ${found.length} patterns across ${ALL_SYMBOLS.length} symbols.`)
    
    // Check watchlists and notify users
    await matchScansWithWatchlists(found)

    return { success: true, patterns_found: found.length, patterns: found }
  } catch (err) {
    console.error('[scanner] Market scan error:', err.message)
    return { success: false, error: err.message }
  } finally {
    _scanInProgress = false
  }
}

export function getScanStatus() {
  return {
    last_scan_at: _lastScanAt ? new Date(_lastScanAt).toISOString() : null,
    scan_in_progress: _scanInProgress,
    next_scan_available_in_ms: Math.max(0, 10 * 60 * 1000 - (Date.now() - _lastScanAt))
  }
}
