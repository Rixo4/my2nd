import { Router } from 'express'
import { fetchLivePrice } from '../src/trading/paper_trading/executors.js'

const router = Router()

const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || ''
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ''
const POLYGON_KEY = process.env.POLYGON_API_KEY || ''
const ALPHAVANTAGE_KEY = process.env.ALPHAVANTAGE_API_KEY || ''
const MARKETAUX_KEY = process.env.MARKETAUX_API_KEY || ''

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

const BASELINES = {
  AAPL: 180, MSFT: 420, GOOGL: 175, AMZN: 190, NVDA: 850, TSLA: 240, META: 480, RELIANCE: 2950, TCS: 4100, INFY: 1600,
  BTC: 65000, ETH: 3500, BNB: 590, SOL: 170, XRP: 0.60, ADA: 0.45, DOT: 7.2, AVAX: 35.5, DOGE: 0.15, MATIC: 0.70,
  EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 153.4, AUDUSD: 0.655, USDCAD: 1.352, USDCHF: 0.905, NZDUSD: 0.602, EURGBP: 0.858
}

// Map app timeframes → Twelve Data intervals
function mapTF(tf) {
  const m = { '1m':'1min','5m':'5min','15m':'15min','1h':'1h','4h':'4h','1d':'1day','1w':'1week' }
  return m[tf] || '1day'
}

function mapPolygonTF(tf) {
  const m = {
    '1m': '1/minute',
    '5m': '5/minute',
    '15m': '15/minute',
    '1h': '1/hour',
    '4h': '4/hour',
    '1d': '1/day',
    '1w': '1/week'
  }
  return m[tf] || '1/day'
}

function getFromTo(tf, limit) {
  const to = new Date().toISOString().split('T')[0]
  let ms = limit * 24 * 3600 * 1000 // default to daily
  if (tf.endsWith('m')) {
    const mins = parseInt(tf)
    ms = limit * mins * 60 * 1000 * 2 // multiply by 2 for weekend gaps/off-hours
  } else if (tf.endsWith('h')) {
    const hrs = parseInt(tf)
    ms = limit * hrs * 3600 * 1000 * 2
  } else if (tf.endsWith('w')) {
    ms = limit * 7 * 24 * 3600 * 1000
  }
  ms = Math.max(ms, 24 * 3600 * 1000)
  const from = new Date(Date.now() - ms).toISOString().split('T')[0]
  return { from, to }
}

async function fetchAlphaVantageForexCandles(sym, timeframe, limit) {
  if (!ALPHAVANTAGE_KEY || sym.length !== 6) return null
  const fromSym = sym.slice(0, 3)
  const toSym = sym.slice(3)
  let url = ''
  let timeSeriesKey = ''

  if (timeframe === '1d') {
    url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromSym}&to_symbol=${toSym}&outputsize=${limit > 100 ? 'full' : 'compact'}&apikey=${ALPHAVANTAGE_KEY}`
    timeSeriesKey = 'Time Series FX (Daily)'
  } else if (timeframe === '1w') {
    url = `https://www.alphavantage.co/query?function=FX_WEEKLY&from_symbol=${fromSym}&to_symbol=${toSym}&apikey=${ALPHAVANTAGE_KEY}`
    timeSeriesKey = 'Time Series FX (Weekly)'
  } else {
    const avInterval = timeframe === '1m' ? '1min' : timeframe === '5m' ? '5min' : timeframe === '15m' ? '15min' : '60min'
    url = `https://www.alphavantage.co/query?function=FX_INTRADAY&from_symbol=${fromSym}&to_symbol=${toSym}&interval=${avInterval}&outputsize=${limit > 100 ? 'full' : 'compact'}&apikey=${ALPHAVANTAGE_KEY}`
    timeSeriesKey = `Time Series FX (${avInterval})`
  }

  const res = await fetch(url)
  const data = await res.json()
  const series = data[timeSeriesKey]
  if (!series) return null
  const dates = Object.keys(series).sort().slice(-limit)
  return dates.map(d => ({
    time: Math.floor(new Date(d).getTime() / 1000),
    open: parseFloat(series[d]['1. open']),
    high: parseFloat(series[d]['2. high']),
    low: parseFloat(series[d]['3. low']),
    close: parseFloat(series[d]['4. close']),
    volume: 0
  }))
}

