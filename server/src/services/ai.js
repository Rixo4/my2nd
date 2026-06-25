import logger from './logger.js'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''

export const isGeminiConfigured = !!GEMINI_API_KEY
export const isOpenAIConfigured = !!OPENAI_API_KEY
export const isGroqConfigured = !!GROQ_API_KEY

/**
 * Query Gemini 2.5 Pro via REST
 * @param {string} prompt
 * @param {string} systemInstruction
 * @param {Array} history
 * @param {boolean} forceJson
 * @returns {Promise<string>}
 */
export async function queryGemini(prompt, systemInstruction = '', history = [], forceJson = false) {
  if (!isGeminiConfigured) {
    logger.warn('[AI Service] Gemini API key not configured. Using fallback sandbox reply.')
    if (forceJson) {
      return JSON.stringify({
        score: 'B',
        verdict: 'Healthy Sizing (Sandbox)',
        drawdownStatus: 'stable',
        analysis: 'This is a sandbox response because GEMINI_API_KEY is not set. Maintain your risk discipline.',
        riskScore: 45,
        diversificationScore: 70,
        weaknesses: ['Lack of active forex positions'],
        suggestions: ['Consider minor allocation in EURUSD to diversify crypto volatility.']
      })
    }
    return `[Gemini 2.5 Pro Sandbox] I received your prompt: "${prompt.slice(0, 100)}...". Set a stop loss of 2% and manage your leverage. Educational disclaimer: This is simulated advice.`
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`
    
    // Map history to Gemini's format: roles are 'user' or 'model'
    const contents = []
    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })
    }
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    })

    const body = {
      contents,
      generationConfig: {
        temperature: 0.7,
        responseMimeType: forceJson ? 'application/json' : 'text/plain'
      }
    }

    if (systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: systemInstruction }]
      }
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Gemini API Error status ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!reply) {
      throw new Error('Empty response from Gemini API candidates.')
    }
    return reply.trim()
  } catch (err) {
    logger.error(`[AI Service] Gemini query failed: ${err.message}`)
    throw err
  }
}

/**
 * Query OpenAI GPT-4o-mini via REST
 * @param {string} prompt
 * @param {string} systemInstruction
 * @param {Array} history
 * @param {boolean} forceJson
 * @returns {Promise<string>}
 */
export async function queryOpenAI(prompt, systemInstruction = '', history = [], forceJson = false) {
  if (!isOpenAIConfigured) {
    logger.warn('[AI Service] OpenAI API key not configured. Using fallback sandbox reply.')
    if (forceJson) {
      // Mock for copilot analyze
      return JSON.stringify({
        rating: 'HOLD',
        confidence: 0.65,
        stop_loss: 0,
        entry_point: 0,
        target_price: 0,
        rationale: 'This is a mock sandbox analysis. Please configure your OPENAI_API_KEY in server/.env to get real-time GPT-4o-mini technical parsing.',
        mlPrediction: 0.50,
        regime: 'SIDEWAYS',
        regimePenalty: 0,
        positiveSignals: ['Technical baseline support hold'],
        negativeSignals: ['Low volume indicators']
      })
    }
    return `[GPT-4o-mini Sandbox] Review of trade: Notes: "${prompt}". Focus on risk metrics. Maintain discipline and track emotions.`
  }

  try {
    const url = 'https://api.openai.com/v1/chat/completions'
    const messages = []
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction })
    }
    for (const msg of history) {
      messages.push({ role: msg.role, content: msg.content })
    }
    messages.push({ role: 'user', content: prompt })

    const body = {
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      response_format: forceJson ? { type: 'json_object' } : undefined
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`OpenAI API Error status ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content
    if (!reply) {
      throw new Error('Empty response from OpenAI API.')
    }
    return reply.trim()
  } catch (err) {
    logger.error(`[AI Service] OpenAI query failed: ${err.message}`)
    throw err
  }
}

/**
 * Query Groq (llama-3.1-8b-instant) via REST
 * @param {string} prompt
 * @param {string} systemInstruction
 * @param {Array} history
 * @returns {Promise<string>}
 */
export async function queryGroq(prompt, systemInstruction = '', history = []) {
  if (!isGroqConfigured) {
    logger.warn('[AI Service] Groq API key not configured. Using fallback sandbox reply.')
    return `[Groq Q&A Sandbox] Thanks for asking. Standard rules: keep position sizes small (under 1-2% risk). Volatility can trigger stop-losses. This is educational advice.`
  }

  try {
    const url = 'https://api.groq.com/openai/v1/chat/completions'
    const messages = []
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction })
    }
    for (const msg of history) {
      messages.push({ role: msg.role === 'user' ? 'user' : 'assistant', content: msg.content })
    }
    messages.push({ role: 'user', content: prompt })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        temperature: 0.7,
        max_tokens: 300
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Groq API Error status ${res.status}: ${errText}`)
    }

    const data = await res.json()
    const reply = data.choices?.[0]?.message?.content
    if (!reply) {
      throw new Error('Empty response from Groq API.')
    }
    return reply.trim()
  } catch (err) {
    logger.error(`[AI Service] Groq query failed: ${err.message}`)
    throw err
  }
}
