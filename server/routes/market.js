import { Router } from 'express'

const router = Router()

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || ''
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ''

// Supported symbol configs
const SYMBOL_CONFIG = {
  // Stocks
  AAPL:     { type: 'stock',  tdSymbol: 'AAPL',     label: 'Apple Inc.',       market: 'stocks' },
  MSFT:     { type: 'stock',  tdSymbol: 'MSFT',      label: 'Microsoft Corp.',  market: 'stocks' },
  GOOGL:    { type: 'stock',  tdSymbol: 'GOOGL',     label: 'Alphabet Inc.',    market: 'stocks' },
  AMZN:     { type: 'stock',  tdSymbol: 'AMZN',      label: 'Amazon.com Inc.',  market: 'stocks' },
  TSLA:     { type: 'stock',  tdSymbol: 'TSLA',      label: 'Tesla Inc.',       market: 'stocks' },
  NVDA:     { type: 'stock',  tdSymbol: 'NVDA',      label: 'Nvidia Corp.',     market: 'stocks' },
  META:     { type: 'stock',  tdSymbol: 'META',      label: 'Meta Platforms',   market: 'stocks' },
  RELIANCE: { type: 'stock',  tdSymbol: 'RELIANCE.NS', label: 'Reliance (NSE)', market: 'stocks' },
  TCS:      { type: 'stock',  tdSymbol: 'TCS.NS',    label: 'TCS (NSE)',        market: 'stocks' },
  INFY:     { type: 'stock',  tdSymbol: 'INFY',      label: 'Infosys (NSE)',    market: 'stocks' },
  // Crypto
  BTC:      { type: 'crypto', tdSymbol: 'BTC/USD',   label: 'Bitcoin',          market: 'crypto' },
  ETH:      { type: 'crypto', tdSymbol: 'ETH/USD',   label: 'Ethereum',         market: 'crypto' },
  SOL:      { type: 'crypto', tdSymbol: 'SOL/USD',   label: 'Solana',           market: 'crypto' },
  BNB:      { type: 'crypto', tdSymbol: 'BNB/USD',   label: 'BNB',              market: 'crypto' },
  XRP:      { type: 'crypto', tdSymbol: 'XRP/USD',   label: 'Ripple',           market: 'crypto' },
  ADA:      { type: 'crypto', tdSymbol: 'ADA/USD',   label: 'Cardano',          market: 'crypto' },
  DOT:      { type: 'crypto', tdSymbol: 'DOT/USD',   label: 'Polkadot',         market: 'crypto' },
  AVAX:     { type: 'crypto', tdSymbol: 'AVAX/USD',  label: 'Avalanche',        market: 'crypto' },
  DOGE:     { type: 'crypto', tdSymbol: 'DOGE/USD',  label: 'Dogecoin',         market: 'crypto' },
  MATIC:    { type: 'crypto', tdSymbol: 'MATIC/USD', label: 'Polygon',          market: 'crypto' },
  // Forex
  EURUSD:   { type: 'forex',  tdSymbol: 'EUR/USD',   label: 'EUR / USD',        market: 'forex'  },
  GBPUSD:   { type: 'forex',  tdSymbol: 'GBP/USD',   label: 'GBP / USD',        market: 'forex'  },
  USDJPY:   { type: 'forex',  tdSymbol: 'USD/JPY',   label: 'USD / JPY',        market: 'forex'  },
  AUDUSD:   { type: 'forex',  tdSymbol: 'AUD/USD',   label: 'AUD / USD',        market: 'forex'  },
  USDCAD:   { type: 'forex',  tdSymbol: 'USD/CAD',   label: 'USD / CAD',        market: 'forex'  },
  USDCHF:   { type: 'forex',  tdSymbol: 'USD/CHF',   label: 'USD / CHF',        market: 'forex'  },
  NZDUSD:   { type: 'forex',  tdSymbol: 'NZD/USD',   label: 'NZD / USD',        market: 'forex'  },
  EURGBP:   { type: 'forex',  tdSymbol: 'EUR/GBP',   label: 'EUR / GBP',        market: 'forex'  },
}

// Map app timeframes → Twelve Data intervals
function mapTF(tf) {
  const m = { '1m':'1min','5m':'5min','15m':'15min','1h':'1h','4h':'4h','1d':'1day','1w':'1week' }
  return m[tf] || '1day'
}

// ── GET /api/market/symbols ──────────────────────────────────────────────────
router.get('/symbols', (req, res) => {
  const { market } = req.query
  const symbols = Object.entries(SYMBOL_CONFIG).map(([id, cfg]) => ({
    id,
    label: cfg.label,
    market: cfg.market
  }))
  const filtered = market && market !== 'All'
    ? symbols.filter(s => s.market === market)
    : symbols
  res.json({ success: true, data: filtered })
})

