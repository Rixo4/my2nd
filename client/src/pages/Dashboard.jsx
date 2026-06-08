import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart2, RefreshCw, Activity, BookOpen, Zap, AlertCircle, 
  TrendingUp, HelpCircle, Menu, X, Layout, Wallet, List, Bell, Search,
  Bitcoin, Shield, Play, Check, ChevronRight
} from 'lucide-react'
import Chart from '../components/Chart'
import PatternPanel from '../components/PatternPanel'
import AlertPanel from '../components/AlertPanel'
import Watchlist from '../components/Watchlist'
import Filters from '../components/Filters'
import LearningCards from '../components/LearningCards'
import RecommendationBox from '../components/RecommendationBox'
import ChatBot from '../components/ChatBot'
import { CANDLE_DATA, ALL_SYMBOLS, SYMBOLS, getNextCandle } from '../data/mockData'
import { STOCK_MARKET_NEWS } from '../data/newsData'
import { LEARNING_TOPICS } from '../data/learningData'
import { ACADEMY_TRACKS } from '../data/academyData'
import { detectPatterns, detectTrend } from '../utils/patternDetection'
import { BinanceService } from '../utils/binanceService'

const IconMap = { BookOpen, Activity, Bitcoin, TrendingUp, Shield }

let alertIdCounter = 0

function generateAlert(symbol, pattern, isBeginner) {
  const time = new Date().toLocaleTimeString()
  const type = pattern.signal === 'bullish' ? 'BUY' : pattern.signal === 'bearish' ? 'SELL' : 'NEUTRAL'
  const meaning = isBeginner ? ` → ${pattern.explanation}` : ''
  
  return {
    id: ++alertIdCounter,
    symbol,
    pattern: pattern.pattern,
    signal: pattern.signal,
    type,
    confidence: pattern.confidence,
    candleHistory: pattern.times.map(t => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
    message: `${type} SIGNAL: ${pattern.pattern}${meaning}`,
    time,
  }
}

const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || '2e812f4758f11b6599bb4a1ab600f126dd22db31'

async function fetchLiveNews(query) {
  try {
    const response = await fetch('https://google.serper.dev/news', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, num: 15 })
    })
    if (!response.ok) {
      throw new Error('Serper News API request failed')
    }
    const data = await response.json()
    if (data && data.news) {
      return data.news.map((item, index) => {
        const titleLower = item.title.toLowerCase()
        const snippetLower = (item.snippet || '').toLowerCase()
        
        let impact = 'neutral'
        if (titleLower.includes('surge') || titleLower.includes('soar') || titleLower.includes('jump') || titleLower.includes('rally') || titleLower.includes('rise') || titleLower.includes('gain') || titleLower.includes('up') || titleLower.includes('bull')) {
          impact = 'bullish'
        } else if (titleLower.includes('drop') || titleLower.includes('fall') || titleLower.includes('plummet') || titleLower.includes('sink') || titleLower.includes('dip') || titleLower.includes('slump') || titleLower.includes('down') || titleLower.includes('bear') || titleLower.includes('crash')) {
          impact = 'bearish'
        }
        
        let symbol = 'General'
        const allSymbolsList = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'RELIANCE', 'TCS', 'INFY', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOT', 'AVAX', 'DOGE', 'MATIC']
        for (const sym of allSymbolsList) {
          if (titleLower.includes(sym.toLowerCase()) || snippetLower.includes(sym.toLowerCase())) {
            symbol = sym
            break
          }
        }

        return {
          id: `serper-${index}-${Date.now()}`,
          title: item.title,
          description: item.snippet || 'No description available. Click to read the full article on the publisher website.',
          impact,
          symbol,
          timestamp: item.date || 'Recent',
          link: item.link,
          source: item.source || 'Market News'
        }
      })
    }
    return []
  } catch (error) {
    console.error('Failed to fetch live news from Serper:', error)
    return []
  }
}

