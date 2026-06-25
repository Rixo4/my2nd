import { getDb } from '../database/init.js'
import { getSupabase, isSupabaseConfigured } from '../database/supabase.js'
import { v4 as uuidv4 } from 'uuid'

const MARKETAUX_KEY = process.env.MARKETAUX_API_KEY || ''
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

/**
 * Fetch news for a given symbol, analyze sentiment, cache results, and return them.
 * @param {string} symbol
 * @returns {Promise<Array>}
 */
export async function getSymbolNews(symbol) {
  const sym = symbol.toUpperCase()

  // 1. Check DB cache first
  try {
    if (isSupabaseConfigured) {
      const supabase = getSupabase()
      const sixHoursAgo = new Date(Date.now() - 6 * 3600 * 1000).toISOString()
      const { data: cached, error } = await supabase
        .from('news_sentiment')
        .select('*')
        .eq('symbol', sym)
        .gt('cached_at', sixHoursAgo)
        .order('published_at', { ascending: false })
        .limit(10)
      
      if (!error && cached && cached.length >= 3) {
        console.log(`ℹ️ Returning cached news sentiment for ${sym} (Supabase)`)
        return cached.map(d => ({
          id: d.id,
          symbol: d.symbol,
          title: d.title,
          summary: d.summary,
          sentiment_score: d.sentiment_score,
          source: d.source,
          published_at: Math.floor(new Date(d.published_at).getTime() / 1000),
          cached_at: Math.floor(new Date(d.cached_at).getTime() / 1000)
        }))
      }
    } else {
      const db = getDb()
      const cached = db.prepare(`
        SELECT * FROM news_sentiment 
        WHERE symbol = ? AND cached_at > ?
        ORDER BY published_at DESC LIMIT 10
      `).all(sym, Math.floor(Date.now() / 1000) - 6 * 3600) // 6 hours

      if (cached && cached.length >= 3) {
        console.log(`ℹ️ Returning cached news sentiment for ${sym} (SQLite)`)
        return cached
      }
    }
  } catch (err) {
    console.error('Error reading cached news:', err.message)
  }

  // 2. Fetch from Marketaux or fallback to Finnhub
  let articles = []
  if (MARKETAUX_KEY) {
    try {
      console.log(`🌐 Fetching news for ${sym} from Marketaux`)
      const res = await fetch(`https://api.marketaux.com/v1/news/all?symbols=${sym}&filter_entities=true&limit=10&api_token=${MARKETAUX_KEY}`)
      const data = await res.json()
      if (data && Array.isArray(data.data)) {
        articles = data.data.map(art => {
          const entity = art.entities?.find(e => e.symbol.toUpperCase() === sym)
          const sentiment = entity ? entity.sentiment_score : calculateHeuristicSentiment(art.title + ' ' + (art.description || ''))
          return {
            title: art.title || '',
            summary: art.description || art.snippet || '',
            source: art.source || 'Marketaux',
            publishedAt: art.published_at ? Math.floor(new Date(art.published_at).getTime() / 1000) : Math.floor(Date.now() / 1000),
            sentiment_score: sentiment
          }
        })
      }
    } catch (err) {
      console.error(`Failed to fetch from Marketaux for ${sym}:`, err.message)
    }
  }

  // Fallback to Finnhub if Marketaux fails or is unconfigured
  if (articles.length === 0 && FINNHUB_KEY) {
    try {
      console.log(`🌐 Fetching news for ${sym} from Finnhub fallback`)
      const querySymbol = ['BTC', 'ETH'].includes(sym) ? `BINANCE:${sym}USDT` : sym
      const toDate = new Date().toISOString().slice(0, 10)
      const fromDate = new Date(Date.now() - 3 * 24 * 3600).toISOString().slice(0, 10) // last 3 days
      
      const res = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${querySymbol}&from=${fromDate}&to=${toDate}&token=${FINNHUB_KEY}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        articles = data.slice(0, 10).map(art => ({
          title: art.headline || '',
          summary: art.summary || '',
          source: art.source || 'Finnhub',
          publishedAt: art.datetime || Math.floor(Date.now() / 1000)
        }))
      }
    } catch (err) {
      console.error(`Failed to fetch from Finnhub news for ${sym}:`, err.message)
    }
  }

  // If no news, use a dynamic fallback mock list so the app functions correctly
  if (articles.length === 0) {
    console.log(`⚠️ No active news API keys. Generating mocked news sentiment for ${sym}`)
    articles = [
      {
        title: `${sym} Market Rally Shows Strong Technical Momentum`,
        summary: `Analysts observe strong technical indicators for ${sym} as volume exceeds key support thresholds. RSI points to continued interest.`,
        source: 'CryptoAnalytica',
        publishedAt: Math.floor(Date.now() / 1000)
      },
      {
        title: `Macroeconomic Pressures Weigh on Major Asset Classes Including ${sym}`,
        summary: `Interest rate uncertainty is driving volatility across global markets, leading to consolidated range-bound action for ${sym}.`,
        source: 'FinanceWorld',
        publishedAt: Math.floor(Date.now() / 1000) - 7200
      }
    ]
  }

  // 3. Score sentiment (Groq or heuristic fallback)
  const evaluatedArticles = []
  const now = Math.floor(Date.now() / 1000)

  for (const art of articles) {
    let sentimentScore = art.sentiment_score !== undefined ? art.sentiment_score : 0

    if (art.sentiment_score === undefined) {
      if (GROQ_API_KEY) {
        try {
          const prompt = `Analyze the sentiment of this headline and summary for the symbol ${sym}. 
          Headline: "${art.title}"
          Summary: "${art.summary}"
          Return ONLY a JSON object with a single field: "sentiment" (a number between -1.0 for highly bearish and 1.0 for highly bullish). Do not explain.`

          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.1,
              max_tokens: 50,
              response_format: { type: 'json_object' }
            })
          })

          if (res.ok) {
            const data = await res.json()
            const json = JSON.parse(data.choices?.[0]?.message?.content || '{}')
            const score = parseFloat(json.sentiment)
            if (!isNaN(score)) {
              sentimentScore = Math.max(-1.0, Math.min(1.0, score))
            }
          }
        } catch (err) {
          console.error('Groq sentiment evaluation failed, falling back to heuristics:', err.message)
          sentimentScore = calculateHeuristicSentiment(art.title + ' ' + art.summary)
        }
      } else {
        sentimentScore = calculateHeuristicSentiment(art.title + ' ' + art.summary)
      }
    }

    evaluatedArticles.push({
      id: uuidv4(),
      symbol: sym,
      title: art.title,
      summary: art.summary,
      sentiment_score: sentimentScore,
      source: art.source,
      published_at: art.publishedAt,
      cached_at: now
    })
  }

  // 4. Cache in Database
  try {
    if (isSupabaseConfigured) {
      const supabase = getSupabase()
      await supabase.from('news_sentiment').delete().eq('symbol', sym)
      const rows = evaluatedArticles.map(item => ({
        id: item.id,
        symbol: item.symbol,
        title: item.title,
        summary: item.summary,
        sentiment_score: item.sentiment_score,
        source: item.source,
        published_at: new Date(item.published_at * 1000).toISOString(),
        cached_at: new Date(item.cached_at * 1000).toISOString()
      }))
      const uniqueRows = []
      const seenKeys = new Set()
      for (const row of rows) {
        const key = `${row.symbol}-${row.title}`
        if (!seenKeys.has(key)) {
          seenKeys.add(key)
          uniqueRows.push(row)
        }
      }
      const { error } = await supabase.from('news_sentiment').upsert(uniqueRows, { onConflict: 'symbol,title' })
      if (error) throw error
    } else {
      const db = getDb()
      const insert = db.prepare(`
        INSERT OR REPLACE INTO news_sentiment (id, symbol, title, summary, sentiment_score, source, published_at, cached_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)

      db.transaction(() => {
        db.prepare('DELETE FROM news_sentiment WHERE symbol = ?').run(sym)
        for (const item of evaluatedArticles) {
          insert.run(item.id, item.symbol, item.title, item.summary, item.sentiment_score, item.source, item.published_at, item.cached_at)
        }
      })()
    }
  } catch (err) {
    console.error('Failed to write news sentiment to database cache:', err.message)
  }

  return evaluatedArticles
}

/**
 * Fallback keyword scanner to calculate sentiment score.
 */
function calculateHeuristicSentiment(text) {
  const lower = text.toLowerCase()
  let score = 0

  const bullishWords = ['bull', 'rally', 'surge', 'gain', 'buy', 'growth', 'positive', 'breakout', 'support', 'upside', 'win', 'high']
  const bearishWords = ['bear', 'wilts', 'drop', 'fall', 'loss', 'sell', 'decline', 'negative', 'breakdown', 'resistance', 'downside', 'lose', 'low']

  bullishWords.forEach(w => {
    if (lower.includes(w)) score += 0.25
  })
  bearishWords.forEach(w => {
    if (lower.includes(w)) score -= 0.25
  })

  return Math.max(-1.0, Math.min(1.0, score))
}
