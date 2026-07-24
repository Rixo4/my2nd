export class BinanceService {
  constructor(symbol, timeframe, onUpdate) {
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
        console.log(`Connected directly to Binance WebSocket: ${streamSymbol}@kline_${streamTf}`)
      }

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg && msg.e === 'kline' && msg.k) {
            const k = msg.k
            const candle = {
              time: Math.floor(k.t / 1000),
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              isFinal: k.x
            }
            if (this.onUpdate) {
              this.onUpdate(candle)
            }
          }
        } catch (e) {
          console.error('Error parsing Binance WS message:', e)
        }
      }

      this.ws.onerror = (err) => {
        console.error('Binance WebSocket error:', err)
      }

      this.ws.onclose = () => {
        console.log('Binance WebSocket closed')
      }
    } catch (err) {
      console.error('Failed to instantiate Binance WebSocket:', err)
    }
  }

  disconnect() {
    this.isDisconnected = true
    if (this.ws) {
      try {
        this.ws.close()
      } catch (e) {}
      this.ws = null
    }
  }

  static async getHistoricalData(symbol, timeframe, limit = 100) {
    let s = symbol.toUpperCase().replace('/', '')
    if (s.endsWith('USDT')) s = s.slice(0, -4)
    const tf = timeframe || '1d'
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${s}USDT&interval=${tf}&limit=${limit}`)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      const data = await response.json()
      return data.map(d => ({
        time: Math.floor(d[0] / 1000),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }))
    } catch (err) {
      console.error('Direct Binance REST historical fetch failed:', err)
      try {
        const response = await fetch(`/api/market/ohlc/${s}?timeframe=${tf}&limit=${limit}`)
        const resData = await response.json()
        if (resData.success && resData.data) {
          return resData.data
        }
        return []
      } catch (e) {
        console.error('Backend fallback historical data failed:', e)
        return []
      }
    }
  }
}

