import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, X, Minimize2, Maximize2, RefreshCw } from 'lucide-react'

// Helper function to parse and format assistant messages like Image 1 & 2
function FormattedMessage({ content }) {
  const lines = content.split('\n')
  
  return (
    <div className="flex flex-col gap-2 text-xs md:text-sm leading-relaxed text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={idx} className="h-1" />

        // Header check (e.g., CURRENT MARKET ANALYSIS or ### Headers)
        if (trimmed.startsWith('###') || trimmed === 'CURRENT MARKET ANALYSIS' || trimmed.toUpperCase() === trimmed && trimmed.length < 35 && !trimmed.includes(':')) {
          const headerText = trimmed.replace(/^#+\s*/, '')
          return (
            <div key={idx} className="border-b border-slate-700/80 pb-1.5 mt-1 mb-1">
              <h4 className="text-white font-extrabold text-xs md:text-sm tracking-wider uppercase">{headerText}</h4>
            </div>
          )
        }

        // Bullet point lines
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const bulletContent = trimmed.replace(/^[•\-\*]\s*/, '')
          
          // Split title/colon if present
          const colonIdx = bulletContent.indexOf(':')
          if (colonIdx !== -1) {
            const title = bulletContent.slice(0, colonIdx)
            const rest = bulletContent.slice(colonIdx + 1)
            
            // Format badges inside rest text
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-slate-500 font-bold mt-0.5">•</span>
                <div className="flex-1 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-300">{title}:</span>
                  <FormattedBadges text={rest} />
                </div>
              </div>
            )
          }

          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-slate-500 font-bold mt-0.5">•</span>
              <div className="flex-1">
                <FormattedBadges text={bulletContent} />
              </div>
            </div>
          )
        }

        // Regular paragraph with potential bold and inline badges
        return (
          <p key={idx} className="text-slate-300 font-normal">
            <FormattedBadges text={trimmed} />
          </p>
        )
      })}
    </div>
  )
}

// Helper to format inline badges like `Analyzing...`, `Uptrend`, `Neutral`, numbers, etc.
function FormattedBadges({ text }) {
  // Regex to capture markdown bold **text** or backticks `code` or words in brackets [word]
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\])/g)

  return (
    <>
      {parts.map((part, i) => {
        if (!part) return null

        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-extrabold text-white">{part.slice(2, -2)}</strong>
        }

        if ((part.startsWith('`') && part.endsWith('`')) || (part.startsWith('[') && part.endsWith(']'))) {
          const raw = part.slice(1, -1)
          const lower = raw.toLowerCase()
          let colorClass = 'bg-slate-900 border-slate-700/80 text-purple-300'
          if (lower.includes('uptrend') || lower.includes('bullish') || lower.includes('buy')) {
            colorClass = 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 font-semibold'
          } else if (lower.includes('downtrend') || lower.includes('bearish') || lower.includes('sell')) {
            colorClass = 'bg-rose-950/60 border-rose-500/40 text-rose-400 font-semibold'
          } else if (lower.includes('analyzing') || lower.includes('neutral') || lower.includes('sideways')) {
            colorClass = 'bg-slate-900 border-emerald-500/30 text-emerald-400 font-mono'
          }

          return (
            <span key={i} className={`px-2 py-0.5 rounded text-[11px] font-mono border ${colorClass} inline-block my-0.5`}>
              {raw}
            </span>
          )
        }

        return <span key={i}>{part}</span>
      })}
    </>
  )
}

