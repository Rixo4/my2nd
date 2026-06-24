import { Router } from 'express'
import { getPortfolioSummary, getPortfolioMetrics, getTradeHistory } from '../src/services/paper_trading_service.js'
import { validateBody, chatSchema, portfolioHealthSchema, tradeJournalSchema } from '../src/middlewares/validation.js'

const router = Router()
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

/**
 * POST /api/chat
 * Secure server-side chatbot (Market Copilot) with real-time portfolio context injection.
 */
router.post('/', validateBody(chatSchema), async (req, res) => {
  try {
    const { prompt, portfolioId, history = [] } = req.body || {}

    let context = ''
    if (portfolioId) {
      try {
        const summaryRes = await getPortfolioSummary(portfolioId)
        const metricsRes = await getPortfolioMetrics(portfolioId)
        
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
        response: `[Mock TradeWise Assistant] I see you asked: "${prompt}". (Note: GROQ_API_KEY is not configured on the server, showing mock reply). Check your chart indicators and set a stop loss relative to the ATR volatility levels. This is for educational purposes only.`
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

/**
 * POST /api/chat/portfolio-health
 * Analyzes portfolio health, metrics, and risk factors.
 */
router.post('/portfolio-health', validateBody(portfolioHealthSchema), async (req, res) => {
  try {
    const { portfolioId } = req.body || {}

    const summaryRes = await getPortfolioSummary(portfolioId)
    const metricsRes = await getPortfolioMetrics(portfolioId)

    if (!summaryRes.success || !metricsRes.success) {
      return res.status(404).json({ success: false, error: 'Portfolio data could not be retrieved.' })
    }

    const port = summaryRes.portfolio
    const met = metricsRes.metrics

    if (!GROQ_API_KEY) {
      const score = met.win_rate >= 60 ? 'A' : met.win_rate >= 45 ? 'B-' : 'C'
      const feedback = score === 'A' 
        ? "Excellent risk management. Portfolio exhibits positive expectancy. Maintain sizing discipline."
        : score === 'B-'
        ? "Decent performance, but watch your max drawdown. Keep risk per trade under 2%."
        : "High drawdown detected. Cut your position sizing in half and trade only top-tier patterns."

      return res.json({
        success: true,
        health: {
          score,
          verdict: met.win_rate >= 50 ? 'Healthy' : 'Needs Adjustment',
          drawdownStatus: met.max_drawdown_percent > 15 ? 'HIGH RISK' : 'STABLE',
          analysis: `Your portfolio win rate is ${met.win_rate}% over ${met.closed_trades} trades. ${feedback} (Educational Sandbox Mode)`
        }
      })
    }

    const openPositions = port.positions?.map(p => `${p.symbol}: Qty ${p.quantity} @ Entry $${p.entry_price}`).join(', ') || 'None'
    const prompt = `Analyze the health and risk parameters of this paper trading portfolio:
    - Cash: $${port.cash_balance.toFixed(2)}
    - Starting Capital: $${port.starting_balance || 10000}
    - Open Holdings: ${openPositions}
    - Win Rate: ${met.win_rate}%
    - Closed Trades Count: ${met.closed_trades}
    - Profit Factor: ${met.profit_factor || '1.1'}
    - Max Drawdown: ${met.max_drawdown_percent}%

    Provide a short structural JSON response with these fields:
    - score: letter grade (A, B, C, D, F)
    - verdict: short phrase (e.g. "Excellent Sizing", "Excessive Risk")
    - drawdownStatus: stable, caution, or dangerous
    - analysis: 2-3 sentence technical critique explaining their main weakness or strength and actionable recommendations.
    Return ONLY JSON. Do not include markdown wraps or preambles.`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`)
    }

    const data = await response.json()
    const health = JSON.parse(data.choices?.[0]?.message?.content || '{}')
    res.json({ success: true, health })
  } catch (err) {
    console.error('Error in portfolio-health route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/chat/trade-journal
 * Reviews journal notes on a past trade to provide performance advice.
 */
router.post('/trade-journal', validateBody(tradeJournalSchema), async (req, res) => {
  try {
    const { portfolioId, tradeId, notes } = req.body || {}

    let tradeDetailText = 'General trade review'
    if (tradeId) {
      const history = await getTradeHistory({ portfolioId, limit: 100 })
      const trade = history.trades?.find(t => t.id === tradeId)
      if (trade) {
        tradeDetailText = `Trade: ${trade.side} ${trade.symbol}, Qty: ${trade.quantity}, Fill Price: $${trade.price}, PnL: $${trade.pnl} (${trade.pnl_percent}%)`
      }
    }

    if (!GROQ_API_KEY) {
      return res.json({
        success: true,
        review: `[Sandbox Journal Coach] Reviewed notes: "${notes}". Actionable tip: Ensure you had a pre-defined stop-loss. If you chased the entry, lower your speed and wait for consolidation. Disclaimer: Educational purposes only.`
      })
    }

    const prompt = `You are a professional trading mentor. Review the user's trading notes alongside trade execution details:
    Context: ${tradeDetailText}
    User Notes: "${notes}"

    Critique the user's psychological state, entry/exit logic, or rules compliance. Keep your feedback under 3 sentences, clear, constructive, and actionable. Add a small disclaimer that this is educational advice only.`

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 250
      })
    })

    if (!response.ok) {
      throw new Error(`Groq API error status ${response.status}`)
    }

    const data = await response.json()
    const review = data.choices?.[0]?.message?.content || 'Unable to generate journal review.'
    res.json({ success: true, review })
  } catch (err) {
    console.error('Error in trade-journal route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
