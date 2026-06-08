/**
 * Gemini API Service for AI ChatBot
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export async function generateGeminiResponse(prompt, context = '') {
  if (!GEMINI_API_KEY) {
    return {
      error: 'Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file.',
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

    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}`;

    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: fullPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Response:', errorText);
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API returned an error');
    }

    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';

    return {
      error: null,
      response: generatedText
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    return {
      error: error.message || 'Failed to connect to Gemini API',
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