function generateMockCandles(symbol, timeframe, limit = 100) {
  const basePrice = BASELINES[symbol.toUpperCase()] || 100.0
  const candles = []
  const now = Date.now()
  let intervalMs = 24 * 3600 * 1000
  if (timeframe === '1m') intervalMs = 60 * 1000
  else if (timeframe === '5m') intervalMs = 5 * 60 * 1000
  else if (timeframe === '15m') intervalMs = 15 * 60 * 1000
  else if (timeframe === '1h') intervalMs = 3600 * 1000
  else if (timeframe === '4h') intervalMs = 4 * 3600 * 1000
  else if (timeframe === '1w') intervalMs = 7 * 24 * 3600 * 1000

  for (let i = 0; i < limit; i++) {
    const time = Math.floor((now - (limit - i) * intervalMs) / 1000)
    const factor = 1 + (Math.sin(i / 10) * 0.03) + (Math.random() * 0.02 - 0.01)
    const close = basePrice * factor
    candles.push({
      time,
      open: parseFloat((close * 0.995).toFixed(4)),
      high: parseFloat((close * 1.01).toFixed(4)),
      low: parseFloat((close * 0.99).toFixed(4)),
      close: parseFloat(close.toFixed(4)),
      volume: Math.floor(1000 + Math.random() * 9000)
    })
  }
  return candles
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

  // 1. Crypto uses Binance REST (no key needed)
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

  // 2. Stocks use Polygon
  if (cfg.type === 'stock' && POLYGON_KEY) {
    try {
      const { from, to } = getFromTo(timeframe, Number(limit))
      const polyTF = mapPolygonTF(timeframe)
      const url = `https://api.polygon.io/v2/aggs/ticker/${sym}/range/${polyTF}/${from}/${to}?adjusted=true&sort=asc&limit=${limit}&apiKey=${POLYGON_KEY}`
      const raw = await fetch(url)
      const data = await raw.json()
      if (data.results) {
        const candles = data.results.map(r => ({
          time:   Math.floor(r.t / 1000),
          open:   r.o,
          high:   r.h,
          low:    r.l,
          close:  r.c,
          volume: r.v
        }))
        return res.json({ success: true, symbol: sym, source: 'polygon', data: candles })
      }
    } catch (err) {
      console.error('[market/ohlc polygon]', err.message)
    }
  }

  // 3. Forex uses Alpha Vantage
  if (cfg.type === 'forex' && ALPHAVANTAGE_KEY) {
    try {
      const candles = await fetchAlphaVantageForexCandles(sym, timeframe, Number(limit))
      if (candles) {
        return res.json({ success: true, symbol: sym, source: 'alphavantage', data: candles })
      }
    } catch (err) {
      console.error('[market/ohlc alphavantage]', err.message)
    }
  }

  // 4. Legacy fallback to Twelve Data
  if (TWELVE_DATA_KEY) {
    try {
      const interval = mapTF(timeframe)
      const url = `https://api.twelvedata.com/time_series?symbol=${cfg.tdSymbol}&interval=${interval}&outputsize=${limit}&apikey=${TWELVE_DATA_KEY}&format=JSON`
      const raw = await fetch(url)
      const data = await raw.json()

      if (data.values && !data.status === 'error') {
        const candles = data.values.reverse().map(d => ({
          time:   Math.floor(new Date(d.datetime).getTime() / 1000),
          open:   parseFloat(d.open),
          high:   parseFloat(d.high),
          low:    parseFloat(d.low),
          close:  parseFloat(d.close),
          volume: parseFloat(d.volume || 0),
        }))
        return res.json({ success: true, symbol: sym, source: 'twelvedata', data: candles })
      }
    } catch (err) {
      console.error('[market/ohlc twelvedata fallback]', err.message)
    }
  }

  // 5. Ultimate fallback to mock
  console.warn(`[market/ohlc] Using fallback mock data for ${sym}`)
  const candles = generateMockCandles(sym, timeframe, Number(limit))
  return res.json({ success: true, symbol: sym, source: 'mock', data: candles })
})

