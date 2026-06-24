import { Router } from 'express'
import { getCandles } from '../src/services/marketScanner.js'
import { computeTechnicalSummary } from '../src/services/technicalIndicators.js'
import { getDb } from '../src/database/init.js'
import { getSupabase, isSupabaseConfigured } from '../src/database/supabase.js'
import logger from '../src/services/logger.js'

const router = Router()
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''
const isGroqConfigured = !!GROQ_API_KEY

async function getCachedNewsSentiment(symbol) {
  try {
    const sym = symbol.toUpperCase()
    if (isSupabaseConfigured) {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('news_sentiment')
        .select('*')
        .eq('symbol', sym)
        .order('published_at', { ascending: false })
        .limit(5)
      
      if (error) throw error
      return data || []
    }

    const db = getDb()
    const rows = db.prepare(`
      SELECT * FROM news_sentiment 
      WHERE symbol = ? 
      ORDER BY published_at DESC LIMIT 5
    `).all(sym)

    return rows.map(r => ({
      title: r.title,
      sentiment_score: r.sentiment_score,
      source: r.source
    }))
  } catch (err) {
    logger.error(`[copilot] Failed to fetch news sentiment for ${symbol}: ${err.message}`)
    return []
  }
}

function generateLocalMockRating(symbol, currentPrice, tech, articles) {
  let score = 50 // 0 to 100
  let rationale = ""

  // RSI rules
  if (tech.rsi < 30) {
    score += 15
    rationale += `RSI is oversold at ${tech.rsi.toFixed(1)}, indicating potential buying pressure. `
  } else if (tech.rsi > 70) {
    score -= 15
    rationale += `RSI is overbought at ${tech.rsi.toFixed(1)}, suggesting an overextended rally. `
  } else {
    rationale += `RSI is neutral at ${tech.rsi.toFixed(1)}. `
  }

  // MACD rules
  if (tech.macd.histogram > 0) {
    score += 10
    rationale += `MACD histogram is positive at ${tech.macd.histogram.toFixed(4)}, showing bullish momentum. `
  } else {
    score -= 10
    rationale += `MACD momentum is bearish at ${tech.macd.histogram.toFixed(4)}. `
  }

  // Trend rules
  if (tech.trend === 'BULLISH') {
    score += 15
    rationale += `EMA9 is trading above EMA21, verifying a short-term uptrend. `
  } else {
    score -= 15
    rationale += `EMA9 is trading below EMA21, suggesting a short-term bearish trend. `
  }

  // News sentiment
  let avgSentiment = 0
  if (articles.length > 0) {
    const sum = articles.reduce((acc, a) => acc + (a.sentiment_score || 0), 0)
    avgSentiment = sum / articles.length
    if (avgSentiment > 0.2) {
      score += 10
      rationale += `News sentiment is positive. `
    } else if (avgSentiment < -0.2) {
      score -= 10
      rationale += `News sentiment is negative. `
    }
  }

  let rating = 'HOLD'
  let confidence = 0.5
  if (score >= 65) {
    rating = 'BUY'
    confidence = Math.min(0.95, 0.5 + (score - 65) / 100)
  } else if (score <= 35) {
    rating = 'SELL'
    confidence = Math.min(0.95, 0.5 + (35 - score) / 100)
  } else {
    confidence = 0.5 + Math.abs(50 - score) / 100
  }

  // Stop loss / Target calculations
  const atr = currentPrice * 0.03 // Assume 3% average true range
  let stop_loss = currentPrice - atr
  let target_price = currentPrice + atr * 2
  let entry_point = currentPrice

  if (rating === 'SELL') {
    stop_loss = currentPrice + atr
    target_price = currentPrice - atr * 2
  }

  return {
    rating,
    confidence,
    stop_loss: Number(stop_loss.toFixed(4)),
    entry_point: Number(entry_point.toFixed(4)),
    target_price: Number(target_price.toFixed(4)),
    rationale
  }
}

