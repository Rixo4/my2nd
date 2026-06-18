/**
 * Groq API Service for AI ChatBot
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export async function generateGeminiResponse(prompt, context = '') {
  if (!GROQ_API_KEY) {
    return {
      error: 'Groq API key not configured. Please add VITE_GROQ_API_KEY to your .env file.',
      response: null
    };
  }

  try {
    const systemPrompt = `You are TradeWise AI, an expert trading assistant specializing in candlestick pattern analysis, technical analysis, and market insights. 
    You help traders understand patterns, market trends, and trading strategies.
    Keep responses concise, professional, and focused on trading education.
    If asked about specific patterns, explain them clearly with entry/exit considerations.
    Always include a disclaimer that this is not financial advice.
    
    ${context}`;

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 0.95,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API returned an error');
    }

    const generatedText = data.choices?.[0]?.message?.content || 'No response generated';

    return {
      error: null,
      response: generatedText
    };
  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      error: error.message || 'Failed to connect to Groq API',
      response: null
    };
  }
}

export async function generateTradingInsight(symbol, patterns, trend) {
  const context = `
    Current Analysis:
    - Symbol: ${symbol}
    - Market Trend: ${trend}
    - Detected Patterns: ${patterns.map(p => p.pattern).join(', ') || 'None'}
    - Number of Patterns: ${patterns.length}
  `;

  const prompt = `Based on the current analysis for ${symbol}, provide trading insights. 
  Consider the detected patterns and market trend. 
  What should a trader watch for? 
  What are the key support/resistance levels to monitor?
  Provide actionable trading education.`;

  return generateGeminiResponse(prompt, context);
}
