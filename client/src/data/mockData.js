// Seeded PRNG for deterministic mock data
function seededRandom(seed) {
  let s = seed >>> 0
  return () => {
    s = Math.imul(1664525, s) + 1013904223 >>> 0
    return s / 4294967296
  }
}

// 1-minute candles ending at the most recent minute
function generateCandles(basePrice, seed, count = 200, volatility = 0.003) {
  const rand = seededRandom(seed)
  const candles = []
  let price = basePrice
  // Align to the current minute
  const nowMinute = Math.floor(Date.now() / 60000) * 60

  for (let i = 0; i < count; i++) {
    const drift = (rand() - 0.485) * 2
    const change = drift * volatility * price
    const open = price
    const close = +(price + change).toFixed(6)
    const wick1 = rand() * volatility * price * 0.8
    const wick2 = rand() * volatility * price * 0.8
    const high = +(Math.max(open, close) + wick1).toFixed(6)
    const low = +(Math.min(open, close) - wick2).toFixed(6)
    const volume = Math.floor(rand() * 800000 + 20000)

    // time in seconds, 1-minute steps, ending at current minute
    candles.push({ time: nowMinute - (count - i) * 60, open, high, low, close, volume })
    price = close
  }
  return candles
}

export const SYMBOLS = {
  stocks: [
    { id: 'AAPL',  label: 'Apple Inc.',         market: 'stocks', price: 182.50, seed: 1001 },
    { id: 'MSFT',  label: 'Microsoft Corp.',     market: 'stocks', price: 415.20, seed: 1002 },
    { id: 'GOOGL', label: 'Alphabet Inc.',       market: 'stocks', price: 175.80, seed: 1003 },
    { id: 'AMZN',  label: 'Amazon.com Inc.',     market: 'stocks', price: 192.40, seed: 1004 },
    { id: 'TSLA',  label: 'Tesla Inc.',          market: 'stocks', price: 245.70, seed: 1005 },
    { id: 'NVDA',  label: 'Nvidia Corp.',        market: 'stocks', price: 820.10, seed: 1006 },
    { id: 'META',  label: 'Meta Platforms',      market: 'stocks', price: 485.30, seed: 1007 },
    { id: 'RELIANCE', label: 'Reliance (NSE)',   market: 'stocks', price: 2950.0, seed: 1008 },
    { id: 'TCS',      label: 'TCS (NSE)',        market: 'stocks', price: 4100.0, seed: 1009 },
    { id: 'INFY',     label: 'Infosys (NSE)',    market: 'stocks', price: 1600.0, seed: 1010 },
  ],
  crypto: [
    { id: 'BTC',   label: 'Bitcoin',             market: 'crypto', price: 67400,  seed: 2001 },
    { id: 'ETH',   label: 'Ethereum',            market: 'crypto', price: 3540,   seed: 2002 },
    { id: 'SOL',   label: 'Solana',              market: 'crypto', price: 175,    seed: 2003 },
    { id: 'BNB',   label: 'BNB',                 market: 'crypto', price: 590,    seed: 2004 },
    { id: 'XRP',   label: 'Ripple',              market: 'crypto', price: 0.62,   seed: 2005 },
    { id: 'ADA',   label: 'Cardano',             market: 'crypto', price: 0.45,   seed: 2006 },
    { id: 'DOT',   label: 'Polkadot',            market: 'crypto', price: 7.20,   seed: 2007 },
    { id: 'AVAX',  label: 'Avalanche',           market: 'crypto', price: 35.50,  seed: 2008 },
    { id: 'DOGE',  label: 'Dogecoin',            market: 'crypto', price: 0.15,   seed: 2009 },
    { id: 'MATIC', label: 'Polygon',             market: 'crypto', price: 0.70,   seed: 2010 },
  ],
  forex: [
    { id: 'EURUSD', label: 'EUR / USD',          market: 'forex',  price: 1.085,  seed: 3001 },
    { id: 'GBPUSD', label: 'GBP / USD',          market: 'forex',  price: 1.265,  seed: 3002 },
    { id: 'USDJPY', label: 'USD / JPY',          market: 'forex',  price: 153.4,  seed: 3003 },
    { id: 'AUDUSD', label: 'AUD / USD',          market: 'forex',  price: 0.655,  seed: 3004 },
    { id: 'USDCAD', label: 'USD / CAD',          market: 'forex',  price: 1.352,  seed: 3005 },
    { id: 'USDCHF', label: 'USD / CHF',          market: 'forex',  price: 0.905,  seed: 3006 },
    { id: 'NZDUSD', label: 'NZD / USD',          market: 'forex',  price: 0.602,  seed: 3007 },
    { id: 'EURGBP', label: 'EUR / GBP',          market: 'forex',  price: 0.858,  seed: 3008 },
  ],
}

export const ALL_SYMBOLS = [
  ...SYMBOLS.stocks,
  ...SYMBOLS.crypto,
  ...SYMBOLS.forex,
]

// Pre-generate all candle data (1-minute bars anchored to NOW)
export const CANDLE_DATA = {}
ALL_SYMBOLS.forEach(sym => {
  CANDLE_DATA[sym.id] = generateCandles(sym.price, sym.seed)
})

// Track per-symbol tick state for real-time simulation
const tickState = {}

// Generate a realistic real-time tick for the CURRENT minute candle.
// Every ~60 calls (at 1.5s interval = 90s), automatically starts a new candle.
export function getNextCandle(symbol) {
  const sym = ALL_SYMBOLS.find(s => s.id === symbol)
  if (!sym) return null

  const existing = CANDLE_DATA[sym.id]
  if (!existing || existing.length === 0) return null

  const nowMs = Date.now()
  const currentMinute = Math.floor(nowMs / 60000) * 60 // seconds

  const last = existing[existing.length - 1]

  if (!tickState[symbol]) {
    tickState[symbol] = {
      minuteStart: currentMinute,
      open: last.close,
      high: last.close,
      low: last.close,
      close: last.close,
      volume: 0,
    }
  }

  const ts = tickState[symbol]

  // If we've moved into a new minute, finalize the old candle and start fresh
  if (currentMinute > ts.minuteStart) {
    // Finalize previous candle
    const finalizedCandle = {
      time: ts.minuteStart,
      open: ts.open,
      high: ts.high,
      low: ts.low,
      close: ts.close,
      volume: ts.volume,
      isFinal: true,
    }
    CANDLE_DATA[sym.id] = [...existing, finalizedCandle]

    // Start new minute
    tickState[symbol] = {
      minuteStart: currentMinute,
      open: ts.close,
      high: ts.close,
      low: ts.close,
      close: ts.close,
      volume: 0,
    }
  }

  // Simulate a price tick (0.1% max move per tick)
  const volatility = sym.price > 1000 ? 0.0008 : sym.price > 10 ? 0.001 : sym.price > 1 ? 0.0015 : 0.002
  const change = (Math.random() - 0.49) * 2 * volatility * ts.close
  ts.close = +(ts.close + change).toFixed(6)
  ts.high = +(Math.max(ts.high, ts.close)).toFixed(6)
  ts.low = +(Math.min(ts.low, ts.close)).toFixed(6)
  ts.volume += Math.floor(Math.random() * 1000 + 100)

  return {
    time: currentMinute,
    open: ts.open,
    high: ts.high,
    low: ts.low,
    close: ts.close,
    volume: ts.volume,
    isFinal: false,
  }
}
