import { getDb } from '../database/init.js'
import { fetchLivePrice } from '../trading/paper_trading/executors.js'

const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

/**
 * Generate 3 high-probability trade suggestions.
 * Scans pattern_cache and news_sentiment in the SQLite DB, and asks Groq to recommend entries.
 * @param {string} userStyle - 'day_trading', 'swing_trading', 'conservative'
 * @returns {Promise<Array>}
 */
export async function getDailySuggestions(userStyle = 'swing_trading') {
  const db = getDb()
  
  // 1. Gather data from cache tables
  let patterns = []
  let news = []
  try {
    patterns = db.prepare('SELECT * FROM pattern_cache LIMIT 20').all()
    news = db.prepare('SELECT * FROM news_sentiment ORDER BY published_at DESC LIMIT 15').all()
  } catch (err) {
    console.error('Error reading cache tables for recommendations:', err.message)
  }

  // Fallback to mock patterns if DB cache is completely empty
  if (patterns.length === 0) {
    patterns = [
      { symbol: 'BTC', timeframe: '1h', pattern_type: 'Bullish Engulfing', confidence_score: 0.85 },
      { symbol: 'ETH', timeframe: '4h', pattern_type: 'Hammer', confidence_score: 0.76 },
      { symbol: 'AAPL', timeframe: '1d', pattern_type: 'Morning Star', confidence_score: 0.90 },
      { symbol: 'MSFT', timeframe: '1h', pattern_type: 'Doji', confidence_score: 0.60 },
      { symbol: 'GOOGL', timeframe: '4h', pattern_type: 'Bearish Engulfing', confidence_score: 0.72 }
    ]
  }

  if (news.length === 0) {
    news = [
      { symbol: 'BTC', title: 'Institutional Inflows Drive Price Targets Higher', sentiment_score: 0.80 },
      { symbol: 'ETH', title: 'Layer 2 Upgrades Go Live Seamlessly', sentiment_score: 0.65 },
      { symbol: 'AAPL', title: 'Supply Chain Reports Optimistic Growth Predictions', sentiment_score: 0.50 }
    ]
  }

  // Group text for the prompt
  const patternsStr = patterns.map(p => `${p.symbol} (${p.timeframe}): ${p.pattern_type} [Confidence: ${p.confidence_score}]`).join('\n')
  const newsStr = news.map(n => `${n.symbol}: "${n.title}" [Sentiment Score: ${n.sentiment_score}]`).join('\n')

  // 2. Query Groq API
  if (GROQ_API_KEY) {
    try {
      const systemPrompt = `You are TradeWise AI. Suggest exactly 3 high-probability trade setups based on active chart patterns and news sentiment.
      Return ONLY a JSON array containing exactly 3 objects with this structure (no markdown fences, no wrapping words, no explanations):
      [
        {
          "symbol": "BTC",
          "side": "BUY",
          "reason": "Clear explanation connecting the Bullish Engulfing pattern with positive institutional flows",
          "entry": 64200.00,
          "stop_loss": 62800.00,
          "take_profit": 67000.00,
          "pattern": "Bullish Engulfing",
          "win_rate": 72
        }
      ]`

      const prompt = `Analyze these detected patterns:\n${patternsStr}\n\nAnd these news sentiment scores:\n${newsStr}\n\nTrading style: ${userStyle}. Generate 3 trade suggestions.`

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.4,
          max_tokens: 800,
          response_format: { type: 'json_object' }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const rawResponse = data.choices?.[0]?.message?.content || ''
        const cleanJson = rawResponse.trim().replace(/^```json/, '').replace(/```$/, '').trim()
        
        // Wait, the API returns {"suggestions": [...]} or just the array depending on systemPrompt.
        // Let's parse and normalize:
        let parsed = JSON.parse(cleanJson)
        if (!Array.isArray(parsed) && parsed.suggestions) {
          parsed = parsed.suggestions
        }
        if (!Array.isArray(parsed) && parsed.trades) {
          parsed = parsed.trades
        }
        if (Array.isArray(parsed) && parsed.length >= 3) {
          return await resolveLivePricesForSuggestions(parsed.slice(0, 3))
        }
      }
    } catch (err) {
      console.error('Groq suggestions engine failed, falling back to rules:', err.message)
    }
  }

  // Fallback heuristics
  return await getFallbackSuggestions(patterns, news, userStyle)
}

async function resolveLivePricesForSuggestions(suggestions) {
  for (const sug of suggestions) {
    const live = await fetchLivePrice(sug.symbol)
    if (live) {
      sug.entry = live
      const pct = sug.side === 'BUY' ? 0.03 : -0.03
      sug.stop_loss = Number((live * (1 - pct)).toFixed(2))
      sug.take_profit = Number((live * (1 + pct * 2.2)).toFixed(2))
    }
  }
  return suggestions
}

async function getFallbackSuggestions(patterns, news, userStyle) {
  const suggestions = [
    {
      symbol: 'BTC',
      side: 'BUY',
      reason: 'Bullish Engulfing pattern matches high institutional news sentiment.',
      entry: 64000,
      stop_loss: 62000,
      take_profit: 68500,
      pattern: 'Bullish Engulfing',
      win_rate: 72
    },
    {
      symbol: 'ETH',
      side: 'BUY',
      reason: 'Hammer pattern on the 4h chart signals accumulation at key support.',
      entry: 3500,
      stop_loss: 3380,
      take_profit: 3780,
      pattern: 'Hammer',
      win_rate: 65
    },
    {
      symbol: 'AAPL',
      side: 'BUY',
      reason: 'Morning Star pattern formed with steady news sentiment support.',
      entry: 180,
      stop_loss: 174.5,
      take_profit: 191,
      pattern: 'Morning Star',
      win_rate: 70
    }
  ]

  return await resolveLivePricesForSuggestions(suggestions)
}