// ── GET /api/market/ohlc/:symbol ─────────────────────────────────────────────
router.get('/ohlc/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase()
  const { limit = 100, timeframe = '1d' } = req.query
  const cfg = SYMBOL_CONFIG[sym]

  if (!cfg) {
    return res.status(404).json({ success: false, error: `Symbol ${sym} not found` })
  }

  // Crypto uses Binance REST (no API key needed)
  if (cfg.type === 'crypto') {
    try {
      const binanceSym = sym + 'USDT'
      const interval = mapTF(timeframe)
      const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSym}&interval=${interval}&limit=${limit}`
      const raw = await fetch(url)
      const data = await raw.json()
      if (Array.isArray(data)) {
        const candles = data.map(d => ({
          time:   Math.floor(d[0] / 1000),
          open:   parseFloat(d[1]),
          high:   parseFloat(d[2]),
          low:    parseFloat(d[3]),
          close:  parseFloat(d[4]),
          volume: parseFloat(d[5]),
        }))
        return res.json({ success: true, symbol: sym, source: 'binance', data: candles })
      }
    } catch (err) {
      console.error('[market/ohlc crypto]', err.message)
    }
  }

  // Stocks & Forex use Twelve Data
  if (!TWELVE_DATA_KEY) {
    return res.status(503).json({ success: false, error: 'TWELVE_DATA_API_KEY not configured in server/.env' })
  }

  try {
    const interval = mapTF(timeframe)
    const url = `https://api.twelvedata.com/time_series?symbol=${cfg.tdSymbol}&interval=${interval}&outputsize=${limit}&apikey=${TWELVE_DATA_KEY}&format=JSON`
    const raw = await fetch(url)
    const data = await raw.json()

    if (data.status === 'error' || !data.values) {
      throw new Error(data.message || 'Twelve Data returned no values')
    }

    // Twelve Data returns newest first — reverse so oldest is first
    const candles = data.values.reverse().map(d => ({
      time:   Math.floor(new Date(d.datetime).getTime() / 1000),
      open:   parseFloat(d.open),
      high:   parseFloat(d.high),
      low:    parseFloat(d.low),
      close:  parseFloat(d.close),
      volume: parseFloat(d.volume || 0),
    }))

    return res.json({ success: true, symbol: sym, source: 'twelvedata', data: candles })
  } catch (err) {
    console.error('[market/ohlc twelvedata]', err.message)
    return res.status(502).json({ success: false, error: `Live data fetch failed: ${err.message}` })
  }
})

// ── GET /api/market/price/:symbol — single latest price ──────────────────────
router.get('/price/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase()
  const cfg = SYMBOL_CONFIG[sym]
  if (!cfg) return res.status(404).json({ success: false, error: `Symbol ${sym} not found` })

  try {
    if (cfg.type === 'crypto') {
      const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${sym}USDT`)
      const d = await r.json()
      return res.json({ success: true, symbol: sym, price: parseFloat(d.price), source: 'binance' })
    }

    if (!TWELVE_DATA_KEY) {
      return res.status(503).json({ success: false, error: 'TWELVE_DATA_API_KEY not set' })
    }
    const r = await fetch(`https://api.twelvedata.com/price?symbol=${cfg.tdSymbol}&apikey=${TWELVE_DATA_KEY}`)
    const d = await r.json()
    return res.json({ success: true, symbol: sym, price: parseFloat(d.price), source: 'twelvedata' })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message })
  }
})

// ── GET /api/market/news — live financial news via Finnhub ───────────────────
router.get('/news', async (req, res) => {
  const { symbol, category = 'general' } = req.query

  if (!FINNHUB_KEY) {
    return res.status(503).json({ success: false, error: 'FINNHUB_API_KEY not configured in server/.env' })
  }

  try {
    let url
    if (symbol) {
      const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const to   = new Date().toISOString().split('T')[0]
      url = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
    } else {
      url = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_KEY}`
    }

    const raw = await fetch(url)
    const data = await raw.json()

    if (!Array.isArray(data)) {
      throw new Error('Invalid response from Finnhub')
    }

    const articles = data.slice(0, 20).map((item, i) => {
      const titleLower = item.headline.toLowerCase()
      let impact = 'neutral'
      if (/surge|soar|jump|rally|rise|gain|bull|up\b/.test(titleLower)) impact = 'bullish'
      if (/drop|fall|plummet|sink|dip|slump|bear|crash|down\b/.test(titleLower)) impact = 'bearish'

      return {
        id:          `finnhub-${i}-${item.id}`,
        title:       item.headline,
        description: item.summary || 'Click to read the full article.',
        impact,
        symbol:      symbol || 'General',
        timestamp:   new Date(item.datetime * 1000).toLocaleDateString(),
        link:        item.url,
        source:      item.source,
        image:       item.image || null,
      }
    })

    return res.json({ success: true, count: articles.length, data: articles })
  } catch (err) {
    console.error('[market/news]', err.message)
    return res.status(502).json({ success: false, error: err.message })
  }
})

// ── GET /api/market/scan ─────────────────────────────────────────────────────
router.get('/scan', (req, res) => {
  const { market = 'All' } = req.query
  let symbols = Object.entries(SYMBOL_CONFIG)
  if (market !== 'All') {
    symbols = symbols.filter(([, cfg]) => cfg.market === market)
  }
  const results = symbols.map(([id, cfg]) => ({ symbol: id, market: cfg.market, label: cfg.label }))
  res.json({ success: true, count: results.length, data: results })
})

export default router
