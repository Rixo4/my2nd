import { Router } from 'express'
import { getCandles } from '../src/services/marketScanner.js'
import { computeTechnicalSummary } from '../src/services/technicalIndicators.js'
import { getDb } from '../src/database/init.js'
import { getSupabase, isSupabaseConfigured } from '../src/database/supabase.js'
import logger from '../src/services/logger.js'
import { getAiMemory } from '../src/trading/paper_trading/models.js'
import { predictWinProbability } from '../src/services/mlPredictor.js'
import { detectMarketRegime, getRegimePenalty } from '../src/services/regimeDetector.js'
import { queryOpenAI } from '../src/services/ai.js'

const router = Router()

const BASELINES = {
  AAPL: 180, MSFT: 420, GOOGL: 175, AMZN: 190, NVDA: 850, TSLA: 240, META: 480, RELIANCE: 2950, TCS: 4100, INFY: 1600,
  BTC: 65000, ETH: 3500, BNB: 590, SOL: 170, XRP: 0.60, ADA: 0.45, DOT: 7.2, AVAX: 35.5, DOGE: 0.15, MATIC: 0.70,
  EURUSD: 1.085, GBPUSD: 1.265, USDJPY: 153.4, AUDUSD: 0.655, USDCAD: 1.352, USDCHF: 0.905, NZDUSD: 0.602, EURGBP: 0.858
}

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

/**
 * POST /api/copilot/analyze
 * Body: { symbol, portfolioId, userId }
 */
