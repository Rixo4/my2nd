import { Router } from 'express'
import { getPatternSentimentCorrelation } from '../src/services/patternSentimentAnalyzer.js'

const router = Router()

/**
 * GET /api/analytics/pattern-sentiment-matrix
 * Retrieve win rate correlations of patterns grouped by news sentiment regimes.
 */
router.get('/pattern-sentiment-matrix', (req, res) => {
  try {
    const { portfolioId } = req.query || {}
    if (!portfolioId) {
      return res.status(400).json({ success: false, error: 'Missing required portfolioId query parameter' })
    }

    const correlation = getPatternSentimentCorrelation(portfolioId)
    res.json({ success: true, correlation })
  } catch (err) {
    console.error('Error fetching pattern sentiment matrix:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
