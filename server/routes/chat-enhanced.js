import { Router } from 'express'
import { getPortfolioSummary, getPortfolioMetrics } from '../src/services/paper_trading_service.js'
import { getDb } from '../src/database/init.js'

const router = Router()
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * POST /api/chat
 * Secure server-side chatbot with real-time portfolio context injection.
 */
router.post('/', async (req, res) => {
  try {
    const { prompt, portfolioId, history = [] } = req.body || {}
    if (!prompt) {
      return res.status(400).json({ success: false, error: 'Missing prompt parameter' })
    }

    let context = ''
    if (portfolioId) {
      try {
        const summaryRes = getPortfolioSummary(portfolioId)
        const metricsRes = getPortfolioMetrics(portfolioId)
        
        if (summaryRes.success && metricsRes.success) {
          const port = summaryRes.portfolio
          const met = metricsRes.metrics
          
          const openPositions = port.positions?.map(p => `${p.symbol} (${p.side}): Qty ${p.quantity} @ Entry $${p.entry_price}`).join(', ') || 'None'
          
          context = `
          The user's current paper trading portfolio context:
          - Cash Balance: $${port.cash_balance.toFixed(2)}
          - Open Positions: ${openPositions}
          - Win Rate: ${met.win_rate}%
          - Total Closed Trades: ${met.closed_trades}
          - Total Realized PnL: $${met.total_realized_pnl.toFixed(2)}
          - Max Drawdown: ${met.max_drawdown_percent}%
          `
        }
      } catch (err) {
        console.error('Failed to resolve portfolio context for chatbot:', err.message)
      }
    }

    const systemPrompt = `You are TradeWise AI, a premium virtual trading coach specializing in technical analysis, candlestick pattern recognition, and risk management. 
    You help users master financial markets by providing educational trade feedback and analysis.
    Keep your explanations brief, concise, and professional (under 3-4 sentences). 
    Always include a small disclaimer that this is for educational purposes only.
    
    ${context}`

    // Format chat messages including history
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: prompt }
    ]

    if (!GROQ_API_KEY) {
      return res.json({
        success: true,
        response: `[Mock TradeWise Assistant] I see you asked: "${prompt}". (Note: GROQ_API_KEY is not configured on the server, showing mock reply). Check your chart indicators and set a stop loss relative to the ATR volatility levels.`
      })
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 400
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Groq API Error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const reply = data.choices?.[0]?.message?.content || 'Unable to generate advice at this moment.'

    res.json({ success: true, response: reply })
  } catch (err) {
    console.error('Error in secure chat route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