router.post('/analyze', async (req, res) => {
  try {
    const { symbol, portfolioId, userId } = req.body || {}
    if (!symbol) {
      return res.status(400).json({ success: false, error: 'Missing symbol in request body.' })
    }

    const sym = symbol.toUpperCase()
    
    // 1. Fetch candles
    let candles = await getCandles(sym, 50)
    if (!candles || candles.length < 26) {
      logger.warn(`[copilot] Insufficient candles for ${sym}, generating mock fallback history.`)
      const basePrice = BASELINES[sym] || 100
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

    // 4. Compute indicators for GBDT ML Predictor
    const lastIdx = candles.length - 1
    const prevVol = candles[lastIdx - 1]?.volume || 0
    const vol_change = prevVol > 0 ? (candles[lastIdx].volume - prevVol) / prevVol : 0
    
    const slice14 = candles.slice(-14)
    const highs = slice14.map(c => c.high)
    const lows = slice14.map(c => c.low)
    const sumHighs = highs.reduce((sum, val) => sum + val, 0)
    const sumLows = lows.reduce((sum, val) => sum + val, 0)
    const atr = (sumHighs - sumLows) / 14
    const atr_pct = (atr / currentPrice) * 100

    const mlFeatures = {
      rsi: tech.rsi,
      macdHist: tech.macd.histogram,
      volumeChange: vol_change,
      atrPercent: atr_pct,
      patternSignal: tech.rsi < 35 ? 1.0 : (tech.rsi > 65 ? -1.0 : 0.0)
    }

    // Run ML win probability
    const mlRes = predictWinProbability(mlFeatures)

    // 5. Detect market regime & calculate regime penalty
    const regimeInfo = detectMarketRegime(candles)

    // 6. Fetch user AI Memory if available
    let resolvedUserId = userId
    if (!resolvedUserId && portfolioId) {
      try {
        const db = getDb()
        let row
        if (isSupabaseConfigured) {
          const supabase = getSupabase()
          const { data } = await supabase.from('portfolios').select('user_id').eq('id', portfolioId).maybeSingle()
          resolvedUserId = data?.user_id
        } else {
          row = db.prepare('SELECT user_id FROM user_portfolios WHERE id = ?').get(portfolioId)
          resolvedUserId = row?.user_id
        }
      } catch (err) {
        console.error('[copilot] Failed to resolve user ID:', err.message)
      }
    }

    let aiMemory = null
    if (resolvedUserId) {
      try {
        aiMemory = await getAiMemory(resolvedUserId)
      } catch (err) {
        console.error('[copilot] Failed to load user AI Memory:', err.message)
      }
    }

    // Determine initial rating based on technical analysis
    let ruleRating = 'HOLD'
    if (tech.rsi < 30 && tech.macd.histogram > 0 && tech.trend === 'BULLISH') {
      ruleRating = 'BUY'
    } else if (tech.rsi > 70 && tech.macd.histogram < 0 && tech.trend === 'BEARISH') {
      ruleRating = 'SELL'
    } else {
      let buySignals = 0
      let sellSignals = 0
      if (tech.rsi < 40) buySignals++
      if (tech.rsi > 60) sellSignals++
      if (tech.macd.histogram > 0) buySignals++
      if (tech.macd.histogram < 0) sellSignals++
      if (tech.trend === 'BULLISH') buySignals++
      if (tech.trend === 'BEARISH') sellSignals++
      
      if (buySignals >= 2) ruleRating = 'BUY'
      else if (sellSignals >= 2) ruleRating = 'SELL'
    }

    // Apply regime penalty to confidence
    const regimePenalty = getRegimePenalty(regimeInfo.regime, ruleRating)
    
    // Adjust final win probability confidence based on penalty
    let finalConfidence = mlRes.probability + (regimePenalty / 100)
    finalConfidence = Math.max(0.10, Math.min(0.95, finalConfidence))

    // Formulate prompt for OpenAI GPT-4o-mini
    const newsContext = news.length === 0 
      ? 'No recent company news articles cached.'
      : news.map(n => `- Title: "${n.title}" (Sentiment Score: ${n.sentiment_score})`).join('\n')

    const memoryPromptContext = aiMemory 
      ? `- Risk Tolerance: ${aiMemory.risk_tolerance}
         - Experience Level: ${aiMemory.experience_level}
         - Favorite Assets: ${JSON.stringify(aiMemory.favorite_assets)}
         - Past mistakes: ${JSON.stringify(aiMemory.past_mistakes)}`
      : 'None'

    const systemPrompt = `You are TradeWise AI Market Copilot, an expert quantitative technical analyst.
    Analyze the technical indicators, machine learning win probabilities, market regime, news sentiment, and user profile constraints to generate a personalized technical copilot report.
    You must return a valid JSON object matching the schema below:
    {
      "rating": "BUY" | "SELL" | "HOLD",
      "confidence": float (between 0.0 and 1.0),
      "stop_loss": float (recommended stop loss price),
      "entry_point": float (recommended entry price),
      "target_price": float (recommended target profit price),
      "rationale": "A concise 2-sentence explanation of your technical, ML, and market regime reasoning."
    }
    Return ONLY raw JSON, do not include markdown wraps.`

    const userPrompt = `Asset: ${sym}
    Current Price: $${currentPrice.toFixed(4)}
    
    Indicators:
    - Trend: ${tech.trend}
    - RSI: ${tech.rsi.toFixed(2)}
    - MACD Histogram: ${tech.macd.histogram.toFixed(4)}
    - Support: $${tech.support.toFixed(4)}
    - Resistance: $${tech.resistance.toFixed(4)}
    
    Machine Learning Model Prediction:
    - GBDT Predicted Win Probability: ${(mlRes.probability * 100).toFixed(2)}%
    - Top ML Factors: ${mlRes.topFactors.join(', ')}
    - Model Accuracy: ${(mlRes.metadata.accuracy * 100).toFixed(2)}% (Version: ${mlRes.metadata.version})
    
    Market Regime:
    - Current Trend Regime: ${regimeInfo.regime} (${regimeInfo.description})
    - Trend Regime Penalty Applied: ${regimePenalty}%
    
    User Profile:
    ${memoryPromptContext}
    
    News Sentiment Context:
    ${newsContext}
    
    Suggested Baseline rating is ${ruleRating} and adjusted confidence is ${finalConfidence.toFixed(2)}. Adjust stop_loss and target_price around the support/resistance pivots.`

    let analysis = null

    try {
      logger.info(`[copilot] Querying OpenAI (gpt-4o-mini) for structured copilot analysis: ${sym}`)
      const aiReply = await queryOpenAI(userPrompt, systemPrompt, [], true)
      analysis = JSON.parse(aiReply)
    } catch (err) {
      logger.error(`[copilot] OpenAI GPT-4o-mini request failed, using mathematical fallback: ${err.message}`)
    }

    if (!analysis || !analysis.rating) {
      const atr = currentPrice * 0.03
      let stop_loss = currentPrice - atr
      let target_price = currentPrice + atr * 2
      if (ruleRating === 'SELL') {
        stop_loss = currentPrice + atr
        target_price = currentPrice - atr * 2
      }

      analysis = {
        rating: ruleRating,
        confidence: finalConfidence,
        stop_loss: Number(stop_loss.toFixed(4)),
        entry_point: Number(currentPrice.toFixed(4)),
        target_price: Number(target_price.toFixed(4)),
        rationale: `Rule-based analysis indicates ${ruleRating} based on RSI of ${tech.rsi.toFixed(1)} and ${regimeInfo.regime} market regime.`
      }
    }

    // Build signals for XAI Panel
    const positiveSignals = []
    const negativeSignals = []

    if (tech.rsi < 35) positiveSignals.push('RSI Oversold')
    else if (tech.rsi > 65) negativeSignals.push('RSI Overbought')

    if (tech.macd.histogram > 0) positiveSignals.push('MACD Momentum Bullish')
    else negativeSignals.push('MACD Momentum Bearish')

    if (regimeInfo.regime === 'BULL') positiveSignals.push('Bull Market Trend Regime')
    else if (regimeInfo.regime === 'BEAR') negativeSignals.push('Bear Market Trend Regime')

    if (mlRes.probability > 0.60) positiveSignals.push(`ML Model Confidence Strong (${(mlRes.probability * 100).toFixed(0)}%)`)
    else if (mlRes.probability < 0.40) negativeSignals.push(`ML Model Confidence Weak (${(mlRes.probability * 100).toFixed(0)}%)`)

    const avgSentiment = news.length > 0
      ? news.reduce((acc, n) => acc + (n.sentiment_score || 0), 0) / news.length
      : 0
    if (avgSentiment > 0.15) positiveSignals.push('Positive News Sentiment')
    else if (avgSentiment < -0.15) negativeSignals.push('Negative News Sentiment')

    return res.json({
      success: true,
      symbol: sym,
      currentPrice,
      indicators: tech,
      analysis: {
        rating: analysis.rating,
        confidence: analysis.confidence,
        stop_loss: analysis.stop_loss,
        entry_point: analysis.entry_point,
        target_price: analysis.target_price,
        rationale: analysis.rationale,
        mlPrediction: mlRes.probability,
        mlMetadata: mlRes.metadata,
        topFactors: mlRes.topFactors,
        regime: regimeInfo.regime,
        regimePenalty,
        positiveSignals: positiveSignals.slice(0, 3),
        negativeSignals: negativeSignals.slice(0, 3)
      }
    })

  } catch (err) {
    logger.error(`[copilot] Analysis route crash: ${err.message}`)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
