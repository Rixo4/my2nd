import express from 'express'
import cors from 'cors'
import http from 'http'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import marketRoutes from './routes/market.js'
import paperTradingRoutes from './routes/paper_trading.js'
import aiSuggestionsRoutes from './routes/ai-suggestions.js'
import academyRoutes from './routes/academy.js'
import analyticsRoutes from './routes/analytics.js'
import chatEnhancedRoutes from './routes/chat-enhanced.js'
import copilotRoutes from './routes/copilot.js'
import { initDatabase } from './src/database/init.js'
import { initSocketIO } from './src/services/socketService.js'
import { addBackgroundJob } from './src/services/worker.js'
import logger from './src/services/logger.js'
import { initMonitoring, setupSentryErrorHandler } from './src/services/monitoring.js'

const app = express()
const PORT = process.env.PORT || 5000

// Initialize SQLite paper trading database
initDatabase()

// Initialize Sentry/PostHog/BetterStack monitoring
initMonitoring()

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false
}))

// Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: process.env.NODE_ENV === 'production' ? 2000 : 10000, // SPA-friendly limits
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests. Please try again later.' }
})

app.use('/api/', apiLimiter)

app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3001'] }))
app.use(express.json())

// Request logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`)
  next()
})

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'TradeWise API', timestamp: new Date().toISOString() })
})

app.use('/api/market', marketRoutes)
app.use('/api/v1/paper', paperTradingRoutes)
app.use('/api/suggestions', aiSuggestionsRoutes)
app.use('/api/academy', academyRoutes)
app.use('/api/analytics', analyticsRoutes)
app.use('/api/chat', chatEnhancedRoutes)
app.use('/api/copilot', copilotRoutes)

// Setup Sentry express error handler
setupSentryErrorHandler(app)

// Error Handler middleware
app.use((err, req, res, next) => {
  logger.error(`Error processing ${req.method} ${req.originalUrl}: ${err.message}`)
  res.status(err.status || 500).json({ success: false, error: err.message || 'Internal Server Error' })
})

const server = http.createServer(app)

// Initialize Socket.io WS Server
initSocketIO(server)

// Queue initial scans
setTimeout(() => {
  logger.info('⏰ Triggering initial background scan jobs...')
  addBackgroundJob('hourly-scan').catch(err => logger.error('Failed to run initial scan: ' + err.message))
  addBackgroundJob('fetch-news').catch(err => logger.error('Failed to run initial news fetch: ' + err.message))
}, 2000)

server.listen(PORT, () => {
  logger.info(`🕯️  TradeWise API + WebSockets running on http://localhost:${PORT}`)
  logger.info(`📊  Paper Trading API: http://localhost:${PORT}/api/v1/paper`)
})

export default app
