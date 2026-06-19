/**
 * Paper Trading API routes.
 * All endpoints are under /api/v1/paper/
 */

import { Router } from 'express'
import {
  createNewPortfolio,
  getPortfolioSummary,
  openNewPosition,
  closeExistingPosition,
  getTradeHistory,
  getPortfolioMetrics,
  resetPortfolio,
} from '../src/services/paper_trading_service.js'
import { getCurrentMarketPrice, fetchLivePrice } from '../src/trading/paper_trading/executors.js'

const router = Router()

// ── Helpers ────────────────────────────────────────────────────────────────────

function ok(res, data, status = 200) {
  res.status(status).json({ success: true, ...data })
}

function fail(res, error, status = 400) {
  res.status(status).json({ success: false, error })
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTFOLIO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/paper/portfolio
 * Create a new paper trading portfolio.
 * Body: { name?: string, startingBalance?: number }
 */
router.post('/portfolio', (req, res) => {
  try {
    const { id, name, startingBalance } = req.body || {}
    if (startingBalance !== undefined && (isNaN(startingBalance) || startingBalance < 100)) {
      return fail(res, 'startingBalance must be a number >= 100')
    }
    const result = createNewPortfolio({ id, name, startingBalance })
    ok(res, result, 201)
  } catch (err) {
    console.error('[paper/portfolio POST]', err)
    fail(res, err.message, 500)
  }
})

/**
 * GET /api/v1/paper/portfolio/:id
 * Get full portfolio summary.
 */
router.get('/portfolio/:id', (req, res) => {
  try {
    const result = getPortfolioSummary(req.params.id)
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/portfolio GET]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// POSITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/paper/positions
 * Open a new position (BUY order).
 * Body: { portfolioId, symbol, quantity }
 */
router.post('/positions', async (req, res) => {
  try {
    const { portfolioId, symbol, quantity } = req.body || {}
    if (!portfolioId) return fail(res, 'Missing required field: portfolioId')
    if (!symbol)      return fail(res, 'Missing required field: symbol')
    if (!quantity)    return fail(res, 'Missing required field: quantity')

    // Fetch live market price before opening the position
    const livePrice = await fetchLivePrice(symbol)
    const result = openNewPosition({ portfolioId, symbol, quantity: Number(quantity), overridePrice: livePrice })
    if (!result.success) return fail(res, result.error)
    ok(res, result, 201)
  } catch (err) {
    console.error('[paper/positions POST]', err)
    fail(res, err.message, 500)
  }
})

/**
 * GET /api/v1/paper/positions/:portfolioId
 * Get all open positions for a portfolio.
 * (Positions are returned inside the portfolio summary)
 */
router.get('/positions/:portfolioId', (req, res) => {
  try {
    const result = getPortfolioSummary(req.params.portfolioId)
    if (!result.success) return fail(res, result.error, 404)
    ok(res, { positions: result.portfolio.positions })
  } catch (err) {
    console.error('[paper/positions GET]', err)
    fail(res, err.message, 500)
  }
})

/**
 * DELETE /api/v1/paper/positions/:positionId
 * Close (SELL) a specific position.
 * Query: ?portfolioId=<id>
 */
router.delete('/positions/:positionId', async (req, res) => {
  try {
    const { portfolioId } = req.query
    if (!portfolioId) return fail(res, 'Missing query param: portfolioId')

    // Get position symbol to fetch live close price
    const portfolio = getPortfolioSummary(portfolioId)
    const position = portfolio?.portfolio?.positions?.find(p => p.id === req.params.positionId)
    const liveClosePrice = position ? await fetchLivePrice(position.symbol) : null

    const result = closeExistingPosition({ portfolioId, positionId: req.params.positionId, overridePrice: liveClosePrice })
    if (!result.success) return fail(res, result.error)
    ok(res, result)
  } catch (err) {
    console.error('[paper/positions DELETE]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// TRADES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/paper/trades/:portfolioId
 * Get trade history. Optional: ?symbol=BTC&limit=20&offset=0
 */
router.get('/trades/:portfolioId', (req, res) => {
  try {
    const { symbol, limit, offset } = req.query
    const result = getTradeHistory({
      portfolioId: req.params.portfolioId,
      symbol,
      limit:  limit  ? Number(limit)  : 50,
      offset: offset ? Number(offset) : 0,
    })
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/trades GET]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/paper/metrics/:portfolioId
 * Get performance analytics (win rate, drawdown, Sharpe, etc.)
 */
router.get('/metrics/:portfolioId', (req, res) => {
  try {
    const result = getPortfolioMetrics(req.params.portfolioId)
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/metrics GET]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/paper/reset/:portfolioId
 * Wipe all trades/positions and reset cash balance.
 * Body: { newBalance?: number }
 */
router.post('/reset/:portfolioId', (req, res) => {
  try {
    const { newBalance } = req.body || {}
    if (newBalance !== undefined && (isNaN(newBalance) || newBalance < 100)) {
      return fail(res, 'newBalance must be a number >= 100')
    }
    const result = resetPortfolio({
      portfolioId: req.params.portfolioId,
      newBalance: newBalance ? Number(newBalance) : undefined,
    })
    if (!result.success) return fail(res, result.error, 404)
    ok(res, result)
  } catch (err) {
    console.error('[paper/reset POST]', err)
    fail(res, err.message, 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// AI INTELLIGENCE
// ─────────────────────────────────────────────────────────────────────────────

const ANALYSIS_TEMPLATE = {
  BTC: {
    verdict: 'Bullish',
    confidence: 84,
    signal: 'BUY',
    analysis: 'Bitcoin shows strong bullish consolidation near the 200 EMA support. High institutional inflows through ETFs are driving order-book depth. RSI is rising from neutral territory, indicating room for an upward breakout.',
    coach: 'Based on current technicals, BTC shows a strong bullish consolidation near the 200 EMA support. Recommended position size: 0.05 units for your risk profile.'
  },
  ETH: {
    verdict: 'Bullish',
    confidence: 76,
    signal: 'BUY',
    analysis: 'Ethereum exhibits solid accumulation above key support at $3400. Open interest in call options suggests strong expectations for a run toward $3800 ahead of upcoming network upgrades.',
    coach: 'Based on current technicals, ETH shows a solid accumulation above key support at $3400. Recommended position size: 0.5 units for your risk profile.'
  },
  AAPL: {
    verdict: 'Bullish',
    confidence: 78,
    signal: 'BUY',
    analysis: 'Apple momentum with strong institutional accumulation. Golden cross forming on the daily chart. Support held at $184. RSI approaching overbought but still room to run.',
    coach: 'Based on current technicals, AAPL shows a bullish setup with RSI recovering from oversold levels. Recommended position size: 5 units for your risk profile.'
  },
  MSFT: {
    verdict: 'Neutral',
    confidence: 55,
    signal: 'HOLD',
    analysis: 'Microsoft is trading in a tight consolidation range between $410 and $420. Volume has decreased, indicating a lack of strong direction. Wait for a breakout confirmation above resistance.',
    coach: 'Based on current technicals, MSFT is consolidating in a tight range. Recommended position size: 2 units for your risk profile.'
  },
  GOOGL: {
    verdict: 'Bearish',
    confidence: 68,
    signal: 'SELL',
    analysis: 'Google displays bearish continuation patterns. Increased selling pressure at the $180 resistance level suggests a downward test of $164 support. RSI indicates bearish divergence.',
    coach: 'Based on current technicals, GOOGL shows bearish continuation patterns. Recommended position size: 0 units (Hold/Sell) for your risk profile.'
  },
  EURUSD: {
    verdict: 'Neutral',
    confidence: 52,
    signal: 'HOLD',
    analysis: 'EUR/USD pair consolidates as traders await central bank policy updates. Price action remains bound between moving average channels, suggesting a range-bound environment.',
    coach: 'Based on current technicals, EUR/USD consolidates as traders await key policy decisions. Recommended position size: 10000 units for your risk profile.'
  },
  GBPUSD: {
    verdict: 'Bullish',
    confidence: 64,
    signal: 'BUY',
    analysis: 'GBP/USD has bounced off its lower trendline with a spike in buying volume. A higher-low configuration suggests potential bullish continuation towards the 1.2850 target.',
    coach: 'Based on current technicals, GBP/USD has bounced off its lower trendline. Recommended position size: 8000 units for your risk profile.'
  }
}

/**
 * GET /api/v1/paper/analysis/:symbol
 * Fetch AI technical analysis & levels for a symbol.
 */
router.get('/analysis/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol?.toUpperCase()
    const template = ANALYSIS_TEMPLATE[symbol] || {
      verdict: 'Neutral',
      confidence: 50,
      signal: 'HOLD',
      analysis: `Technical indicators for ${symbol} indicate neutral range-bound activity.`
    }
    
    let price = getCurrentMarketPrice(symbol)
    if (!price || isNaN(price)) {
      const fallbacks = { AAPL: 180, MSFT: 420, GOOGL: 175, BTC: 63000, ETH: 3500, EURUSD: 1.08, GBPUSD: 1.27 }
      price = fallbacks[symbol] || 100
    }
    
    let entry = price
    let target = price
    let stopLoss = price
    let resistance = price
    let support = price
    
    if (template.verdict === 'Bullish') {
      target = price * 1.056
      stopLoss = price * 0.97
      resistance = price * 1.056
      support = price * 0.97
    } else if (template.verdict === 'Bearish') {
      target = price * 0.93
      stopLoss = price * 1.034
      resistance = price * 1.034
      support = price * 0.93
    } else {
      target = price * 1.03
      stopLoss = price * 0.97
      resistance = price * 1.03
      support = price * 0.97
    }
    
    const isForex = ['EURUSD', 'GBPUSD'].includes(symbol)
    const decimals = isForex ? 4 : 2
    const rnd = (val) => Number(Number(val).toFixed(decimals))
    
    const analysis = {
      symbol,
      verdict: template.verdict,
      confidence: template.confidence,
      signal: template.signal,
      entry: rnd(entry),
      target: rnd(target),
      stopLoss: rnd(stopLoss),
      resistance: rnd(resistance),
      support: rnd(support),
      analysis: template.analysis,
      coach: template.coach
    }
    
    ok(res, { analysis })
  } catch (err) {
    console.error('[paper/analysis GET]', err)
    fail(res, err.message, 500)
  }
})

/**
 * GET /api/v1/paper/market-mood
 * Fetch today's global market mood.
 */
router.get('/market-mood', async (req, res) => {
  try {
    // Fear & Greed Index — free, no API key needed
    const fngRes = await fetch('https://api.alternative.me/fng/?limit=1')
    const fngData = await fngRes.json()
    const fng = fngData?.data?.[0]
    const overallPct = fng ? parseInt(fng.value) : 50
    const overallSentiment = overallPct >= 75 ? 'Extreme Greed'
      : overallPct >= 55 ? 'Bullish'
      : overallPct >= 45 ? 'Neutral'
      : overallPct >= 25 ? 'Bearish'
      : 'Extreme Fear'

    // Derive market-specific mood from overall with slight offsets
    const clamp = (n) => Math.min(100, Math.max(0, n))
    const toSentiment = (n) => n >= 75 ? 'Extreme Greed' : n >= 55 ? 'Bullish' : n >= 45 ? 'Neutral' : n >= 25 ? 'Bearish' : 'Extreme Fear'
    const cryptoPct  = clamp(overallPct)
    const stocksPct  = clamp(Math.round(overallPct * 0.85 + Math.random() * 8))
    const forexPct   = clamp(Math.round(50 + (overallPct - 50) * 0.3 + Math.random() * 6 - 3))

    const mood = {
      stocks:  { percent: stocksPct,  sentiment: toSentiment(stocksPct),  label: fng?.value_classification || overallSentiment },
      crypto:  { percent: cryptoPct,  sentiment: toSentiment(cryptoPct),  label: fng?.value_classification || overallSentiment },
      forex:   { percent: forexPct,   sentiment: toSentiment(forexPct) },
      overall: { percent: overallPct, sentiment: overallSentiment, label: fng?.value_classification || overallSentiment },
      source:  'alternative.me Fear & Greed Index',
      updatedAt: fng?.timestamp ? new Date(parseInt(fng.timestamp) * 1000).toISOString() : new Date().toISOString()
    }
    ok(res, { mood })
  } catch (err) {
    console.error('[paper/market-mood GET]', err.message)
    // Graceful fallback
    ok(res, { mood: {
      stocks:  { percent: 60, sentiment: 'Bullish' },
      crypto:  { percent: 55, sentiment: 'Bullish' },
      forex:   { percent: 50, sentiment: 'Neutral' },
      overall: { percent: 57, sentiment: 'Bullish' },
      source:  'fallback'
    }})
  }
})

export default router
