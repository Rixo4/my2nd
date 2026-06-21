import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, X, Minimize2, Maximize2 } from 'lucide-react'

export default function ChatBot({ symbol, patterns, trend, isMinimized, onToggleMinimize, portfolioId }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: '👋 Welcome to TradeWise AI! I\'m your trading assistant. Ask me about candlestick patterns, market analysis, or trading strategies. How can I help you today?'
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
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          portfolioId,
          history: messages
        })
      })
      const data = await res.json()

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error || 'Failed to get response.'}` }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Failed to get response. Please try again.' }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuickAction = async (action) => {
    let prompt = ''
    switch (action) {
      case 'analyze':
        prompt = `Analyze the current market situation for ${symbol}. What are the key patterns and what should I watch for?`
        break
      case 'patterns':
        prompt = `Explain the detected candlestick patterns for ${symbol} and their trading implications.`
        break
      case 'strategy':
        prompt = `Suggest a trading strategy based on the current ${trend} trend and detected patterns.`
        break
      case 'risk':
        prompt = 'What are the key risk management principles I should follow when trading these patterns?'
        break
      default:
        return
    }
    setInput(prompt)
    handleSend()
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
        className="fixed bottom-20 lg:bottom-6 right-6 w-14 h-14 bg-brand-500 hover:bg-brand-600 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 group"
      >
        <Bot size={24} className="text-white" />
        <span className="absolute right-16 bg-surface-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          TradeWise AI
        </span>
      </button>
    )
  }

  return (
    <div className={`fixed bottom-20 lg:bottom-6 right-6 bg-surface-900 border border-slate-700 rounded-2xl shadow-2xl z-50 flex flex-col transition-all duration-300 max-w-[calc(100vw-2rem)] ${isExpanded ? 'w-[500px] h-[calc(100vh-48px)] max-h-[600px]' : 'w-[380px] h-[calc(100vh-80px)] max-h-[500px]'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-brand-600 to-brand-500 p-4 rounded-t-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-white font-bold text-sm">TradeWise AI</h3>
            <p className="text-white/70 text-xs">Powered by Gemini</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isExpanded ? <Minimize2 size={16} className="text-white" /> : <Maximize2 size={16} className="text-white" />}
          </button>
          <button
            onClick={onToggleMinimize}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0">
                <Bot size={16} className="text-brand-400" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl ${
                message.role === 'user'
                  ? 'bg-brand-500 text-white'
                  : 'bg-surface-800 text-slate-200 border border-slate-700'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center shrink-0">
                <User size={16} className="text-slate-300" />
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center shrink-0">
              <Bot size={16} className="text-brand-400" />
            </div>
            <div className="bg-surface-800 border border-slate-700 p-3 rounded-2xl">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => handleQuickAction('analyze')}
            className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-nowrap transition-colors"
          >
            📊 Analyze
          </button>
          <button
            onClick={() => handleQuickAction('patterns')}
            className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-nowrap transition-colors"
          >
            🕯️ Patterns
          </button>
          <button
            onClick={() => handleQuickAction('strategy')}
            className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-nowrap transition-colors"
          >
            📈 Strategy
          </button>
          <button
            onClick={() => handleQuickAction('risk')}
            className="px-3 py-1.5 bg-surface-800 hover:bg-surface-700 border border-slate-700 rounded-lg text-xs text-slate-300 whitespace-nowrap transition-colors"
          >
            ⚠️ Risk
          </button>
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about trading patterns, strategies..."
            className="flex-1 bg-surface-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl transition-colors"
          >
            <Send size={18} className="text-white" />
          </button>
        </div>
        <p className="text-slate-500 text-[10px] mt-2 text-center">
          ⚠️ AI responses are for educational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  )
}
