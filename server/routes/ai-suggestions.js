import { Router } from 'express'
import { getDailySuggestions } from '../src/services/tradeRecommendationEngine.js'
import { calculatePositionSize } from '../src/services/positionSizingAI.js'
import { runMarketScan, getScanStatus } from '../src/services/marketScanner.js'

const router = Router()

/**
 * POST /api/suggestions/daily
 * Retrieve daily high-probability suggestions
 */
router.post('/daily', async (req, res) => {
  try {
    const { userStyle } = req.body || {}
    const suggestions = await getDailySuggestions(userStyle)
    res.json({ success: true, suggestions })
  } catch (err) {
    console.error('Error in daily suggestions route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/trades/validate-position-size
 * Perform risk assessment and optimal sizing calculation
 */
router.post('/validate-position-size', async (req, res) => {
  try {
    const { portfolioId, symbol, riskPercent, patternName, patternWinRate } = req.body || {}
    if (!portfolioId || !symbol) {
      return res.status(400).json({ success: false, error: 'Missing portfolioId or symbol parameters' })
    }

    const sizing = await calculatePositionSize({
      portfolioId,
      symbol,
      riskPercent: Number(riskPercent || 1),
      patternName,
      patternWinRate: Number(patternWinRate || 50)
    })

    res.json({ success: true, sizing })
  } catch (err) {
    console.error('Error in position size validation route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/suggestions/scan
 * Trigger a fresh market scan (detects patterns + sentiment from live data).
 */
router.post('/scan', async (req, res) => {
  try {
    const { force } = req.body || {}
    const result = await runMarketScan(force === true)
    res.json({ success: true, ...result })
  } catch (err) {
    console.error('Error triggering market scan:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * GET /api/suggestions/scan-status
 * Check when the last scan ran and when the next one is available.
 */
router.get('/scan-status', (req, res) => {
  res.json({ success: true, ...getScanStatus() })
})

export default router
