import express from 'express'
import cors from 'cors'
import marketRoutes from './routes/market.js'

const app = express()
const PORT = process.env.PORT || 5000

app.use(cors({ origin: 'http://localhost:3000' }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TradeWise API', timestamp: new Date().toISOString() })
})

app.use('/api/market', marketRoutes)

app.listen(PORT, () => {
  console.log(`\n🕯️  TradeWise API running on http://localhost:${PORT}\n`)
})
