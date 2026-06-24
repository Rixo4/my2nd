import { Server } from 'socket.io'
import { fetchLivePrice } from '../trading/paper_trading/executors.js'

let io = null
const activeSubscriptions = new Map() // roomName -> { symbol, timeframe, clients: Set }
const candleCache = new Map() // roomName -> currentCandle

export function initSocketIO(server) {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST']
    }
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected to Socket.io: ${socket.id}`)

    socket.on('subscribe', ({ symbol, timeframe }) => {
      const room = `${symbol.toUpperCase()}:${timeframe}`
      socket.join(room)
      console.log(`📈 Client ${socket.id} subscribed to ${room}`)

      if (!activeSubscriptions.has(room)) {
        activeSubscriptions.set(room, {
          symbol: symbol.toUpperCase(),
          timeframe,
          clients: new Set()
        })
      }
      activeSubscriptions.get(room).clients.add(socket.id)
    })

    socket.on('unsubscribe', ({ symbol, timeframe }) => {
      const room = `${symbol.toUpperCase()}:${timeframe}`
      socket.leave(room)
      console.log(`📉 Client ${socket.id} unsubscribed from ${room}`)

      const sub = activeSubscriptions.get(room)
      if (sub) {
        sub.clients.delete(socket.id)
        if (sub.clients.size === 0) {
          activeSubscriptions.delete(room)
          candleCache.delete(room)
        }
      }
    })

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`)
      for (const [room, sub] of activeSubscriptions.entries()) {
        if (sub.clients.has(socket.id)) {
          sub.clients.delete(socket.id)
          if (sub.clients.size === 0) {
            activeSubscriptions.delete(room)
            candleCache.delete(room)
          }
        }
      }
    })
  })

  // Periodically update active candles
  setInterval(async () => {
    if (activeSubscriptions.size === 0) return

    for (const [room, sub] of activeSubscriptions.entries()) {
      const { symbol, timeframe } = sub
      try {
        const cleanSymbol = symbol.replace('USDT', '')
        const livePrice = await fetchLivePrice(cleanSymbol)
        if (!livePrice) continue

        let cached = candleCache.get(room)
        const nowSec = Math.floor(Date.now() / 1000)
        const tfSeconds = mapTimeframeToSeconds(timeframe)
        const candleTime = Math.floor(nowSec / tfSeconds) * tfSeconds

        if (!cached || cached.time !== candleTime) {
          if (cached) {
            // Emit final state of previous candle
            cached.isFinal = true
            io.to(room).emit('candle-update', cached)
          }
          cached = {
            time: candleTime,
            open: livePrice,
            high: livePrice,
            low: livePrice,
            close: livePrice,
            volume: Math.random() * 5 + 1,
            isFinal: false
          }
        } else {
          cached.close = livePrice
          cached.high = Math.max(cached.high, livePrice)
          cached.low = Math.min(cached.low, livePrice)
          cached.volume += Math.random() * 0.5
        }

        candleCache.set(room, cached)
        io.to(room).emit('candle-update', cached)
      } catch (err) {
        console.error(`[socketService] Error updating ${room}:`, err.message)
      }
    }
  }, 3000) // update every 3 seconds for active subscriptions
}

function mapTimeframeToSeconds(tf) {
  const amount = parseInt(tf)
  const unit = tf.slice(-1)
  if (unit === 'm') return amount * 60
  if (unit === 'h') return amount * 3600
  if (unit === 'd') return amount * 86400
  if (unit === 'w') return amount * 86400 * 7
  return 60
}