export default function Dashboard() {
  const [activeSymbol, setActiveSymbol] = useState('BTC')
  const [market, setMarket]       = useState('All')
  const [timeframe, setTimeframe] = useState('1d')
  const [signal, setSignal]       = useState('All')
  const [candles, setCandles]     = useState([])
  const [patterns, setPatterns]   = useState([])
  const [alerts, setAlerts]       = useState([])
  const [isLive, setIsLive]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isRealTime, setIsRealTime] = useState(false)
  const [isBeginner, setIsBeginner] = useState(false)
  const [showPatterns, setShowPatterns] = useState(true)
  const [trend, setTrend] = useState('Analyzing...')
  const [portfolio, setPortfolio] = useState({ balance: 10000, holdings: {}, initial: 10000 })
  const [mobileView, setMobileView] = useState('chart') // 'chart', 'market', 'patterns', 'portfolio'
  const [selectedNews, setSelectedNews] = useState(null)
  const [activeTab, setActiveTab] = useState('terminal') // 'terminal', 'news', 'learning'
  const [newsSearch, setNewsSearch] = useState('')
  const [newsImpactFilter, setNewsImpactFilter] = useState('All')
  const [newsAssetFilter, setNewsAssetFilter] = useState('All')
  const [learningSearch, setLearningSearch] = useState('')
  const [learningCategory, setLearningCategory] = useState('All')
  const [liveNews, setLiveNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [academyTracks, setAcademyTracks] = useState(ACADEMY_TRACKS)
  const [activeTrackId, setActiveTrackId] = useState('beginner')
  const [watchlist, setWatchlist] = useState(['AAPL', 'BTC', 'EURUSD'])
  const [isChatBotMinimized, setIsChatBotMinimized] = useState(true)

  const buyAsset = () => {
    const lastCandle = candles[candles.length - 1]
    if (!lastCandle) return
    const amount = portfolio.balance / lastCandle.close
    if (amount <= 0) return
    setPortfolio(prev => {
      const currentHoldings = prev.holdings[activeSymbol] || 0
      return {
        ...prev,
        holdings: {
          ...prev.holdings,
          [activeSymbol]: currentHoldings + amount
        },
        balance: 0
      }
    })
  }

  const sellAsset = () => {
    const lastCandle = candles[candles.length - 1]
    const currentHoldings = portfolio.holdings[activeSymbol] || 0
    if (!lastCandle || currentHoldings <= 0) return
    const value = currentHoldings * lastCandle.close
    setPortfolio(prev => {
      const updatedHoldings = { ...prev.holdings }
      delete updatedHoldings[activeSymbol]
      return {
        ...prev,
        balance: prev.balance + value,
        holdings: updatedHoldings
      }
    })
  }

  const lastCandle = candles[candles.length - 1]

  const getAssetPrice = (symId) => {
    if (symId === activeSymbol && lastCandle) {
      return lastCandle.close
    }
    const symbolCandles = CANDLE_DATA[symId]
    if (symbolCandles && symbolCandles.length > 0) {
      return symbolCandles[symbolCandles.length - 1].close
    }
    const symObj = ALL_SYMBOLS.find(s => s.id === symId)
    return symObj ? symObj.price : 0
  }

  const holdingsValue = Object.entries(portfolio.holdings).reduce((sum, [symId, qty]) => {
    return sum + (qty * getAssetPrice(symId))
  }, 0)

  const portfolioValue = portfolio.balance + holdingsValue
  const profit = portfolioValue - portfolio.initial
  const profitPct = ((profit / portfolio.initial) * 100).toFixed(2)

  const loadSymbol = useCallback(async (sym) => {
    try {
      setLastUpdate('Loading...')
      const isCrypto = ALL_SYMBOLS.find(s => s.id === sym)?.market === 'crypto'
      
      let data = []
      let realTime = false
      if (isCrypto) {
        try {
          data = await BinanceService.getHistoricalData(sym + 'USDT', timeframe)
          if (data && data.length > 0) {
            realTime = true
          }
        } catch (err) {
          console.error('Binance historical fetch failed, falling back to mock:', err)
        }
      }
      
      if (!realTime || !data || data.length === 0) {
        realTime = false
        data = [...(CANDLE_DATA[sym] || [])]
      }

      setIsRealTime(realTime)
      setCandles(data)
      setTrend(detectTrend(data))
      const detected = detectPatterns(data)
      setPatterns(detected)
      setLastUpdate(new Date().toLocaleTimeString())
    } catch (error) {
      console.error('Error loading symbol:', error)
      setLastUpdate('Error loading data')
    }
  }, [timeframe])

  useEffect(() => {
    loadSymbol(activeSymbol)
  }, [activeSymbol, loadSymbol])

  const loadDefaultNews = useCallback(async () => {
    try {
      setNewsLoading(true)
      const searchQuery = activeSymbol ? `${activeSymbol} news` : 'stock market news'
      const articles = await fetchLiveNews(searchQuery)
      if (articles && articles.length > 0) {
        setLiveNews(articles)
      } else {
        setLiveNews(STOCK_MARKET_NEWS)
      }
    } catch (error) {
      console.error('Error loading news:', error)
      setLiveNews(STOCK_MARKET_NEWS)
    } finally {
      setNewsLoading(false)
    }
  }, [activeSymbol])

  useEffect(() => {
    loadDefaultNews()
  }, [loadDefaultNews])

  const handleNewsSearchSubmit = async (e) => {
    e.preventDefault()
    if (!newsSearch.trim()) return
    setNewsLoading(true)
    const articles = await fetchLiveNews(newsSearch)
    if (articles && articles.length > 0) {
      setLiveNews(articles)
    }
    setNewsLoading(false)
  }

  useEffect(() => {
    if (!isLive) return
    let binanceWs = null

    const handleNewData = (updatedData, newCandle) => {
      setCandles(updatedData)
      const currentTrend = detectTrend(updatedData)
      setTrend(currentTrend)
      const detected = detectPatterns(updatedData)
      setPatterns(detected)

      if (detected.length > 0 && (newCandle.isFinal || !isRealTime)) {
        const latestPattern = detected[0]
        if (latestPattern.time === newCandle.time) {
          setAlerts(a => [generateAlert(activeSymbol, latestPattern, isBeginner), ...a].slice(0, 8))
        }
      }
    }

    try {
      if (isRealTime) {
        binanceWs = new BinanceService(activeSymbol + 'USDT', timeframe, (newCandle) => {
          setCandles(prev => {
            const last = prev[prev.length - 1]
            let updated = []
            if (last && last.time === newCandle.time) {
              updated = [...prev.slice(0, -1), newCandle]
            } else {
              updated = [...prev.slice(-199), newCandle]
            }
            handleNewData(updated, newCandle)
            return updated
          })
          setLastUpdate(new Date().toLocaleTimeString())
        })
        binanceWs.connect()
      } else {
        const interval = setInterval(() => {
          const newCandle = getNextCandle(activeSymbol)
          if (!newCandle) return
          setCandles(prev => {
            const updated = [...prev.slice(-119), newCandle]
            handleNewData(updated, newCandle)
            return updated
          })
          setLastUpdate(new Date().toLocaleTimeString())
        }, isBeginner ? 8000 : 4000)
        return () => clearInterval(interval)
      }
    } catch (error) {
      console.error('Error in live data connection:', error)
    }

    return () => {
      if (binanceWs) binanceWs.disconnect()
    }
  }, [activeSymbol, isLive, isRealTime, timeframe, isBeginner])

  const filteredPatterns = patterns.filter(p =>
    signal === 'All' || p.signal === signal
  )

  const newsSource = liveNews.length > 0 ? liveNews : STOCK_MARKET_NEWS

  const filteredNews = newsSource.filter(news => {
    const matchesSearch = news.title.toLowerCase().includes(newsSearch.toLowerCase()) || 
                          news.description.toLowerCase().includes(newsSearch.toLowerCase())
    const matchesImpact = newsImpactFilter === 'All' || news.impact === newsImpactFilter.toLowerCase()
    
    let matchesAsset = true
    if (newsAssetFilter !== 'All') {
      const target = newsAssetFilter.toLowerCase()
      if (target === 'stocks') {
        matchesAsset = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'RELIANCE', 'TCS', 'INFY'].includes(news.symbol)
      } else if (target === 'crypto') {
        matchesAsset = ['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOT', 'AVAX', 'DOGE', 'MATIC'].includes(news.symbol)
      } else if (target === 'forex') {
        matchesAsset = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP'].includes(news.symbol)
      }
    }
    return matchesSearch && matchesImpact && matchesAsset
  })

  const filteredLearning = LEARNING_TOPICS.filter(topic => {
    const matchesSearch = topic.title.toLowerCase().includes(learningSearch.toLowerCase()) || 
                          topic.description.toLowerCase().includes(learningSearch.toLowerCase())
    const matchesCategory = learningCategory === 'All' || topic.category === learningCategory
    return matchesSearch && matchesCategory
  })

  // Academy Statistics & Handlers
  const totalModules = academyTracks.reduce((sum, track) => sum + track.modules.length, 0)
  const completedModules = academyTracks.reduce((sum, track) => sum + track.modules.filter(m => m.completed).length, 0)
  const remainingModules = totalModules - completedModules
  const completionPercentage = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
  const activeTrack = academyTracks.find(t => t.id === activeTrackId) || academyTracks[0]

  const handleModuleAction = (trackId, moduleId) => {
    // Mark as completed if not already
    setAcademyTracks(prevTracks => 
      prevTracks.map(track => {
        if (track.id !== trackId) return track
        return {
          ...track,
          modules: track.modules.map(mod => {
            if (mod.id !== moduleId) return mod
            return { ...mod, completed: true }
          })
        }
      })
    )
  }

  const prevCandle = candles[candles.length - 2]
  const priceChange = lastCandle && prevCandle ? lastCandle.close - prevCandle.close : 0
  const pricePctDisplay = prevCandle ? ((priceChange / prevCandle.close) * 100).toFixed(2) : '0.00'

  return (
    <div className="min-h-screen bg-surface-900 flex flex-col pb-20 lg:pb-0">
      {/* Daily Summary Banner - Optimized for Mobile */}
      <div className="bg-brand-500/10 border-b border-brand-500/20 px-4 py-2 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2 truncate">
          <Zap size={12} className="text-brand-500 shrink-0" />
          <p className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
            {activeSymbol}: <span className="text-brand-400">{trend}</span>
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={() => setShowPatterns(!showPatterns)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all shrink-0
              ${showPatterns ? 'bg-emerald-500 text-white shadow-sm' : 'bg-surface-800 text-slate-400'}`}
          >
            <Zap size={10} />
            {showPatterns ? 'Patterns On' : 'Patterns Off'}
          </button>
          <button 
            onClick={() => setIsBeginner(!isBeginner)}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all shrink-0
              ${isBeginner ? 'bg-brand-500 text-white' : 'bg-surface-800 text-slate-400'}`}
          >
            <BookOpen size={10} />
            {isBeginner ? 'Beginner' : 'Normal'}
          </button>
        </div>
      </div>

      {/* Live Market News Ticker */}
      <div className="bg-sky-500/5 border-b border-slate-800/40 px-4 py-1.5 flex items-center justify-between overflow-hidden relative">
        <div className="flex items-center gap-2 shrink-0 z-10 bg-surface-900 pr-4 relative">
          <span className="flex h-1.5 w-1.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-sky-500"></span>
          </span>
          <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">LIVE NEWS</span>
          <div className="absolute left-full top-0 bottom-0 w-6 bg-gradient-to-r from-surface-900 to-transparent pointer-events-none" />
        </div>
        <div className="flex-1 overflow-hidden relative flex items-center">
          <div className="flex ticker-track whitespace-nowrap">
            {[...newsSource, ...newsSource].map((news, i) => {
              const isBullish = news.impact === 'bullish'
              const isBearish = news.impact === 'bearish'
              const badgeColor = isBullish ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                                 isBearish ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                                 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              return (
                <button
                  key={i}
                  onClick={() => setSelectedNews(news)}
                  className="inline-flex items-center gap-2 mx-6 text-[10px] text-slate-300 font-medium hover:text-white hover:underline transition-colors focus:outline-none shrink-0"
                >
                  <span className={`text-[8px] px-1.5 py-0.5 rounded border font-black uppercase ${badgeColor}`}>
                    {news.symbol}
                  </span>
                  <span>{news.title}</span>
                  <span className="text-slate-500 text-[8px] font-normal">{news.timestamp}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface-900 to-transparent pointer-events-none z-10" />
      </div>

      <header className="border-b border-slate-800/60 px-4 py-3 flex items-center justify-between bg-surface-900/95 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-brand-500 rounded flex items-center justify-center">
              <BarChart2 size={14} className="text-white" />
            </div>
            <span className="text-white font-bold tracking-tight text-sm hidden sm:inline">TradeWise</span>
          </Link>

          <select value={activeSymbol} onChange={e => setActiveSymbol(e.target.value)}
                  className="bg-surface-800 border border-slate-700 rounded px-2 py-1 text-[10px] text-white outline-none">
            {Object.entries(SYMBOLS).map(([cat, list]) => (
              <optgroup key={cat} label={cat.toUpperCase()}>
                {list.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Central Top Navigation Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-surface-800/60 p-1 rounded-xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('terminal')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5
              ${activeTab === 'terminal' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Layout size={12} />
            Terminal
          </button>
          <button
            onClick={() => setActiveTab('news')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5
              ${activeTab === 'news' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Activity size={12} />
            News Section
          </button>
          <button
            onClick={() => setActiveTab('learning')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5
              ${activeTab === 'learning' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <BookOpen size={12} />
            Learning Hub
          </button>
        </div>

        <div className="flex items-center gap-2">
          {lastCandle && (
            <div className="flex flex-col items-end">
              <span className="text-white font-mono font-bold text-xs">{lastCandle.close.toFixed(2)}</span>
              <span className={`text-[9px] font-bold ${priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {priceChange >= 0 ? '+' : ''}{pricePctDisplay}%
              </span>
            </div>
          )}
          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />
          <button onClick={() => setIsLive(!isLive)} className={`p-1.5 rounded ${isLive ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-500 bg-slate-500/10'}`}>
            <Activity size={14} />
          </button>
          <button onClick={() => loadSymbol(activeSymbol)} className="p-1.5 rounded bg-surface-800 text-slate-400 hidden sm:block">
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Desktop only */}
        {activeTab === 'terminal' && (
          <aside className="w-64 hidden lg:flex flex-col gap-4 p-4 border-r border-slate-800/50 overflow-y-auto">
            <Watchlist activeSymbol={activeSymbol} onSelect={setActiveSymbol} watchlist={watchlist} setWatchlist={setWatchlist} />
            <Filters market={market} setMarket={setMarket} timeframe={timeframe} setTimeframe={setTimeframe} signal={signal} setSignal={setSignal} />
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            {activeTab === 'news' && (
              <motion.div
                key="news-hub"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6 max-w-6xl mx-auto w-full"
              >
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                  <div>
                    <h2 className="text-white text-xl font-bold tracking-tight mb-1">Global Market Intelligence</h2>
                    <p className="text-slate-400 text-xs">Real-time updates, market sentiment, and asset impact analysis.</p>
                  </div>

                  {/* Search Bar */}
                  <form onSubmit={handleNewsSearchSubmit} className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search news..."
                      value={newsSearch}
                      onChange={e => {
                        setNewsSearch(e.target.value)
                        if (e.target.value === '') {
                          loadDefaultNews()
                        }
                      }}
                      className="bg-surface-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-brand-500 transition-colors w-full sm:w-48"
                    />
                  </form>
                </div>

                {/* Categories & Sentiment Filters */}
                <div className="flex flex-wrap items-center gap-4 justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Asset:</span>
                    {['All', 'Stocks', 'Crypto', 'Forex'].map(assetOpt => (
                      <button
                        key={assetOpt}
                        onClick={() => setNewsAssetFilter(assetOpt)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all
                          ${newsAssetFilter === assetOpt ? 'bg-brand-500 text-white shadow-sm' : 'bg-surface-800 text-slate-400 hover:text-white'}`}
                      >
                        {assetOpt}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sentiment:</span>
                    {['All', 'Bullish', 'Bearish', 'Neutral'].map(sentimentOpt => (
                      <button
                        key={sentimentOpt}
                        onClick={() => setNewsImpactFilter(sentimentOpt)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all
                          ${newsImpactFilter === sentimentOpt ? 'bg-brand-500 text-white shadow-sm' : 'bg-surface-800 text-slate-400 hover:text-white'}`}
                      >
                        {sentimentOpt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* News Cards Grid */}
                {filteredNews.length === 0 ? (
                  <div className="text-center py-12 bg-surface-800/20 border border-slate-800 rounded-2xl">
                    <p className="text-slate-400 text-xs">No articles found matching your search or filters.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredNews.map(news => {
                      const isBullish = news.impact === 'bullish'
                      const isBearish = news.impact === 'bearish'
                      const sentimentBadge = isBullish ? 'badge-bullish' : isBearish ? 'badge-bearish' : 'badge-neutral'
                      return (
                        <div
                          key={news.id}
                          className="bg-surface-800/40 border border-slate-800/60 rounded-2xl p-5 hover:border-slate-700/80 hover:shadow-lg transition-all duration-300 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-4 mb-3">
                              <span className="text-[9px] px-2 py-0.5 rounded border border-slate-700 bg-surface-700 font-black text-slate-300 uppercase">
                                {news.symbol}
                              </span>
                              <span className="text-slate-500 text-[10px]">{news.timestamp}</span>
                            </div>
                            <h3 className="text-white text-sm font-bold mb-2 hover:text-brand-400 cursor-pointer transition-colors" onClick={() => setSelectedNews(news)}>
                              {news.title}
                            </h3>
                            <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
                              {news.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
                            <span className={sentimentBadge}>
                              {news.impact}
                            </span>
                            <button
                              onClick={() => setSelectedNews(news)}
                              className="text-brand-400 hover:text-brand-300 text-xs font-bold transition-colors"
                            >
                              Read Analysis →
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'learning' && (
              <motion.div
                key="learning-hub"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="flex flex-col gap-6 max-w-6xl mx-auto w-full"
              >
                {/* Header Section */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
                  <div>
                    <h2 className="text-white text-3xl font-extrabold tracking-tight mb-1">Learning Hub</h2>
                    <p className="text-slate-400 text-sm">Master investing with AI-guided lessons · Chart explanations</p>
                  </div>

                  <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-semibold shadow-sm">
                    <Check size={14} className="text-emerald-400 shrink-0" />
                    <span>{completedModules}/{totalModules} modules completed</span>
                  </div>
                </div>

                {/* Learning Progress Panel */}
                <div className="bg-slate-900/40 border border-slate-800/80 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 flex flex-col gap-2">
                    <span className="text-white font-bold text-sm">Your Learning Progress</span>
                    <div className="w-full bg-slate-800/60 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500 ease-out" 
                        style={{ width: `${completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-slate-400 text-xs font-medium">{completionPercentage}% complete</span>
                  </div>

                  <div className="flex gap-8 items-center">
                    <div className="text-center">
                      <p className="text-white font-bold text-2xl leading-none">{completedModules}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Done</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-2xl leading-none">{remainingModules}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Remaining</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-bold text-2xl leading-none">{academyTracks.length}</p>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mt-1">Tracks</p>
                    </div>
                  </div>
                </div>

                {/* Workspace Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                  
                  {/* Left Column: Sidebar Tracks */}
                  <div className="flex flex-col gap-3 lg:col-span-1">
                    {academyTracks.map(track => {
                      const IconComponent = IconMap[track.icon] || BookOpen
                      const isActive = track.id === activeTrackId
                      const completedCount = track.modules.filter(m => m.completed).length
                      const totalCount = track.modules.length

                      return (
                        <button
                          key={track.id}
                          onClick={() => setActiveTrackId(track.id)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all duration-300 group
                            ${isActive 
                              ? 'border-emerald-500/60 bg-emerald-500/5 shadow-md shadow-emerald-500/5' 
                              : 'border-slate-800/60 bg-slate-900/20 hover:border-slate-700/80 hover:bg-slate-900/40'}`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`p-2.5 rounded-xl border transition-all duration-300
                              ${isActive
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : 'border-slate-800 bg-slate-900/55 text-slate-400 group-hover:text-slate-300'}`}
                            >
                              <IconComponent size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold tracking-wide transition-colors
                                ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>
                                {track.name}
                              </span>
                              <span className="text-[10px] text-slate-500 font-semibold mt-0.5">
                                {completedCount}/{totalCount}
                              </span>
                            </div>
                          </div>
                          <ChevronRight 
                            size={16} 
                            className={`transition-all duration-300
                              ${isActive 
                                ? 'text-emerald-400 translate-x-0.5' 
                                : 'text-slate-600 group-hover:text-slate-400'}`} 
                          />
                        </button>
                      )
                    })}
                  </div>

                  {/* Right Column: Modules List */}
                  <div className="lg:col-span-3 bg-slate-900/20 border border-slate-800/60 rounded-2xl p-6 flex flex-col gap-6">
                    
                    {/* Active Track Header */}
                    <div className="flex items-center gap-4 pb-4 border-b border-slate-800/60">
                      <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        {(() => {
                          const ActiveIcon = IconMap[activeTrack.icon] || BookOpen
                          return <ActiveIcon size={22} />
                        })()}
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-white text-xl font-bold">{activeTrack.name}</h3>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {activeTrack.modules.filter(m => m.completed).length} of {activeTrack.modules.length} completed
                        </p>
                      </div>
                    </div>

                    {/* Active Track Modules List */}
                    <div className="flex flex-col gap-3">
                      {activeTrack.modules.map((mod, index) => (
                        <div
                          key={mod.id}
                          className="flex items-center justify-between p-4 rounded-xl border border-slate-800/40 bg-slate-900/30 hover:border-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            {/* Completion Indicator Circle */}
                            <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 text-[11px] font-bold
                              ${mod.completed 
                                ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' 
                                : 'border-emerald-500/30 text-emerald-400/80 bg-emerald-500/5'}`}
                            >
                              {mod.completed ? (
                                <Check size={12} className="text-emerald-400" />
                              ) : (
                                <span>{index + 1}</span>
                              )}
                            </div>

                            <div className="flex flex-col gap-1">
                              <span className="text-white text-sm font-semibold tracking-wide">
                                {mod.title}
                              </span>
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <span className="text-[10px] font-medium">{mod.duration}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Button */}
                          <a
                            href={mod.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => handleModuleAction(activeTrack.id, mod.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center gap-1.5 border shadow-sm
                              ${mod.completed
                                ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30'
                                : 'border-emerald-500/80 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 hover:border-emerald-500'}`}
                          >
                            <Play size={12} fill="currentColor" className="shrink-0" />
                            <span>{mod.completed ? 'Rewatch' : 'Start'}</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'terminal' && mobileView === 'chart' && (
              <motion.div 
                key="chart"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-4"
              >
                {lastCandle && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Open', 'High', 'Low', 'Close'].map(l => (
                      <div key={l} className="bg-surface-800/50 border border-slate-800 p-2 rounded-lg">
                        <p className="text-slate-500 text-[8px] uppercase font-bold mb-0.5">{l}</p>
                        <p className="text-white font-mono font-bold text-[11px]">{lastCandle[l.toLowerCase()].toFixed(2)}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Chart key={`${activeSymbol}_${timeframe}`} data={candles} patterns={filteredPatterns} height={window.innerWidth < 640 ? 300 : 400} showPatterns={showPatterns} onShowPatternsChange={setShowPatterns} />
                </div>
                <RecommendationBox trend={trend} patterns={patterns} />
                <LearningCards />
                
                {isBeginner && (
                  <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-xl flex gap-3">
                    <HelpCircle size={20} className="text-blue-400 shrink-0" />
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Market is in a <span className="text-blue-400 font-bold">{trend}</span>. 
                      Trade in the direction of the trend for better success!
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'terminal' && mobileView === 'market' && (
              <motion.div 
                key="market"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="flex flex-col gap-4 lg:hidden"
              >
                <Watchlist activeSymbol={activeSymbol} onSelect={(s) => { setActiveSymbol(s); setMobileView('chart'); }} watchlist={watchlist} setWatchlist={setWatchlist} />
                <Filters market={market} setMarket={setMarket} timeframe={timeframe} setTimeframe={setTimeframe} signal={signal} setSignal={setSignal} />
              </motion.div>
            )}

            {activeTab === 'terminal' && mobileView === 'patterns' && (
              <motion.div 
                key="patterns"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="flex flex-col gap-4 lg:hidden"
              >
                <PatternPanel patterns={filteredPatterns} activeSymbol={activeSymbol} onSymbolChange={setActiveSymbol} />
                <AlertPanel alerts={alerts} onDismiss={id => setAlerts(a => a.filter(x => x.id !== id))} />
              </motion.div>
            )}

            {activeTab === 'terminal' && mobileView === 'portfolio' && (
              <motion.div 
                key="portfolio"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className="flex flex-col gap-6 lg:hidden"
              >
                <div className="bg-surface-800 p-6 rounded-2xl border border-slate-700 text-center">
                  <h3 className="text-slate-500 text-xs uppercase font-bold mb-4">Paper Trading Wallet</h3>
                  <p className="text-white text-4xl font-mono font-black mb-2">₹{portfolioValue.toLocaleString()}</p>
                  <p className={`text-sm font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {profit >= 0 ? '+' : ''}{profit.toFixed(2)} ({profitPct}%)
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <button onClick={buyAsset} disabled={portfolio.balance <= 0} 
                            className="bg-emerald-500 text-white font-black py-4 rounded-xl uppercase disabled:opacity-50">
                      Buy
                    </button>
                    <button onClick={sellAsset} disabled={(portfolio.holdings[activeSymbol] || 0) <= 0}
                            className="bg-red-500 text-white font-black py-4 rounded-xl uppercase disabled:opacity-50">
                      Sell
                    </button>
                  </div>
                </div>
                
                <div className="p-4 bg-surface-800/50 rounded-xl border border-slate-800">
                  <h4 className="text-white text-xs font-bold mb-2">Current Position</h4>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[11px]">{activeSymbol} Holdings:</span>
                    <span className="text-white font-mono text-[11px]">{(portfolio.holdings[activeSymbol] || 0).toFixed(4)}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right Sidebar - Desktop only */}
        {activeTab === 'terminal' && (
          <aside className="w-80 hidden lg:flex flex-col gap-6 p-6 border-l border-slate-800/50 overflow-y-auto">
            <div className="bg-surface-800 p-4 rounded-xl border border-slate-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-slate-500 uppercase font-black">Wallet</span>
                <span className={`text-[10px] font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {profit >= 0 ? '+' : ''}{profitPct}%
                </span>
              </div>
              <p className="text-white font-mono font-bold">₹{portfolioValue.toLocaleString()}</p>
              {Object.keys(portfolio.holdings).length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-700/50 flex flex-col gap-1.5">
                  {Object.entries(portfolio.holdings).map(([symId, qty]) => (
                    <div key={symId} className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-400 font-bold">{symId} Position:</span>
                      <span className="text-white font-mono font-medium">{qty.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button onClick={buyAsset} disabled={portfolio.balance <= 0} className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-[10px] font-black py-1.5 rounded uppercase">Buy</button>
                <button onClick={sellAsset} disabled={(portfolio.holdings[activeSymbol] || 0) <= 0} className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-[10px] font-black py-1.5 rounded uppercase">Sell</button>
              </div>
            </div>
            <RecommendationBox trend={trend} patterns={patterns} />
            <LearningCards />
            <PatternPanel patterns={filteredPatterns} activeSymbol={activeSymbol} onSymbolChange={setActiveSymbol} />
            <AlertPanel alerts={alerts} onDismiss={id => setAlerts(a => a.filter(x => x.id !== id))} />
          </aside>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface-900 border-t border-slate-800 flex items-center justify-around px-2 z-50 lg:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <button onClick={() => { setActiveTab('terminal'); setMobileView('market'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'terminal' && mobileView === 'market' ? 'text-brand-500' : 'text-slate-500'}`}>
            <List size={18} />
            <span className="text-[7.5px] font-bold uppercase">Market</span>
          </button>
          <button onClick={() => { setActiveTab('terminal'); setMobileView('chart'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'terminal' && mobileView === 'chart' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Layout size={18} />
            <span className="text-[7.5px] font-bold uppercase">Chart</span>
          </button>
          <button onClick={() => { setActiveTab('terminal'); setMobileView('patterns'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'terminal' && mobileView === 'patterns' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Bell size={18} />
            <span className="text-[7.5px] font-bold uppercase">Signals</span>
          </button>
          <button onClick={() => { setActiveTab('news'); setMobileView('news'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'news' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Activity size={18} />
            <span className="text-[7.5px] font-bold uppercase">News</span>
          </button>
          <button onClick={() => { setActiveTab('learning'); setMobileView('learning'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'learning' ? 'text-brand-500' : 'text-slate-500'}`}>
            <BookOpen size={18} />
            <span className="text-[7.5px] font-bold uppercase">Academy</span>
          </button>
          <button onClick={() => { setActiveTab('terminal'); setMobileView('portfolio'); }} className={`flex flex-col items-center gap-1 ${activeTab === 'terminal' && mobileView === 'portfolio' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Wallet size={18} />
            <span className="text-[7.5px] font-bold uppercase">Wallet</span>
          </button>
        </nav>
      </div>

      {/* News Detail Modal */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-800 border border-slate-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Market News Details</span>
                </div>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="text-slate-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Title */}
              <h3 className="text-white text-base font-bold leading-snug mb-3">
                {selectedNews.title}
              </h3>

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase
                  ${selectedNews.impact === 'bullish' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                    selectedNews.impact === 'bearish' ? 'text-red-400 bg-red-500/10 border-red-500/20' :
                    'text-amber-400 bg-amber-500/10 border-amber-500/20'}`}
                >
                  {selectedNews.impact} Impact
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Asset: <span className="text-white font-bold">{selectedNews.symbol}</span>
                </span>
                {selectedNews.source && (
                  <span className="text-slate-400 text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 font-semibold">
                    {selectedNews.source}
                  </span>
                )}
                <span className="text-slate-500 text-[10px]">
                  {selectedNews.timestamp}
                </span>
              </div>

              {/* Body */}
              <p className="text-slate-300 text-xs leading-relaxed mb-6">
                {selectedNews.description}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={() => setSelectedNews(null)}
                  className="px-4 py-2 border border-slate-700 hover:bg-slate-700/30 text-slate-300 text-xs rounded-xl font-medium transition-all duration-200"
                >
                  Close
                </button>
                {selectedNews.link && (
                  <button
                    onClick={() => {
                      window.open(selectedNews.link, '_blank');
                    }}
                    className="px-4 py-2 border border-sky-500/30 hover:bg-sky-500/10 text-sky-400 text-xs rounded-xl font-semibold transition-all duration-200"
                  >
                    Read Authentic News →
                  </button>
                )}
                {selectedNews.symbol !== 'General' && (
                  <button
                    onClick={() => {
                      setActiveSymbol(selectedNews.symbol);
                      setSelectedNews(null);
                    }}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-xs rounded-xl font-bold transition-all duration-200 flex items-center gap-1.5 shadow-lg shadow-brand-500/10"
                  >
                    <BarChart2 size={12} /> View {selectedNews.symbol} Chart
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ChatBot */}
      <ChatBot
        symbol={activeSymbol}
        patterns={patterns}
        trend={trend}
        isMinimized={isChatBotMinimized}
        onToggleMinimize={() => setIsChatBotMinimized(!isChatBotMinimized)}
      />
    </div>
  )
}