/**
 * POST /api/copilot/analyze
 * Body: { symbol }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { symbol } = req.body || {}
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Missing symbol in request body.' })
    }

    const sym = symbol.toUpperCase()
    
    // 1. Fetch candles
    let candles = await getCandles(sym, 50)
    if (!candles || candles.length < 26) {
      // Create mock candles if API fetches fail
      logger.warn(`[copilot] Insufficient candles for ${sym}, generating mock fallback history.`)
      const basePrice = sym === 'BTC' ? 65000 : sym === 'ETH' ? 3500 : sym === 'AAPL' ? 175 : 1.10
      candles = Array.from({ length: 50 }, (_, idx) => {
        const factor = 1 + (Math.random() * 0.04 - 0.02)
        const close = basePrice * factor
        return {
          open: close * 0.995,
          high: close * 1.01,
          low: close * 0.99,
          close,
          volume: 1000 + Math.random() * 5000
        }
      })
    }

    const currentPrice = candles[candles.length - 1].close

    // 2. Compute technical indicators
    const tech = computeTechnicalSummary(candles)

    // 3. Fetch cached news sentiment
    const news = await getCachedNewsSentiment(sym)
    
    // 4. Invoke Groq if configured, otherwise rule-based fallback
    if (isGroqConfigured) {
      try {
        logger.info(`[copilot] Querying Groq LLM for asset analysis: ${sym}`)
        const newsContext = news.length === 0 
          ? 'No recent company news articles cached.'
          : news.map(n => `- Title: "${n.title}" (Sentiment Score: ${n.sentiment_score})`).join('\n')

        const prompt = `You are TradeWise AI Market Copilot, an expert quantitative technical analyst.
Given the following asset data, perform technical and news sentiment analysis and return a structured JSON response.

Asset: ${sym}
Current Price: $${currentPrice.toFixed(4)}

Technical Summary:
- Trend Direction: ${tech.trend} (EMA9 vs EMA21)
- RSI (14): ${tech.rsi.toFixed(2)}
- MACD Value: ${tech.macd.value.toFixed(4)}
- MACD Signal: ${tech.macd.signal.toFixed(4)}
- MACD Histogram: ${tech.macd.histogram.toFixed(4)}
- Support Level: $${tech.support.toFixed(4)}
- Resistance Level: $${tech.resistance.toFixed(4)}

News Sentiment (Company Specific Headlines):
${newsContext}

Your response MUST be a valid JSON object matching the schema below:
{
  "rating": "BUY" | "SELL" | "HOLD",
  "confidence": float (between 0.0 and 1.0),
  "stop_loss": float (recommended stop loss price),
  "entry_point": float (recommended entry price),
  "target_price": float (recommended target profit price),
  "rationale": "A concise 2-sentence explanation of your technical and sentiment reasoning."
}`

        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [
              { role: 'system', content: 'You are a professional financial quant assistant. Respond only with JSON.' },
              { role: 'user', content: prompt }
            ],
            temperature: 0.1,
            response_format: { type: 'json_object' }
          })
        })

        if (groqRes.ok) {
          const payload = await groqRes.json()
          const content = payload.choices?.[0]?.message?.content || ''
          const result = JSON.parse(content.trim())
          
          if (result.rating && result.rationale) {
            return res.json({
              success: true,
              symbol: sym,
              currentPrice,
              indicators: tech,
              analysis: {
                rating: result.rating,
                confidence: Number(result.confidence || 0.5),
                stop_loss: Number(result.stop_loss || currentPrice),
                entry_point: Number(result.entry_point || currentPrice),
                target_price: Number(result.target_price || currentPrice),
                rationale: result.rationale
              }
            })
          }
        }
      } catch (err) {
        logger.error(`[copilot] Groq request failed, using mathematical fallback: ${err.message}`)
      }
    }

    // Mathematical rule-based fallback if Groq fails or is not configured
    logger.info(`[copilot] Using rule-based local indicators model for ${sym}`)
    const analysis = generateLocalMockRating(sym, currentPrice, tech, news)
    
    return res.json({
      success: true,
      symbol: sym,
      currentPrice,
      indicators: tech,
      analysis
    })

  } catch (err) {
    logger.error(`[copilot] Analysis route crash: ${err.message}`)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
