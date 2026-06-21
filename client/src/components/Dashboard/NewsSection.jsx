import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Sparkles, Heart, ArrowLeft, Send, Bot, User, 
  Loader2, ExternalLink, HelpCircle, CheckCircle2, AlertTriangle, TrendingUp, TrendingDown, Clock, BarChart2 
} from 'lucide-react'
import { generateNewsSummary, generateNewsChatResponse, generateGeminiResponse } from '../../utils/geminiService'

const NEWS_IMAGES = {
  BTC: 'https://images.unsplash.com/photo-1516245834210-c4c142787335?auto=format&fit=crop&w=600&q=80',
  ETH: 'https://images.unsplash.com/photo-1622790694655-e47004bc6937?auto=format&fit=crop&w=600&q=80',
  SOL: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=600&q=80',
  AAPL: 'https://images.unsplash.com/photo-1616348436168-de43ad0db179?auto=format&fit=crop&w=600&q=80',
  MSFT: 'https://images.unsplash.com/photo-1625014618427-fbc980b974f5?auto=format&fit=crop&w=600&q=80',
  GOOGL: 'https://images.unsplash.com/photo-1573804633927-bfcbcd909acd?auto=format&fit=crop&w=600&q=80',
  TSLA: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=600&q=80',
  NVDA: 'https://images.unsplash.com/photo-1591453089816-0fbb971b454c?auto=format&fit=crop&w=600&q=80',
  EURUSD: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
  GBPUSD: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
  RELIANCE: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=600&q=80',
  General: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
  Default: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80'
}

function getNewsImage(symbol) {
  const sym = (symbol || '').toUpperCase()
  return NEWS_IMAGES[sym] || NEWS_IMAGES.Default
}

