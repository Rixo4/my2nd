export class BinanceService {
  constructor(symbol, timeframe, onUpdate) {
    // Accept with or without USDT suffix
    let s = symbol.toUpperCase().replace('/', '')
    if (s.endsWith('USDT')) s = s.slice(0, -4)
    this.symbol = s
    this.timeframe = timeframe || '1d'
    this.onUpdate = onUpdate
    this.ws = null
    this.isDisconnected = false
  }

  connect() {
    if (this.isDisconnected) return
    this.disconnect()
    this.isDisconnected = false

    const streamSymbol = `${this.symbol.toLowerCase()}usdt`
    const streamTf = this.timeframe.toLowerCase()
    const wsUrl = `wss://stream.binance.com:9443/ws/${streamSymbol}@kline_${streamTf}`

    try {
      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.log(`[BinanceService] WS connected: ${streamSymbol}@kline_${streamTf}`)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg && msg.e === 'kline' && msg.k) {
            const k = msg.k
            const candle = {
              time:    Math.floor(k.t / 1000),
              open:    parseFloat(k.o),
              high:    parseFloat(k.h),
              low:     parseFloat(k.l),
              close:   parseFloat(k.c),
              volume:  parseFloat(k.v),
              isFinal: k.x
            }
            if (this.onUpdate) this.onUpdate(candle)
          }
        } catch (e) {
          console.error('[BinanceService] WS message parse error:', e)
        }
      }

      this.ws.onerror = (err) => {
        console.warn('[BinanceService] WS error — will rely on REST poll', err)
      }

      this.ws.onclose = () => {
        if (!this.isDisconnected) {
          // Auto-reconnect after 3s on unexpected close
          setTimeout(() => this.connect(), 3000)
        }
      }
    } catch (err) {
      console.error('[BinanceService] Failed to create WebSocket:', err)
    }
  }

  disconnect() {
    this.isDisconnected = true
    if (this.ws) {
      try { this.ws.close() } catch (_) {}
      this.ws = null
    }
  }

  // sym can be 'BTC', 'BTCUSDT', or 'BTC/USDT'
  static async getHistoricalData(symbol, timeframe, limit = 200) {
    let s = symbol.toUpperCase().replace('/', '')
    if (s.endsWith('USDT')) s = s.slice(0, -4)
    const tf = timeframe || '1d'

    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${s}USDT&interval=${tf}&limit=${limit}`
      )
      if (!res.ok) throw new Error(`Binance REST error ${res.status}`)
      const data = await res.json()
      return data.map(d => ({
        time:   Math.floor(d[0] / 1000),
        open:   parseFloat(d[1]),
        high:   parseFloat(d[2]),
        low:    parseFloat(d[3]),
        close:  parseFloat(d[4]),
        volume: parseFloat(d[5])
      }))
    } catch (err) {
      console.error('[BinanceService] REST historical fetch failed:', err)
      // Backend fallback
      try {
        const res2 = await fetch(`/api/market/ohlc/${s}?timeframe=${tf}&limit=${limit}`)
        const json = await res2.json()
        if (json.success && json.data) return json.data
      } catch (_) {}
      return []
    }
  }
}