export default function ChatBot({ symbol = 'BTC', patterns = [], trend = 'Analyzing...', candles = [], timeframe = '1d', isMinimized, onToggleMinimize, portfolioId }) {
  const lastCandle = candles && candles.length > 0 ? candles[candles.length - 1] : null
  const currentPrice = lastCandle ? lastCandle.close.toFixed(2) : '0.00'

  // Generate dynamic welcome card data
  const patternNames = patterns && patterns.length > 0 
    ? patterns.slice(0, 3).map(p => `${p.pattern} (${p.confidence}% confidence${p.signal ? `, ${p.signal}` : ''})`).join('\n  • ')
    : 'none'

  const initialWelcomeText = `Hello there! 👋 It's nice to meet you!\n\nI am **Chartify AI Copilot**, your real-time charting assistant. Currently tracking **${symbol}**:\n  • Price: $${currentPrice}\n  • Trend Regime: \`[ ${trend} ]\`\n  • Detected Patterns: \`[ ${patterns.length > 0 ? patterns[0].pattern : 'none'} ]\`\n  • Technicals: RSI: \`[ 50 ]\` (Neutral), EMA Cross: \`[ Bearish ]\`\n\nPlease, use the quick-questions below or ask me anything about Chartify!`

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: initialWelcomeText,
      isWelcomeCard: true
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = async (overridePrompt) => {
    const promptToSend = overridePrompt || input
    if (!promptToSend.trim() || isLoading) return

    const userMessage = { role: 'user', content: promptToSend }
    setMessages(prev => [...prev, userMessage])
    if (!overridePrompt) setInput('')
    setIsLoading(true)

    try {
      // Build rich market analysis prompt context
      const fullPrompt = `${promptToSend}\n[Current Context: Symbol=${symbol}, Timeframe=${timeframe}, Price=$${currentPrice}, Trend=${trend}, DetectedPatterns=${patterns.slice(0, 3).map(p => p.pattern).join(', ') || 'None'}]`

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
          portfolioId,
          history: messages.filter(m => !m.isWelcomeCard).slice(-6)
        })
      })
      const data = await res.json()

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error || 'Failed to get response.'}` }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Failed to connect to server. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickQuestion = (questionType) => {
    let q = ''
    if (questionType === 'market') {
      q = `Provide a full CURRENT MARKET ANALYSIS for ${symbol} on the ${timeframe} timeframe.`
    } else if (questionType === 'patterns') {
      q = `Explain all detected candlestick patterns for ${symbol} with win rates.`
    } else if (questionType === 'strategy') {
      q = `What is the optimal entry, stop-loss, and target price for ${symbol} given the ${trend} trend?`
    } else if (questionType === 'risk') {
      q = `What key risk management rules should I follow when trading ${symbol}?`
    }
    if (q) handleSend(q)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isMinimized) {
    return (
      <button
        onClick={onToggleMinimize}
        className="fixed bottom-20 lg:bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-brand-500 hover:from-purple-500 hover:to-brand-400 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 z-50 group border border-purple-400/30"
      >
        <Bot size={24} className="text-white" />
        <span className="absolute right-16 bg-surface-900 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
          Chartify AI Copilot
        </span>
      </button>
    )
  }

  return (
    <div className={`fixed bottom-20 lg:bottom-6 right-6 bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl z-50 flex flex-col transition-all duration-300 max-w-[calc(100vw-2rem)] ${isExpanded ? 'w-[540px] h-[calc(100vh-48px)] max-h-[640px]' : 'w-[400px] h-[calc(100vh-80px)] max-h-[540px]'}`}>
      
      {/* ── Header Bar ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border-b border-slate-800/80 p-3.5 rounded-t-2xl flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-brand-500 rounded-lg flex items-center justify-center shadow-inner">
            <Sparkles size={16} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-extrabold text-xs uppercase tracking-wider">CHARTIFY AI COPILOT</h3>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-slate-400 text-[10px] font-mono">Tracking {symbol} • {timeframe}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Messages Stream ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.map((message, index) => (
          <div key={index} className="flex flex-col gap-1">
            {/* Header label above bubble matching user screenshots */}
            <span className={`text-[10px] font-extrabold uppercase tracking-widest text-slate-500 ${message.role === 'user' ? 'text-right pr-1' : 'pl-1'}`}>
              {message.role === 'user' ? 'YOU' : 'CHARTIFYBOT'}
            </span>

            <div className={message.role === 'user' ? 'self-end max-w-[85%]' : 'w-full'}>
              <div
                className={
                  message.role === 'user'
                    ? 'bg-slate-900 border border-slate-700/80 text-white rounded-2xl px-4 py-2.5 text-xs md:text-sm shadow-md'
                    : 'bg-slate-950/80 border border-slate-500/80 rounded-2xl p-4 md:p-5 text-slate-200 shadow-2xl backdrop-blur-md relative overflow-hidden'
                }
              >
                {message.role === 'assistant' && (
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/40 via-brand-500/40 to-transparent" />
                )}
                <FormattedMessage content={message.content} />
              </div>
            </div>
          </div>
        ))}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 pl-1">
              CHARTIFYBOT
            </span>
            <div className="w-full bg-slate-950/80 border border-slate-600/60 rounded-2xl p-4 flex items-center gap-3">
              <RefreshCw size={16} className="text-purple-400 animate-spin" />
              <span className="text-xs text-slate-400 font-mono animate-pulse">
                Analyzing market parameters...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick-Questions Bar (matching screenshot recommendation) ───── */}
      <div className="px-4 pb-2 pt-1 border-t border-slate-900 bg-slate-950/60">
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Quick Questions:</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => handleQuickQuestion('market')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-all shadow-sm active:scale-95"
          >
            📊 Market Analysis
          </button>
          <button
            onClick={() => handleQuickQuestion('patterns')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-all shadow-sm active:scale-95"
          >
            🕯️ Pattern Breakdown
          </button>
          <button
            onClick={() => handleQuickQuestion('strategy')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-all shadow-sm active:scale-95"
          >
            📈 Trade Setup
          </button>
          <button
            onClick={() => handleQuickQuestion('risk')}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-all shadow-sm active:scale-95"
          >
            ⚠️ Risk Control
          </button>
        </div>
      </div>

      {/* ── Input Box ──────────────────────────────────────────────── */}
      <div className="p-3.5 border-t border-slate-800/80 bg-slate-950">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask Chartify about ${symbol}...`}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-all"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-brand-500 hover:from-purple-500 hover:to-brand-400 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
        <p className="text-slate-600 text-[9px] mt-1.5 text-center font-sans">
          TradeWise AI Copilot • Educational market insights only. Not financial advice.
        </p>
      </div>
    </div>
  )
}
