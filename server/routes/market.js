import { Router } from 'express'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const router = Router()

function loadMockData() {
  const raw = readFileSync(join(__dirname, '../data/mockOHLC.json'), 'utf-8')
  return JSON.parse(raw)
}

// GET /api/market/symbols
router.get('/symbols', (req, res) => {
  const { market } = req.query
  const data = loadMockData()
  const symbols = market && market !== 'All'
    ? data.symbols.filter(s => s.market === market)
    : data.symbols
  res.json({ success: true, data: symbols })
})

// GET /api/market/ohlc/:symbol
router.get('/ohlc/:symbol', (req, res) => {
  const { symbol } = req.params
  const { limit = 100 } = req.query
  const data = loadMockData()
  const candles = data.candles[symbol.toUpperCase()]
  if (!candles) {
    return res.status(404).json({ success: false, error: `Symbol ${symbol} not found` })
  }
  res.json({ success: true, symbol: symbol.toUpperCase(), data: candles.slice(-Number(limit)) })
})

// GET /api/market/scan?market=stocks&signal=bullish
router.get('/scan', (req, res) => {
  const { market = 'All', signal = 'All' } = req.query
  const data = loadMockData()

  // Return mock scan results
  const results = Object.keys(data.candles).map(sym => ({
    symbol: sym,
    lastClose: data.candles[sym].at(-1)?.close,
    patternCount: Math.floor(Math.random() * 5) + 1,
  }))

  res.json({ success: true, count: results.length, data: results })
})

export default router
