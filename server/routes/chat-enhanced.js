import { Router } from 'express'
import { getPortfolioSummary, getPortfolioMetrics, getTradeHistory } from '../src/services/paper_trading_service.js'
import { validateBody, chatSchema, portfolioHealthSchema, tradeJournalSchema } from '../src/middlewares/validation.js'
import { queryGemini, queryOpenAI, queryGroq } from '../src/services/ai.js'
import { getAiMemory, updateAiMemory } from '../src/trading/paper_trading/models.js'

const router = Router()

/**
 * POST /api/chat
 * Secure server-side chatbot (Market Copilot) with real-time portfolio context and AI Memory injection.
 */
router.post('/', validateBody(chatSchema), async (req, res) => {
  try {
    const { prompt, portfolioId, history = [] } = req.body || {}

    let context = ''
    let userId = portfolioId
    if (portfolioId) {
      try {
        const summaryRes = await getPortfolioSummary(portfolioId)
        const metricsRes = await getPortfolioMetrics(portfolioId)
        
        if (summaryRes.success && metricsRes.success) {
          const port = summaryRes.portfolio
          const met = metricsRes.metrics
          userId = port.user_id || portfolioId
          
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

    // Fetch user memory if available
    let memoryContext = ''
    if (userId) {
      try {
        const memory = await getAiMemory(userId)
        if (memory) {
          memoryContext = `
          User's Personal AI Memory Profile:
          - Risk Tolerance: ${memory.risk_tolerance}
          - Experience Level: ${memory.experience_level}
          - Learning Style: ${memory.learning_style}
          - Dynamic psychological metrics: FOMO score ${memory.fomo_score}/10, Discipline score ${memory.discipline_score}/10, Confidence bias ${memory.confidence_bias_score}/10.
          - Past Mistakes: ${Array.isArray(memory.past_mistakes) ? memory.past_mistakes.join(', ') : 'None'}
          - Behavior Patterns: ${Array.isArray(memory.behavior_patterns) ? memory.behavior_patterns.join(', ') : 'None'}
          `
        }
      } catch (err) {
        console.error('Failed to retrieve AI memory for user:', err.message)
      }
    }

    const systemPrompt = `You are TradeWise AI Copilot, a real-time charting assistant and trading coach specializing in technical analysis, candlestick pattern recognition, and risk management. 
    You help users analyze financial markets with high accuracy.
    
    When asked for market analysis or current market situation, structure your response as follows:
    
    CURRENT MARKET ANALYSIS
    The current price of [SYMBOL] is $[PRICE] on the [TIMEFRAME] timeframe, indicating a [TREND] trend.
      • RSI(14): [VAL] ([STATUS])
      • EMA Cross: [Bullish/Bearish]
      • MACD: [Bullish/Bearish]
    Detected patterns include:
      • [PATTERN 1] ([CONFIDENCE]% confidence, [bullish/bearish])
      
    Keep responses clear, concise, structured with bullet points, and use inline backticks like \`[Uptrend]\` or \`[Bullish]\` for key technical badges.
    
    ${context}
    ${memoryContext}`

    let reply = ''
    try {
      reply = await queryGemini(prompt, systemPrompt, history.slice(-6))
    } catch (primaryErr) {
      console.warn('Primary AI query failed, using Groq fallback:', primaryErr.message)
      try {
        reply = await queryGroq(prompt, systemPrompt, history.slice(-6))
      } catch (secondaryErr) {
        reply = `CURRENT MARKET ANALYSIS\nTradeWise AI Copilot is currently processing heavy traffic. Please ask your question again in a moment.\n  • Tip: Focus on maintaining a 1:2 risk-reward ratio per position.`
      }
    }

    res.json({ success: true, response: reply })
  } catch (err) {
    console.error('Error in secure chat route:', err.message)
    res.json({ 
      success: true, 
      response: `CURRENT MARKET ANALYSIS\nTradeWise AI Copilot is currently active. Please try re-sending your question.\n  • Tip: Maintain stop-losses on all open positions.` 
    })
  }
})

/**
 * POST /api/chat/portfolio-health
 * Analyzes portfolio health, metrics (Sharpe, Sortino, Volatility), and risk factors using Gemini 2.5 Pro.
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

    const openPositions = port.positions?.map(p => `${p.symbol}: Qty ${p.quantity} @ Entry $${p.entry_price}`).join(', ') || 'None'
    
    const systemPrompt = `You are a premium portfolio health auditor and risk analyst. Analyze the health and risk parameters of this trading portfolio.
    Provide a structural JSON response with these exact fields:
    - score: letter grade (A, B, C, D, or F)
    - verdict: short phrase (e.g. "Excellent Sizing", "Excessive Risk")
    - drawdownStatus: stable, caution, or dangerous
    - analysis: 2-3 sentence technical critique explaining their main weakness or strength and actionable recommendations.
    Return ONLY a raw JSON object. Do not wrap in markdown blocks.`

    const userPrompt = `Portfolio context:
    - Cash: $${port.cash_balance.toFixed(2)}
    - Starting Capital: $${port.starting_balance || 10000}
    - Open Holdings: ${openPositions}
    - Win Rate: ${met.win_rate}%
    - Closed Trades Count: ${met.closed_trades}
    - Profit Factor: ${met.profit_factor || '1.1'}
    - Max Drawdown: ${met.max_drawdown_percent}%
    - Sortino Ratio: ${met.sortino_ratio || '0.0'}
    - Sharpe Ratio: ${met.sharpe_ratio || '0.0'}
    - Volatility: ${met.volatility || '0.0'}%`

    const aiReply = await queryGemini(userPrompt, systemPrompt, [], true)
    
    let health = {
      score: met.win_rate >= 60 ? 'A' : met.win_rate >= 45 ? 'B' : 'C',
      verdict: met.win_rate >= 50 ? 'Healthy' : 'Needs Adjustment',
      drawdownStatus: met.max_drawdown_percent > 15 ? 'caution' : 'stable',
      analysis: `Your portfolio win rate is ${met.win_rate}% over ${met.closed_trades} trades. (Sandbox Mode)`
    }

    try {
      health = JSON.parse(aiReply)
    } catch (e) {
      console.warn('Failed to parse Gemini JSON reply for portfolio health:', e.message)
      if (typeof aiReply === 'string' && !aiReply.startsWith('{')) {
        health.analysis = aiReply
      }
    }

    res.json({ success: true, health })
  } catch (err) {
    console.error('Error in portfolio-health route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

/**
 * POST /api/chat/trade-journal
 * Reviews journal notes on a past trade to provide performance advice and update AI memory metrics.
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

    const summaryRes = await getPortfolioSummary(portfolioId)
    const userId = summaryRes.portfolio?.user_id || portfolioId

    const systemPrompt = `You are a professional trading mentor and psychologist. Review the user's trading notes alongside trade execution details:
    Context: ${tradeDetailText}
    
    Analyze the trade notes to identify mistakes, patterns, and psychological flaws.
    You must output ONLY a JSON object containing:
    - review: A concise 2-3 sentence performance critique.
    - fomo_adjustment: Integer (-1, 0, or 1) indicating how the FOMO score should change (e.g. +1 if they bought due to FOMO, -1 if they showed patience).
    - discipline_adjustment: Integer (-1, 0, or 1) indicating how the discipline score should change (e.g. -1 if they broke rules, +1 if they followed rules).
    - bias_adjustment: Integer (-1, 0, or 1) indicating how the confidence bias score should change.
    - mistake: A short description of a mistake if detected (e.g. "Chased market spike", otherwise null).
    - pattern: A short description of a behavioral pattern if detected (otherwise null).
    Return ONLY a raw JSON object. Do not wrap in markdown blocks.`

    const aiReply = await queryOpenAI(notes, systemPrompt, [], true)
    
    let analysis = {
      review: `Reviewed notes: "${notes}". Actionable tip: Keep risk per trade low and stick to rules.`,
      fomo_adjustment: 0,
      discipline_adjustment: 0,
      bias_adjustment: 0,
      mistake: null,
      pattern: null
    }

    try {
      const parsed = JSON.parse(aiReply)
      analysis = { ...analysis, ...parsed }
    } catch (e) {
      console.warn('Failed to parse OpenAI JSON response for trade journal:', e.message)
      if (typeof aiReply === 'string' && !aiReply.startsWith('{')) {
        analysis.review = aiReply
      }
    }

    // Load current AI memory and update it
    const memory = await getAiMemory(userId)
    if (memory) {
      const updates = {}
      if (analysis.fomo_adjustment) {
        updates.fomo_score = Math.max(0, Math.min(10, memory.fomo_score + analysis.fomo_adjustment))
      }
      if (analysis.discipline_adjustment) {
        updates.discipline_score = Math.max(0, Math.min(10, memory.discipline_score + analysis.discipline_adjustment))
      }
      if (analysis.bias_adjustment) {
        updates.confidence_bias_score = Math.max(0, Math.min(10, memory.confidence_bias_score + analysis.bias_adjustment))
      }
      
      const mistakes = Array.isArray(memory.past_mistakes) ? [...memory.past_mistakes] : []
      if (analysis.mistake && !mistakes.includes(analysis.mistake)) {
        mistakes.push(analysis.mistake)
        updates.past_mistakes = mistakes.slice(-10) // keep last 10
      }

      const patterns = Array.isArray(memory.behavior_patterns) ? [...memory.behavior_patterns] : []
      if (analysis.pattern && !patterns.includes(analysis.pattern)) {
        patterns.push(analysis.pattern)
        updates.behavior_patterns = patterns.slice(-10) // keep last 10
      }

      if (Object.keys(updates).length > 0) {
        await updateAiMemory(userId, updates)
      }
    }

    res.json({ success: true, review: analysis.review, analysis })
  } catch (err) {
    console.error('Error in trade-journal route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})


/**
 * GET /api/chat/memory/:portfolioId
 * Returns full AI Memory profile — both persistent behavioral scores and computed derived metrics.
 * Provides psychology_grade, disciplineTrend, fomoTrend, and improvement_rate in one response.
 */
router.get('/memory/:portfolioId', async (req, res) => {
  try {
    const { portfolioId } = req.params
    if (!portfolioId) {
      return res.status(400).json({ success: false, error: 'portfolioId is required.' })
    }

    const memory = await getAiMemory(portfolioId)
    if (!memory) {
      return res.status(404).json({ success: false, error: 'No AI memory profile found for this portfolio.' })
    }

    // Derive computed psychology grade from composite score
    const disciplineScore  = memory.discipline_score       ?? 5
    const fomoScore        = memory.fomo_score             ?? 5
    const confidenceBias   = memory.confidence_bias_score  ?? 5
    const compositeScore   = (disciplineScore * 0.45) + ((10 - fomoScore) * 0.30) + ((10 - confidenceBias) * 0.25)

    let psychology_grade = 'C'
    if (compositeScore >= 8.5)      psychology_grade = 'A+'
    else if (compositeScore >= 7.5) psychology_grade = 'A'
    else if (compositeScore >= 6.5) psychology_grade = 'B+'
    else if (compositeScore >= 5.5) psychology_grade = 'B'
    else if (compositeScore >= 4.5) psychology_grade = 'C+'
    else if (compositeScore >= 3.5) psychology_grade = 'C'
    else if (compositeScore >= 2.5) psychology_grade = 'D'
    else                            psychology_grade = 'F'

    const journalCount = memory.journal_count ?? 0
    const improvementRate = journalCount > 0
      ? Math.min(100, Math.round((compositeScore / 10) * 100))
      : 0

    res.json({
      success: true,
      memory: {
        discipline:         disciplineScore,
        fomo:               fomoScore,
        confidence_bias:    confidenceBias,
        risk_appetite:      memory.risk_appetite       ?? 5,
        patience:           memory.patience_score      ?? 5,
        experience_level:   memory.experience_level    ?? 'BEGINNER',
        risk_tolerance:     memory.risk_tolerance      ?? 'MODERATE',
        past_mistakes:      Array.isArray(memory.past_mistakes)    ? memory.past_mistakes    : [],
        behavior_patterns:  Array.isArray(memory.behavior_patterns) ? memory.behavior_patterns : [],
        journal_count:      journalCount,
        memory_version:     memory.memory_version      ?? 1,
        last_updated:       memory.updated_at          ?? null
      },
      derived: {
        psychology_grade,
        composite_score:    parseFloat(compositeScore.toFixed(2)),
        improvement_rate:   improvementRate,
        discipline_trend:   disciplineScore >= 6 ? '+' : disciplineScore <= 4 ? '-' : '~',
        fomo_trend:         fomoScore <= 4 ? '+' : fomoScore >= 7 ? '-' : '~'
      }
    })
  } catch (err) {
    console.error('Error in GET memory route:', err.message)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router

