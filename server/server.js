import express from 'express'
import cors from 'cors'
import marketRoutes from './routes/market.js'
import paperTradingRoutes from './routes/paper_trading.js'
import { initDatabase } from './src/database/init.js'

const app = express()
const PORT = process.env.PORT || 5000

// Initialize SQLite paper trading database
initDatabase()

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TradeWise API', timestamp: new Date().toISOString() })
})

app.use('/api/market', marketRoutes)
app.use('/api/v1/paper', paperTradingRoutes)

app.listen(PORT, () => {
  console.log(`\n🕯️  TradeWise API running on http://localhost:${PORT}\n`)
  console.log(`📊  Paper Trading API: http://localhost:${PORT}/api/v1/paper\n`)
})

export default app

