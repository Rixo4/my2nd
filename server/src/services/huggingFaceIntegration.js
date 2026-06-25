import { queryGemini } from './ai.js'

/**
 * Generate adaptive lesson content from Gemini 2.5 Pro or fallback templates.
 * @param {string} topic 
 * @param {string} userLevel 
 * @param {string} mistakesPattern 
 * @returns {Promise<object>}
 */
export async function generateAdaptiveLesson(topic, userLevel = 'BEGINNER', mistakesPattern = 'None') {
  try {
    console.log(`🧠 Querying Gemini 2.5 Pro for topic "${topic}" (${userLevel})`)
    const prompt = `Create a detailed ${userLevel} level lesson on the trading topic: "${topic}". The user commonly makes these errors: "${mistakesPattern}".`
    const systemInstruction = `You are a premium virtual trading academy coach.
    You must format your response strictly as a JSON object with these exact fields:
    {
      "title": "Lesson title string",
      "explanation": "Clear, informative paragraph describing the pattern and mechanics",
      "example": "A specific trading scenario showing how to spot and apply it",
      "quiz": [
        { "question": "Quiz question 1", "options": ["A", "B", "C", "D"], "answer": 0, "rationale": "Why option 0 is correct" },
        { "question": "Quiz question 2", "options": ["A", "B", "C", "D"], "answer": 1, "rationale": "Why option 1 is correct" }
      ]
    }
    Return ONLY a raw JSON object. Do not include markdown wraps.`

    const reply = await queryGemini(prompt, systemInstruction, [], true)
    const resultObj = JSON.parse(reply)
    if (resultObj.title && resultObj.explanation) {
      return resultObj
    }
  } catch (err) {
    console.error('Gemini lesson generation failed, using educational fallback:', err.message)
  }

  // Fallback to local templates
  return getFallbackLesson(topic, userLevel)
}

/**
 * Generate a dynamic review quiz from past trades using Gemini 2.5 Pro or fallback templates.
 * @param {object} trade 
 * @returns {Promise<object>}
 */
export async function generateTradeReviewQuiz(trade) {
  try {
    console.log(`🧠 Generating trade review quiz via Gemini for trade: ${trade.id}`)
    const prompt = `Analyze this trade event and generate a review multiple choice question to help the trader learn:
    - Symbol: ${trade.symbol}
    - Type: ${trade.side}
    - Entry Price: ${trade.price}
    - Exit Price: ${trade.price + trade.pnl / trade.quantity}
    - Result PnL: $${trade.pnl} (${trade.pnl_percent}%)`

    const systemInstruction = `You are a professional trading coach. Analyze the trade and generate a multiple choice question to help the trader learn.
    You must return strictly a JSON object with these fields:
    {
      "question": "Quiz question review text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "rationale": "Actionable explanation of risk sizing or pattern triggers"
    }
    Return ONLY a raw JSON object. Do not include markdown wraps.`

    const reply = await queryGemini(prompt, systemInstruction, [], true)
    return JSON.parse(reply)
  } catch (err) {
    console.error('Failed to generate trade review quiz via Gemini, using fallback:', err.message)
  }

  // Fallback quiz
  return {
    question: `Your trade on ${trade.symbol} (${trade.side}) resulted in a P&L of $${trade.pnl.toFixed(2)}. What is the key lesson?`,
    options: [
      "Always set a clear stop-loss target before entry.",
      "Check volume trends to verify patterns.",
      "Consider news sentiment correlation.",
      "All of the above"
    ],
    answer: 3,
    rationale: `Successful trades on ${trade.symbol} require managing entry timing, volume checks, and risk guidelines simultaneously.`
  }
}

function getFallbackLesson(topic, userLevel) {
  const normalized = topic.toLowerCase()
  if (normalized.includes('doji') || normalized.includes('spinning')) {
    return {
      title: "Mastering Indecision: Doji & Spinning Top Patterns",
      explanation: "Doji patterns form when an asset's open and close prices are virtually equal. This represents a period of extreme indecision between buyers and sellers.",
      example: "After a sustained bullish rally, BTC prints a Dragonfly Doji with a long lower shadow. This indicates sellers pushed the price down, but buyers reclaimed it by close, suggesting a trend continuation or reversal.",
      quiz: [
        {
          question: "What does a Doji candle signify?",
          options: ["Strong bullish breakout", "Market indecision", "Guaranteed trend reversal", "Low volume volatility"],
          answer: 1,
          rationale: "Because the open and close prices are nearly identical, it signals that neither buyers nor sellers gained control."
        },
        {
          question: "Where is a Gravestone Doji typically found?",
          options: ["At the bottom of a downtrend", "At the top of an uptrend", "During sideways consolidation", "Only on daily charts"],
          answer: 1,
          rationale: "A Gravestone Doji indicates buying pressure failed to hold at high prices and typically signals a bearish reversal at the top of an uptrend."
        }
      ]
    }
  }

  // General fallback
  return {
    title: `Understanding Technical Patterns: ${topic}`,
    explanation: `An intermediate overview of ${topic} logic, analyzing trade signals, support levels, and indicators.`,
    example: `Spotting ${topic} setups under typical conditions, validating with volume trends.`,
    quiz: [
      {
        question: `How should a trader validate a ${topic} pattern?`,
        options: ["Trade instantly on signal", "Check support and volume confirmations", "Ignore other indicator levels", "Trade only during news releases"],
        answer: 1,
        rationale: "Volume and secondary confirmations help rule out false breakouts."
      }
    ]
  }
}