export default function NewsSection({ 
  filteredNews, 
  newsSearch, 
  setNewsSearch, 
  handleNewsSearchSubmit,
  newsImpactFilter,
  setNewsImpactFilter,
  newsAssetFilter,
  setNewsAssetFilter,
  loadDefaultNews,
  newsLoading,
  setActiveSymbol,
  setActiveTab
}) {
  // Page state
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [isGeneralChat, setIsGeneralChat] = useState(false)
  const [generalQuery, setGeneralQuery] = useState('')
  
  // Top Form controls
  const [searchQuestion, setSearchQuestion] = useState('')
  const [answerStyle, setAnswerStyle] = useState('Short & Concise')
  const [formCategory, setFormCategory] = useState('All Categories')
  const [formPeriod, setFormPeriod] = useState('All Time')
  
  // Likes storage
  const [likedIds, setLikedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('tradewise_liked_news')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Chat parameters
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('tradewise_liked_news', JSON.stringify(likedIds))
  }, [likedIds])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  const toggleLike = (id, e) => {
    e.stopPropagation()
    setLikedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  // Handle opening an article's AI chat
  const handleOpenArticleSummary = async (article) => {
    setSelectedArticle(article)
    setIsGeneralChat(false)
    setChatMessages([])
    setChatLoading(true)

    // Initial message
    const initialMsg = {
      role: 'assistant',
      content: `🔍 Analyzing details for **"${article.title}"**...\nGenerating executive AI Summary...`
    }
    setChatMessages([initialMsg])

    try {
      const { error, response } = await generateNewsSummary(article)
      if (error || !response) {
        // Fallback
        const fallbackText = `### 📋 AI Executive Summary: ${article.title}
        
• **Market Event**: ${article.description}
• **Sentiment Impact**: The market outlook for this event is evaluated as **${article.impact.toUpperCase()}**.
• **Technical Levels**: Significant volatility in **${article.symbol}** is anticipated. Watch local Support levels and Resistance levels for a breakout confirmation.
• **Outlook**: Further developments will depend on macro-economic disclosures and market liquidity.

*Disclaimer: Provided for educational purposes only. Not investment advice.*`
        
        setChatMessages([
          {
            role: 'assistant',
            content: fallbackText
          }
        ])
      } else {
        setChatMessages([
          {
            role: 'assistant',
            content: response
          }
        ])
      }
    } catch (err) {
      console.error('Failed to summarize news:', err)
      setChatMessages([
        {
          role: 'assistant',
          content: '⚠️ Failed to generate AI summary. You can still ask questions about this news event below.'
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // Send a message in details chat
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userText = chatInput
    setChatInput('')
    
    const newUserMsg = { role: 'user', content: userText }
    setChatMessages(prev => [...prev, newUserMsg])
    setChatLoading(true)

    try {
      if (isGeneralChat) {
        // General Chat Query
        const context = `
          User selected filters:
          - Answer Style: ${answerStyle}
          - Target Category: ${formCategory}
          - Time Period: ${formPeriod}
        `
        const prompt = `User query: "${userText}". Provide a concise financial market explanation matching style "${answerStyle}" for category "${formCategory}" and period "${formPeriod}". Keep it strictly below 4 sentences and highly educative.`
        
        const { error, response } = await generateGeminiResponse(prompt, context)
        if (error || !response) {
          setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `🤖 TradeWise AI Reply:\n\nBased on your query regarding "${formCategory}" within the "${formPeriod}" timeline, we are observing steady indicators. For specific breakdowns, try looking at related asset charts or individual news items.\n\n*Disclaimer: Educational only.*`
          }])
        } else {
          setChatMessages(prev => [...prev, { role: 'assistant', content: response }])
        }
      } else {
        // Specific news article chat
        const { error, response } = await generateNewsChatResponse(selectedArticle, userText, chatMessages)
        if (error || !response) {
          // Fallback
          const fallbackResponse = `Regarding your question about **${selectedArticle.symbol}**: This event represents a **${selectedArticle.impact}** signal. High volume breakouts often retest technical moving averages, so monitor price action on the main charts carefully.\n\n*Disclaimer: Educational only.*`
          setChatMessages(prev => [...prev, { role: 'assistant', content: fallbackResponse }])
        } else {
          setChatMessages(prev => [...prev, { role: 'assistant', content: response }])
        }
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Server connection error. Please try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  // Submits a general AI question from the top banner form
  const handleGeneralAISubmit = async (e) => {
    if (e) e.preventDefault()
    if (!searchQuestion.trim()) return

    const queryText = searchQuestion
    setIsGeneralChat(true)
    setSelectedArticle(null)
    setGeneralQuery(queryText)
    setChatMessages([])
    setChatLoading(true)

    // Initial loader
    setChatMessages([
      {
        role: 'assistant',
        content: `🤖 Processing your market question: *"${queryText}"* in **${answerStyle}** style...`
      }
    ])

    try {
      const context = `
        User Options:
        - Style: ${answerStyle}
        - Category: ${formCategory}
        - Period: ${formPeriod}
      `
      const prompt = `The user is asking: "${queryText}". Provide a professional financial market overview or analysis, formatted as "${answerStyle}", focusing on the category "${formCategory}" over "${formPeriod}". Keep it premium, actionable, and under 4-5 sentences. Include technical points if applicable.`

      const { error, response } = await generateGeminiResponse(prompt, context)
      if (error || !response) {
        const mockReply = `### 🤖 AI Market Verdict: ${queryText}
        
Based on your request regarding **${formCategory}** over **${formPeriod}**, the current sentiment leans towards moderate consolidation. High-growth sectors are experiencing capital rotation due to macroeconomic developments. Keep an eye on asset support lines to identify long setups.

*Disclaimer: Educational only. Not trading advice.*`
        setChatMessages([
          {
            role: 'assistant',
            content: mockReply
          }
        ])
      } else {
        setChatMessages([
          {
            role: 'assistant',
            content: response
          }
        ])
      }
    } catch (err) {
      setChatMessages([
        {
          role: 'assistant',
          content: '⚠️ Failed to connect to AI server. Please try a different query.'
        }
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // Trigger from Suggestions chips
  const handleSuggestionClick = (promptText) => {
    setSearchQuestion(promptText)
    // Auto submit using updated text
    setTimeout(() => {
      setIsGeneralChat(true)
      setSelectedArticle(null)
      setGeneralQuery(promptText)
      setChatMessages([])
      setChatLoading(true)
      
      setChatMessages([
        {
          role: 'assistant',
          content: `🤖 Analyzing: *"${promptText}"*...`
        }
      ])

      const triggerAI = async () => {
        try {
          const { error, response } = await generateGeminiResponse(
            `Summarize the current market context or answer this prompt: "${promptText}". Keep it under 4 sentences.`,
            `User query suggestion chip trigger.`
          )
          if (error || !response) {
            setChatMessages([
              {
                role: 'assistant',
                content: `### 📈 Market Analysis Summary\n\nRecent news reveals mixed market performance. Technical patterns suggest support levels are holding for main indices, but crypto markets show slight divergence. Continue checking individual assets on the terminal for specific setup indicators.`
              }
            ])
          } else {
            setChatMessages([{ role: 'assistant', content: response }])
          }
        } catch {
          setChatMessages([{ role: 'assistant', content: '⚠️ Error fetching market summaries.' }])
        } finally {
          setChatLoading(false)
        }
      }
      triggerAI()
    }, 100)
  }

  // Quick follow-up trigger inside the chat pane
  const triggerFollowUpChat = (followUpText) => {
    setChatInput(followUpText)
    setTimeout(() => {
      handleSendChatMessage()
    }, 50)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <AnimatePresence mode="wait">
        {!selectedArticle && !isGeneralChat ? (
          // GRID VIEW
          <motion.div
            key="grid-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="flex flex-col gap-6"
          >
            {/* AI Top Question Card (References Screenshot 3) */}
            <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-900/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Left Form column */}
              <div className="flex-1 flex flex-col w-full z-10">
                <span className="bg-blue-500/20 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-max mb-3 flex items-center gap-1">
                  <Sparkles size={10} className="animate-spin-slow" /> AI Smart Search
                </span>
                
                <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight mb-6">
                  Too busy to scroll? <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Go straight to AI.</span>
                </h1>

                <form onSubmit={handleGeneralAISubmit} className="flex flex-col gap-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Write your market question here..."
                      value={searchQuestion}
                      onChange={(e) => setSearchQuestion(e.target.value)}
                      className="w-full bg-black/40 border border-slate-700/60 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                    />
                  </div>

                  {/* Options Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Answer Style</label>
                      <select 
                        value={answerStyle} 
                        onChange={e => setAnswerStyle(e.target.value)}
                        className="bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500 cursor-pointer font-semibold"
                      >
                        <option>Short & Concise</option>
                        <option>Detailed Analysis</option>
                        <option>Key Bullet Points</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Category</label>
                      <select 
                        value={formCategory} 
                        onChange={e => setFormCategory(e.target.value)}
                        className="bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500 cursor-pointer font-semibold"
                      >
                        <option>All Categories</option>
                        <option>Stocks</option>
                        <option>Crypto</option>
                        <option>Forex</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Period</label>
                      <select 
                        value={formPeriod} 
                        onChange={e => setFormPeriod(e.target.value)}
                        className="bg-black/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 outline-none focus:border-blue-500 cursor-pointer font-semibold"
                      >
                        <option>All Time</option>
                        <option>Today</option>
                        <option>Past Week</option>
                        <option>Past Month</option>
                      </select>
                    </div>
                  </div>

                  {/* Ask Button */}
                  <button
                    type="submit"
                    disabled={!searchQuestion.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] text-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} /> Ask AI Assistant!
                  </button>
                </form>
              </div>

              {/* Right Robot column (Rendered custom premium thinking robot) */}
              <div className="w-44 h-44 shrink-0 flex items-center justify-center relative hidden md:flex select-none">
                {/* Holographic scanner rings */}
                <div className="absolute w-36 h-36 rounded-full border border-blue-500/10 animate-ping" />
                <div className="absolute w-28 h-28 rounded-full border border-cyan-500/25 animate-pulse" />
                
                {/* Hover animation wrap */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="w-full h-full"
                >
                  <svg viewBox="0 0 200 220" className="w-full h-full drop-shadow-[0_10px_25px_rgba(56,189,248,0.2)]">
                    {/* Neck */}
                    <rect x="85" y="155" width="30" height="20" rx="5" fill="#64748b" />
                    
                    {/* Shoulders */}
                    <path d="M 40,210 Q 40,175 100,170 Q 160,175 160,210 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="2" />
                    
                    {/* Head */}
                    <ellipse cx="100" cy="110" rx="62" ry="58" fill="#ffffff" stroke="#cbd5e1" strokeWidth="2" />
                    
                    {/* Ear nodes */}
                    <rect x="30" y="95" width="8" height="30" rx="4" fill="#94a3b8" />
                    <rect x="162" y="95" width="8" height="30" rx="4" fill="#94a3b8" />
                    
                    {/* Glass Visor */}
                    <ellipse cx="100" cy="105" rx="48" ry="24" fill="#0f172a" stroke="#475569" strokeWidth="1" />
                    
                    {/* Camera lens eye with pulse */}
                    <circle cx="100" cy="105" r="14" fill="#0ea5e9" fillOpacity="0.2" className="animate-pulse" />
                    <circle cx="100" cy="105" r="9" fill="#020617" stroke="#38bdf8" strokeWidth="2" />
                    <circle cx="100" cy="105" r="4" fill="#38bdf8" />
                    <circle cx="98" cy="103" r="1" fill="#ffffff" />
                    
                    {/* Thinking Arm/Hand */}
                    <path d="M 160,195 Q 185,160 172,122 Q 162,98 142,106" fill="none" stroke="#ffffff" strokeWidth="14" strokeLinecap="round" />
                    <circle cx="178" cy="155" r="10" fill="#cbd5e1" />
                    <circle cx="143" cy="106" r="7" fill="#ffffff" />
                  </svg>
                </motion.div>
              </div>
            </div>

            {/* suggestion prompts */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mr-1">Suggestions:</span>
              <button
                onClick={() => handleSuggestionClick("What are today's major news highlights?")}
                className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                What are today's major news highlights? <Sparkles size={10} className="text-blue-400" />
              </button>
              <button
                onClick={() => handleSuggestionClick("Which assets have the highest bullish sentiment?")}
                className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Which assets have the highest bullish sentiment? <Sparkles size={10} className="text-blue-400" />
              </button>
              <button
                onClick={() => handleSuggestionClick("Summarize current market trend")}
                className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700/60 hover:border-slate-600 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Summarize current market trend <Sparkles size={10} className="text-blue-400" />
              </button>
            </div>

            {/* Categories & Sentiment Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-surface-800/30 p-3 rounded-2xl border border-slate-800/80">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Asset Class:</span>
                {['All', 'Stocks', 'Crypto', 'Forex'].map(assetOpt => (
                  <button
                    key={assetOpt}
                    onClick={() => setNewsAssetFilter(assetOpt)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all
                      ${newsAssetFilter === assetOpt ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}`}
                  >
                    {assetOpt}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider px-2">Sentiment:</span>
                {['All', 'Bullish', 'Bearish', 'Neutral'].map(sentimentOpt => (
                  <button
                    key={sentimentOpt}
                    onClick={() => setNewsImpactFilter(sentimentOpt)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all
                      ${newsImpactFilter === sentimentOpt ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/30'}`}
                  >
                    {sentimentOpt}
                  </button>
                ))}
              </div>
            </div>

            {/* News Cards Grid */}
            <div className="flex flex-col gap-3">
              <h2 className="text-white text-sm font-bold tracking-wider uppercase opacity-80 flex items-center gap-2">
                <span className="w-1.5 h-3 bg-blue-500 rounded-full" /> Berita Terkini (Latest News)
              </h2>

              {filteredNews.length === 0 ? (
                <div className="text-center py-16 bg-surface-800/20 border border-slate-800 rounded-3xl">
                  <AlertTriangle size={24} className="mx-auto text-slate-500 mb-2" />
                  <p className="text-slate-400 text-xs">No articles found matching the filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredNews.map(news => {
                    const isBullish = news.impact === 'bullish'
                    const isBearish = news.impact === 'bearish'
                    const sentimentBadge = isBullish ? 'badge-bullish' : isBearish ? 'badge-bearish' : 'badge-neutral'
                    const coverImg = getNewsImage(news.symbol)
                    const isLiked = likedIds.includes(news.id)

                    return (
                      <div
                        key={news.id}
                        className="bg-surface-800/40 border border-slate-800/60 rounded-3xl overflow-hidden hover:border-slate-700/80 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
                      >
                        {/* News Image Header */}
                        <div className="h-44 overflow-hidden relative w-full cursor-pointer" onClick={() => handleOpenArticleSummary(news)}>
                          <img 
                            src={coverImg} 
                            alt={news.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {/* Shadow Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-surface-900 to-transparent opacity-80" />
                          
                          {/* Badges in Image */}
                          <div className="absolute top-4 left-4 flex gap-2">
                            <span className="text-[9px] px-2.5 py-0.5 rounded-full border border-white/10 bg-black/60 font-black text-white uppercase tracking-wider backdrop-blur-sm">
                              {news.symbol}
                            </span>
                            <span className={`text-[9px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider backdrop-blur-sm ${sentimentBadge}`}>
                              {news.impact}
                            </span>
                          </div>

                          {/* Time */}
                          <span className="absolute bottom-3 left-4 text-slate-300 text-[10px] flex items-center gap-1 font-semibold">
                            <Clock size={10} /> {news.timestamp}
                          </span>
                        </div>

                        {/* Card Details */}
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div className="mb-4">
                            <h3 
                              onClick={() => handleOpenArticleSummary(news)}
                              className="text-white text-sm font-bold leading-snug hover:text-blue-400 cursor-pointer transition-colors line-clamp-2"
                            >
                              {news.title}
                            </h3>
                            <p className="text-slate-400 text-xs mt-2 line-clamp-2 leading-relaxed font-medium">
                              {news.description}
                            </p>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="flex items-center justify-between pt-3.5 border-t border-slate-800/50">
                            {/* See AI Summary Sparkle Button */}
                            <button
                              onClick={() => handleOpenArticleSummary(news)}
                              className="bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white px-3.5 py-1.5 rounded-xl text-[10px] font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
                            >
                              <Sparkles size={11} className="text-blue-400 group-hover:text-white" />
                              See AI Summary
                            </button>

                            {/* Heart Button */}
                            <button
                              onClick={(e) => toggleLike(news.id, e)}
                              className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer
                                ${isLiked 
                                  ? 'bg-rose-500/20 border-rose-500/30 text-rose-500 hover:scale-105' 
                                  : 'bg-slate-800/40 border-slate-800/80 text-slate-500 hover:text-slate-300'}`}
                            >
                              <Heart size={14} fill={isLiked ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          // DETAILED / CHAT VIEW (References Screenshot 4)
          <motion.div
            key="chat-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col gap-5"
          >
            {/* Back Button and Title Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <button
                onClick={() => {
                  setSelectedArticle(null)
                  setIsGeneralChat(false)
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft size={14} /> Back to News Grid
              </button>
              
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <Sparkles size={12} className="text-blue-400 animate-pulse" /> AI Analysis Portal
              </span>
            </div>

            {/* Split Screen Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Left Column: News Card Details (1/3 weight) */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {selectedArticle ? (
                  // Article details
                  <div className="bg-surface-800/50 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col gap-4 sticky top-6">
                    <div className="h-48 overflow-hidden rounded-2xl border border-slate-700/40 relative">
                      <img 
                        src={getNewsImage(selectedArticle.symbol)} 
                        alt={selectedArticle.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-900 to-transparent opacity-80" />
                      
                      <div className="absolute bottom-3 left-4 flex gap-2">
                        <span className="text-[9px] px-2 py-0.5 rounded border border-white/10 bg-black/60 font-black text-white uppercase">
                          {selectedArticle.symbol}
                        </span>
                        <span className={`text-[9px] px-2 py-0.5 rounded font-black uppercase
                          ${selectedArticle.impact === 'bullish' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                            selectedArticle.impact === 'bearish' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                            'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}
                        >
                          {selectedArticle.impact} Impact
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
                      <span>Source: <strong className="text-slate-300">{selectedArticle.source || 'Market News'}</strong></span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {selectedArticle.timestamp}</span>
                    </div>

                    <h2 className="text-white text-base font-bold leading-snug px-1">
                      {selectedArticle.title}
                    </h2>

                    <p className="text-slate-300 text-xs leading-relaxed font-medium px-1">
                      {selectedArticle.description}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-2 px-1">
                      {selectedArticle.link && (
                        <button
                          onClick={() => window.open(selectedArticle.link, '_blank')}
                          className="flex-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 text-slate-300 text-[10px] font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink size={12} /> Read Full Article
                        </button>
                      )}
                      
                      {selectedArticle.symbol !== 'General' && (
                        <button
                          onClick={() => {
                            setActiveSymbol(selectedArticle.symbol)
                            setActiveTab('terminal')
                          }}
                          className="flex-1 bg-blue-600/10 hover:bg-blue-600 border border-blue-500/20 hover:border-blue-500 text-blue-400 hover:text-white text-[10px] font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <BarChart2 size={12} /> View {selectedArticle.symbol} Chart
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  // General Search metadata card
                  <div className="bg-surface-800/50 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4 sticky top-6">
                    <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                      <Sparkles size={24} className="animate-pulse" />
                    </div>

                    <div>
                      <h2 className="text-white text-base font-bold leading-snug">
                        General AI Verdict
                      </h2>
                      <p className="text-slate-400 text-xs mt-1">
                        Active parameters selected for custom search:
                      </p>
                    </div>

                    <div className="flex flex-col gap-2.5 bg-black/30 p-4 rounded-2xl border border-slate-800">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Style:</span>
                        <span className="text-slate-200 font-bold">{answerStyle}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Category:</span>
                        <span className="text-slate-200 font-bold">{formCategory}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-bold uppercase tracking-wider text-[9px]">Period:</span>
                        <span className="text-slate-200 font-bold">{formPeriod}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5 mt-2">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Original Question:</p>
                      <blockquote className="border-l-2 border-blue-500/50 pl-3 py-1 text-slate-300 text-xs italic font-medium leading-relaxed bg-blue-500/5 rounded-r-xl">
                        "{generalQuery}"
                      </blockquote>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedArticle(null)
                        setIsGeneralChat(false)
                      }}
                      className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition-all w-full cursor-pointer"
                    >
                      New Search Setup
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: AI Chat Panel (2/3 weight) */}
              <div className="lg:col-span-7 bg-surface-800/30 border border-slate-800 rounded-3xl flex flex-col justify-between h-[600px] shadow-2xl relative overflow-hidden">
                {/* Chat Panel Header */}
                <div className="bg-slate-900/90 border-b border-slate-800/80 px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/10 border border-blue-500/25 rounded-full flex items-center justify-center">
                      <Bot size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <h4 className="text-white text-xs font-bold flex items-center gap-1.5">
                        TradeWise Research AI <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      </h4>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Powered by Llama 3</p>
                    </div>
                  </div>
                </div>

                {/* Messages ledger */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {chatMessages.map((msg, index) => {
                    const isUser = msg.role === 'user'
                    return (
                      <div
                        key={index}
                        className={`flex gap-3.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isUser && (
                          <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                            <Bot size={15} className="text-blue-400" />
                          </div>
                        )}
                        <div
                          className={`p-4 rounded-2xl text-xs max-w-[85%] leading-relaxed font-medium whitespace-pre-line shadow-sm border
                            ${isUser 
                              ? 'bg-blue-600 border-blue-500 text-white rounded-tr-none' 
                              : 'bg-slate-900/80 border-slate-800 text-slate-200 rounded-tl-none'}`}
                        >
                          {msg.content}
                        </div>
                        {isUser && (
                          <div className="w-8 h-8 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center shrink-0">
                            <User size={15} className="text-slate-300" />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Loading status */}
                  {chatLoading && (
                    <div className="flex gap-3.5 justify-start">
                      <div className="w-8 h-8 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                        <Bot size={15} className="text-blue-400" />
                      </div>
                      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl rounded-tl-none flex items-center gap-2">
                        <Loader2 size={14} className="text-blue-400 animate-spin" />
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Thinking...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Follow up suggestions */}
                <div className="px-5 pb-2.5">
                  <div className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-800/40 select-none hide-scrollbar">
                    {selectedArticle ? (
                      <>
                        <button
                          onClick={() => triggerFollowUpChat("Explain the short-term impact of this event.")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                        >
                          📈 Short-term Impact
                        </button>
                        <button
                          onClick={() => triggerFollowUpChat("What are the key technical resistance levels now?")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                        >
                          🎯 Technical Resistance
                        </button>
                        <button
                          onClick={() => triggerFollowUpChat("Is this news sentiment already priced in?")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                        >
                          💭 Market Pricing
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => triggerFollowUpChat("Which sectors will benefit most?")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                        >
                          🚀 Sector Beneficiaries
                        </button>
                        <button
                          onClick={() => triggerFollowUpChat("What macroeconomic factors are playing in here?")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                        >
                          🌍 Macro Environment
                        </button>
                        <button
                          onClick={() => triggerFollowUpChat("What is the volatility outlook?")}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 hover:border-slate-700 rounded-xl text-[10px] font-bold text-slate-400 hover:text-white whitespace-nowrap transition-colors cursor-pointer"
                        >
                          ⚡ Volatility Outlook
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Input area */}
                <div className="p-4 bg-slate-900/90 border-t border-slate-800/80">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSendChatMessage()
                        }
                      }}
                      placeholder={selectedArticle ? "Ask follow-up questions about this article..." : "Ask follow-up questions about this verdict..."}
                      className="flex-1 bg-black/40 border border-slate-700/60 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors font-semibold"
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleSendChatMessage}
                      disabled={!chatInput.trim() || chatLoading}
                      className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed rounded-2xl transition-colors shrink-0 flex items-center justify-center cursor-pointer"
                    >
                      <Send size={15} className="text-white" />
                    </button>
                  </div>
                  <p className="text-slate-500 text-[9px] mt-2.5 text-center font-semibold">
                    ⚠️ AI outputs are for research and educational assistance only. No financial advice.
                  </p>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
