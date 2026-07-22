import { io } from 'socket.io-client'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5000')

export class BinanceService {
  constructor(symbol, timeframe, onUpdate) {
    let s = symbol.toUpperCase().replace('/', '')
    if (s.endsWith('USDT')) s = s.slice(0, -4)
    this.symbol = s
    this.timeframe = timeframe
    this.onUpdate = onUpdate
    this.socket = null
    this.isDisconnected = false
  }

  connect() {
    if (this.isDisconnected) return
    if (this.socket) this.socket.disconnect()

    this.socket = io(BACKEND_URL)

    this.socket.on('connect', () => {
      console.log(`Connected to consolidated backend Socket.io for: ${this.symbol}`)
      this.socket.emit('subscribe', { symbol: this.symbol, timeframe: this.timeframe })
    })

    this.socket.on('candle-update', (candle) => {
      this.onUpdate(candle)
    })

    this.socket.on('disconnect', () => {
      console.log('Socket.io connection closed')
    })

    this.socket.on('connect_error', (err) => {
      console.error('Socket.io connection error:', err)
    })
  }

  disconnect() {
    this.isDisconnected = true
    if (this.socket) {
      this.socket.emit('unsubscribe', { symbol: this.symbol, timeframe: this.timeframe })
      this.socket.disconnect()
      this.socket = null
    }
  }

  static async getHistoricalData(symbol, timeframe, limit = 100) {
    let s = symbol.toUpperCase().replace('/', '')
    if (s.endsWith('USDT')) s = s.slice(0, -4)
    const tf = timeframe || '1d'
    try {
      const response = await fetch(`/api/market/ohlc/${s}?timeframe=${tf}&limit=${limit}`)
      const resData = await response.json()
      if (resData.success && resData.data) {
        return resData.data
      }
      return []
    } catch (err) {
      console.error('Error fetching historical data from consolidated backend:', err)
      try {
        const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${s}USDT&interval=${tf}&limit=${limit}`)
        const data = await response.json()
        return data.map(d => ({
          time: d[0] / 1000,
          open: parseFloat(d[1]),
          high: parseFloat(d[2]),
          low: parseFloat(d[3]),
          close: parseFloat(d[4]),
          volume: parseFloat(d[5])
        }))
      } catch (e) {
        console.error('Binance fallback historical data failed:', e)
        return []
      }
    }
  }
}