// ── GET /api/market/price/:symbol — single latest price ──────────────────────
router.get('/price/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase()
  const cfg = SYMBOL_CONFIG[sym]
  if (!cfg) return res.status(404).json({ success: false, error: `Symbol ${sym} not found` })

  try {
    const price = await fetchLivePrice(sym)
    if (price !== null) {
      return res.json({ success: true, symbol: sym, price, source: 'live_api' })
    }
    return res.status(502).json({ success: false, error: `Could not retrieve live price for ${sym}` })
  } catch (err) {
    return res.status(502).json({ success: false, error: err.message })
  }
})

// ── GET /api/market/news — live financial news via Marketaux + Finnhub ────────
router.get('/news', async (req, res) => {
  const { symbol, category = 'general' } = req.query

  // 1. Try Marketaux first if configured
  if (MARKETAUX_KEY) {
    try {
      const q = symbol ? `&symbols=${symbol}` : ''
      const url = `https://api.marketaux.com/v1/news/all?filter_entities=true&limit=20&api_token=${MARKETAUX_KEY}${q}`
      const raw = await fetch(url)
      const data = await raw.json()

      if (data && Array.isArray(data.data)) {
        const articles = data.data.map((item, i) => {
          let impact = 'neutral'
          // Use overall news sentiment or entity sentiment if matching
          let score = item.sentiment_score || 0
          if (symbol) {
            const entity = item.entities?.find(e => e.symbol.toUpperCase() === symbol.toUpperCase())
            if (entity) score = entity.sentiment_score
          }
          if (score > 0.15) impact = 'bullish'
          if (score < -0.15) impact = 'bearish'

          return {
            id:          `marketaux-${i}-${item.uuid}`,
            title:       item.title,
            description: item.description || item.snippet || 'Click to read the full article.',
            impact,
            symbol:      symbol || 'General',
            timestamp:   new Date(item.published_at).toLocaleDateString(),
            link:        item.url,
            source:      item.source,
            image:       item.image_url || null,
          }
        })
        return res.json({ success: true, count: articles.length, data: articles })
      }
    } catch (err) {
      console.error('[market/news Marketaux failed]', err.message)
    }
  }

  // 2. Fallback to Finnhub
  if (FINNHUB_KEY) {
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

      if (Array.isArray(data)) {
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
      }
    } catch (err) {
      console.error('[market/news Finnhub fallback failed]', err.message)
    }
  }

  // 3. Mock fallback news
  const dummySymbol = symbol || 'General'
  const mockArticles = [
    {
      id: 'mock-1',
      title: `${dummySymbol} Consolidation Continues Amid Low Volume`,
      description: `Market dynamics for ${dummySymbol} point to consolidation as trade volume drops before the upcoming economic policy statement.`,
      impact: 'neutral',
      symbol: dummySymbol,
      timestamp: new Date().toLocaleDateString(),
      link: '#',
      source: 'MockFinance',
      image: null
    },
    {
      id: 'mock-2',
      title: `Bullish Trend Intact For ${dummySymbol} Following Critical Support Bounce`,
      description: `Buyers successfully defended key support levels for ${dummySymbol}, driving price action back above the moving averages.`,
      impact: 'bullish',
      symbol: dummySymbol,
      timestamp: new Date().toLocaleDateString(),
      link: '#',
      source: 'TechnicalInsight',
      image: null
    }
  ]
  return res.json({ success: true, count: mockArticles.length, data: mockArticles })
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
