import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  BarChart2, RefreshCw, Activity, BookOpen, Zap, AlertCircle, 
  TrendingUp, HelpCircle, Menu, X, Layout, Wallet, List, Bell, Search, Settings,
  Bitcoin, Shield, Play, Check, ChevronRight, Briefcase, LogOut, Scale
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Chart from '../components/Chart'
import PatternPanel from '../components/PatternPanel'
import AlertPanel from '../components/AlertPanel'
import Watchlist from '../components/Watchlist'
import Filters from '../components/Filters'
import LearningCards from '../components/LearningCards'
import RecommendationBox from '../components/RecommendationBox'
import ChatBot from '../components/ChatBot'
import PaperTradingTab from '../components/PaperTradingTab'
import PriceAlerts from '../components/PriceAlerts'
import ScannerControls from '../components/ScannerControls'
import Leaderboard from '../components/Leaderboard'
import NewsSection from '../components/Dashboard/NewsSection'
import AITradeRecommendations from '../components/Dashboard/AITradeRecommendations'
import NewsPatternCorrelation from '../components/Dashboard/NewsPatternCorrelation'
import MarketCopilot from '../components/Dashboard/MarketCopilot'
import { CANDLE_DATA, ALL_SYMBOLS, SYMBOLS, getNextCandle } from '../data/mockData'
import { STOCK_MARKET_NEWS } from '../data/newsData'
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
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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
  const portfolioId = user?.uid || localStorage.getItem('tradewise_paper_portfolio_id')

  const [portfolio, setPortfolio] = useState({ 
    balance: 10000, 
    holdings: {}, 
    initial: 10000,
    id: portfolioId,
    rawPositions: []
  })
  const [mobileView, setMobileView] = useState('chart') // 'chart', 'market', 'patterns', 'portfolio'
  const [selectedNews, setSelectedNews] = useState(null)
  const [activeTab, setActiveTab] = useState('terminal') // 'terminal', 'news'
  const [newsSearch, setNewsSearch] = useState('')
  const [newsImpactFilter, setNewsImpactFilter] = useState('All')
  const [newsAssetFilter, setNewsAssetFilter] = useState('All')
  const [liveNews, setLiveNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [watchlist, setWatchlist] = useState(['AAPL', 'BTC', 'EURUSD'])
  const [showNotificationsPanel, setShowNotificationsPanel] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [userSettings, setUserSettings] = useState({ email_alerts: true, weekly_report: true, theme: 'dark' })

  // Custom setWatchlist helper to sync with backend database
  const handleSetWatchlist = useCallback((updateFn) => {
    setWatchlist(prev => {
      const next = typeof updateFn === 'function' ? updateFn(prev) : updateFn
      const added = next.filter(s => !prev.includes(s))
      const removed = prev.filter(s => !next.includes(s))

      added.forEach(s => {
        if (portfolioId) {
          fetch('/api/v1/paper/watchlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: portfolioId, symbol: s })
          }).catch(err => console.error('Watchlist sync error:', err))
        }
      })

      removed.forEach(s => {
        if (portfolioId) {
          fetch(`/api/v1/paper/watchlist/${portfolioId}/${s}`, {
            method: 'DELETE'
          }).catch(err => console.error('Watchlist sync error:', err))
        }
      })

      return next
    })
  }, [portfolioId])

  const fetchNotificationsAndSettings = useCallback(async () => {
    if (!portfolioId) return
    try {
      const notifRes = await fetch(`/api/v1/paper/notifications/${portfolioId}`)
      const notifData = await notifRes.json()
      if (notifData.success) {
        setNotifications(notifData.notifications)
      }

      const settingsRes = await fetch(`/api/v1/paper/settings/${portfolioId}`)
      const settingsData = await settingsRes.json()
      if (settingsData.success) {
        setUserSettings(settingsData.settings)
      }

      const watchlistRes = await fetch(`/api/v1/paper/watchlist/${portfolioId}`)
      const watchlistData = await watchlistRes.json()
      if (watchlistData.success && watchlistData.watchlist && watchlistData.watchlist.length > 0) {
        setWatchlist(watchlistData.watchlist.map(item => item.symbol))
      }
    } catch (err) {
      console.error('Failed to load settings or notifications:', err)
    }
  }, [portfolioId])

  useEffect(() => {
    fetchNotificationsAndSettings()
    const interval = setInterval(fetchNotificationsAndSettings, 60000)
    return () => clearInterval(interval)
  }, [fetchNotificationsAndSettings])

  const handleMarkNotificationRead = async (notifId) => {
    try {
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
      await fetch('/api/v1/paper/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: portfolioId, notificationId: notifId })
      })
    } catch (err) {
      console.error('Failed to mark notification as read:', err)
    }
  }

  const handleUpdateSettings = async (updatedFields) => {
    const nextSettings = { ...userSettings, ...updatedFields }
    setUserSettings(nextSettings)
    try {
      await fetch('/api/v1/paper/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: portfolioId, ...nextSettings })
      })
    } catch (err) {
      console.error('Failed to update settings:', err)
    }
  }

  const unreadNotificationsCount = notifications.filter(n => !n.read).length
  const [isChatBotMinimized, setIsChatBotMinimized] = useState(true)

  const fetchBackendPortfolio = useCallback(async (id) => {
    if (!id) return
    try {
      let res = await fetch(`/api/v1/paper/portfolio/${id}`)
      if (res.status === 404) {
        // Auto-create on 404 if the portfolio doesn't exist yet
        await fetch('/api/v1/paper/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            name: user?.name ? `${user.name}'s Paper Account` : 'TradeWise Paper Account',
            startingBalance: 10000
          })
        })
        res = await fetch(`/api/v1/paper/portfolio/${id}`)
      }
      const data = await res.json()
      if (data.success && data.portfolio) {
        const port = data.portfolio
        const holdings = {}
        if (port.positions) {
          port.positions.forEach(pos => {
            holdings[pos.symbol.toUpperCase()] = (holdings[pos.symbol.toUpperCase()] || 0) + pos.quantity
          })
        }
        setPortfolio({
          id: port.id,
          balance: port.cash_balance,
          holdings: holdings,
          initial: port.starting_balance,
          rawPositions: port.positions || []
        })
      }
    } catch (err) {
      console.error('Error fetching backend portfolio in Dashboard:', err)
    }
  }, [user])

  const handleRefreshPortfolio = useCallback(() => {
    if (portfolioId) {
      fetchBackendPortfolio(portfolioId)
    }
  }, [portfolioId, fetchBackendPortfolio])

  useEffect(() => {
    if (portfolioId) {
      fetchBackendPortfolio(portfolioId)
      const interval = setInterval(() => {
        fetchBackendPortfolio(portfolioId)
      }, 10000)
      return () => clearInterval(interval)
    } else {
      // If no portfolio ID exists at all (guest on fresh load)
      fetch('/api/v1/paper/portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'TradeWise Paper Account', startingBalance: 10000 })
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.portfolio) {
          localStorage.setItem('tradewise_paper_portfolio_id', data.portfolio.id)
          fetchBackendPortfolio(data.portfolio.id)
        }
      })
      .catch(err => console.error('Failed to auto-create portfolio in Dashboard mount:', err))
    }
  }, [portfolioId, fetchBackendPortfolio])

  const buyAsset = async () => {
    const lastCandle = candles[candles.length - 1]
    if (!lastCandle) return

    const sym = activeSymbol.toUpperCase()
    const validSymbols = ['AAPL', 'MSFT', 'GOOGL', 'BTC', 'ETH', 'EURUSD', 'GBPUSD']
    if (!validSymbols.includes(sym)) {
      alert(`Symbol "${activeSymbol}" is not supported in the Paper Trading engine. Supported symbols: ${validSymbols.join(', ')}`)
      return
    }

    const amount = portfolio.balance / lastCandle.close
    if (amount <= 0.0001) {
      alert('Available balance is too low to purchase a valid quantity.')
      return
    }

    try {
      const res = await fetch('/api/v1/paper/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: portfolio.id,
          symbol: sym,
          quantity: amount
        })
      })
      const data = await res.json()
      if (data.success) {
        fetchBackendPortfolio(portfolio.id)
      } else {
        alert(data.error || 'Failed to place buy order')
      }
    } catch (err) {
      console.error('Failed to buy asset:', err)
      alert('Error connecting to backend server.')
    }
  }

  const sellAsset = async () => {
    const sym = activeSymbol.toUpperCase()
    const position = portfolio.rawPositions?.find(p => p.symbol === sym && p.side === 'BUY')
    if (!position) {
      alert(`No open BUY position found for ${sym}. You must own the asset first.`)
      return
    }

    try {
      const res = await fetch(`/api/v1/paper/positions/${position.id}?portfolioId=${portfolio.id}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        fetchBackendPortfolio(portfolio.id)
      } else {
        alert(data.error || 'Failed to close position')
      }
    } catch (err) {
      console.error('Failed to sell asset:', err)
      alert('Error connecting to backend server.')
    }
  }

  const handleSelectSuggestion = (setup) => {
    setActiveSymbol(setup.symbol)
    setMobileView('chart')
    setActiveTab('terminal')
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
      const symInfo = ALL_SYMBOLS.find(s => s.id === sym)
      const isCrypto = symInfo?.market === 'crypto'

      let data = []
      let realTime = false

      if (isCrypto) {
        // Crypto → Binance REST (free, no key)
        try {
          data = await BinanceService.getHistoricalData(sym + 'USDT', timeframe)
          if (data && data.length > 0) realTime = true
        } catch (err) {
          console.error('Binance historical fetch failed, trying backend:', err)
        }
      }

      // Stocks & Forex → backend /api/market/ohlc (Twelve Data)
      if (!realTime || !data || data.length === 0) {
        try {
          const res = await fetch(`/api/market/ohlc/${sym}?timeframe=${timeframe}&limit=120`)
          const json = await res.json()
          if (json.success && json.data && json.data.length > 0) {
            data = json.data
            realTime = json.source !== 'mock'
          }
        } catch (err) {
          console.error('Backend OHLC fetch failed, falling back to mock:', err)
        }
      }

      // Final fallback → seeded mock data
      if (!data || data.length === 0) {
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
            if (!prev || prev.length === 0) return [newCandle]
            const last = prev[prev.length - 1]
            let updated = []
            if (last && last.time === newCandle.time) {
              updated = [...prev.slice(0, -1), newCandle]
            } else if (newCandle.time > last.time) {
              updated = [...prev.slice(-199), newCandle]
            } else {
              return prev
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
            if (!prev || prev.length === 0) return [newCandle]
            const last = prev[prev.length - 1]
            let updated = []
            if (last && last.time === newCandle.time) {
              updated = [...prev.slice(0, -1), newCandle]
            } else {
              updated = [...prev.slice(-119), newCandle]
            }
            handleNewData(updated, newCandle)
            return updated
          })
          setLastUpdate(new Date().toLocaleTimeString())
        }, 1500)
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
            onClick={() => setActiveTab('paper')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5
              ${activeTab === 'paper' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Briefcase size={12} />
            Paper Trading
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex items-center gap-1.5
              ${activeTab === 'analytics' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Scale size={12} />
            AI Correlation
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
          
          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />
          <div className="flex items-center gap-2">
            <img src={user?.avatar} alt={user?.name} className="w-7 h-7 rounded-full border border-slate-700 bg-slate-800 hidden md:block" />
            
            {/* Notifications Bell */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationsPanel(!showNotificationsPanel)} 
                className={`p-1.5 rounded relative border transition-all text-xs font-bold uppercase flex items-center gap-1.5
                  ${showNotificationsPanel ? 'text-brand-400 bg-brand-500/10 border-brand-500/30' : 'text-slate-400 bg-surface-800 border-slate-700 hover:text-white'}`}
              >
                <Bell size={12} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full text-[8px] font-black w-4 h-4 flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {/* Notifications panel dropdown */}
              {showNotificationsPanel && (
                <div className="absolute right-0 mt-2 w-80 bg-surface-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-4 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                    <h4 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Bell size={12} className="text-brand-400" /> Notifications
                    </h4>
                    <button 
                      onClick={() => setShowNotificationsPanel(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  <div className="space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-slate-500 text-[10px] text-center py-4">No recent notifications</p>
                    ) : (
                      notifications.map(n => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            if (!n.read) handleMarkNotificationRead(n.id)
                          }}
                          className={`p-2.5 rounded-lg border transition-all text-left cursor-pointer
                            ${n.read 
                              ? 'bg-surface-900/50 border-slate-800/80 text-slate-500' 
                              : 'bg-brand-500/10 border-brand-500/30 text-white font-semibold'}`}
                        >
                          <p className="text-xs">{n.title}</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[8px] text-slate-500 block mt-1.5">
                            {new Date(n.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button 
              onClick={() => setShowSettingsModal(true)} 
              className="p-1.5 rounded text-slate-400 bg-surface-800 border border-slate-700 hover:text-white transition-all flex items-center gap-1.5"
            >
              <Settings size={12} />
            </button>

            <button 
              onClick={handleLogout}
              className="p-1.5 rounded hover:text-red-400 text-slate-400 bg-surface-800 border border-slate-700 hover:border-red-500/30 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <LogOut size={12} /> <span className="hidden sm:inline">Log Out</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar - Desktop only */}
        {activeTab === 'terminal' && (
          <aside className="w-64 hidden lg:flex flex-col gap-4 p-4 border-r border-slate-800/50 overflow-y-auto">
            <Watchlist activeSymbol={activeSymbol} onSelect={setActiveSymbol} watchlist={watchlist} setWatchlist={handleSetWatchlist} />
            <PriceAlerts activeSymbol={activeSymbol} currentPrice={lastCandle ? lastCandle.close : null} />
            <ScannerControls />
            <Leaderboard />
            <Filters market={market} setMarket={setMarket} timeframe={timeframe} setTimeframe={setTimeframe} signal={signal} setSignal={setSignal} />
          </aside>
        )}

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          <AnimatePresence mode="wait">
            {activeTab === 'news' && (
              <NewsSection
                filteredNews={filteredNews}
                newsSearch={newsSearch}
                setNewsSearch={setNewsSearch}
                handleNewsSearchSubmit={handleNewsSearchSubmit}
                newsImpactFilter={newsImpactFilter}
                setNewsImpactFilter={setNewsImpactFilter}
                newsAssetFilter={newsAssetFilter}
                setNewsAssetFilter={setNewsAssetFilter}
                loadDefaultNews={loadDefaultNews}
                newsLoading={newsLoading}
                setActiveSymbol={setActiveSymbol}
                setActiveTab={setActiveTab}
              />
            )}



            {activeTab === 'paper' && (
              <motion.div
                key="paper-trading"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="w-full"
              >
                <PaperTradingTab
                  activeSymbol={activeSymbol}
                  lastCandlePrice={lastCandle ? lastCandle.close : null}
                  onRefreshPortfolio={handleRefreshPortfolio}
                />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-6xl mx-auto w-full flex flex-col gap-6"
              >
                <div className="border-b border-slate-800/80 pb-4">
                  <h2 className="text-white text-3xl font-extrabold tracking-tight mb-1">AI Correlation Analysis</h2>
                  <p className="text-slate-400 text-xs">Analyze how real-time news sentiment impacts technical pattern success rates</p>
                </div>
                
                <NewsPatternCorrelation portfolioId={portfolioId} />
              </motion.div>
            )}



            {activeTab === 'terminal' && mobileView === 'chart' && (
              <motion.div 
                key="chart"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col gap-5"
              >
                <AITradeRecommendations portfolioId={portfolioId} onQuickSelect={handleSelectSuggestion} />

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
                <MarketCopilot symbol={activeSymbol} />
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
                <Watchlist activeSymbol={activeSymbol} onSelect={(s) => { setActiveSymbol(s); setMobileView('chart'); }} watchlist={watchlist} setWatchlist={handleSetWatchlist} />
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
            <MarketCopilot symbol={activeSymbol} />
            <RecommendationBox trend={trend} patterns={patterns} />
            <LearningCards />
            <PatternPanel patterns={filteredPatterns} activeSymbol={activeSymbol} onSymbolChange={setActiveSymbol} />
            <AlertPanel alerts={alerts} onDismiss={id => setAlerts(a => a.filter(x => x.id !== id))} />
          </aside>
        )}

        {/* Mobile Bottom Navigation */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-surface-900 border-t border-slate-800 flex items-center justify-around px-0.5 z-50 lg:hidden shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
          <button onClick={() => { setActiveTab('terminal'); setMobileView('market'); }} className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${activeTab === 'terminal' && mobileView === 'market' ? 'text-brand-500' : 'text-slate-500'}`}>
            <List size={15} />
            <span className="text-[6.5px] xs:text-[7.5px] font-bold uppercase tracking-tight truncate w-full text-center">Market</span>
          </button>
          <button onClick={() => { setActiveTab('terminal'); setMobileView('chart'); }} className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${activeTab === 'terminal' && mobileView === 'chart' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Layout size={15} />
            <span className="text-[6.5px] xs:text-[7.5px] font-bold uppercase tracking-tight truncate w-full text-center">Chart</span>
          </button>
          <button onClick={() => { setActiveTab('terminal'); setMobileView('patterns'); }} className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${activeTab === 'terminal' && mobileView === 'patterns' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Bell size={15} />
            <span className="text-[6.5px] xs:text-[7.5px] font-bold uppercase tracking-tight truncate w-full text-center">Signals</span>
          </button>
          <button onClick={() => { setActiveTab('news'); setMobileView('news'); }} className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${activeTab === 'news' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Activity size={15} />
            <span className="text-[6.5px] xs:text-[7.5px] font-bold uppercase tracking-tight truncate w-full text-center">News</span>
          </button>
          <button onClick={() => { setActiveTab('analytics'); setMobileView('analytics'); }} className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${activeTab === 'analytics' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Scale size={15} />
            <span className="text-[6.5px] xs:text-[7.5px] font-bold uppercase tracking-tight truncate w-full text-center">Analytics</span>
          </button>

          <button onClick={() => { setActiveTab('terminal'); setMobileView('portfolio'); }} className={`flex-1 flex flex-col items-center gap-1 min-w-0 ${activeTab === 'terminal' && mobileView === 'portfolio' ? 'text-brand-500' : 'text-slate-500'}`}>
            <Wallet size={15} />
            <span className="text-[6.5px] xs:text-[7.5px] font-bold uppercase tracking-tight truncate w-full text-center">Wallet</span>
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
        portfolioId={portfolioId}
      />

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-surface-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-800 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Settings size={18} className="text-brand-400" /> Account Settings
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3.5 bg-surface-900/50 border border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-white text-xs font-bold">Email Alerts</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">Receive email notifications for watchlist technical patterns.</p>
                </div>
                <button 
                  onClick={() => handleUpdateSettings({ email_alerts: !userSettings.email_alerts })}
                  className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none ${userSettings.email_alerts ? 'bg-brand-500' : 'bg-slate-700'}`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${userSettings.email_alerts ? 'left-5' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-surface-900/50 border border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-white text-xs font-bold">Weekly Summary Reports</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">Receive weekly email summaries of paper trading portfolio health.</p>
                </div>
                <button 
                  onClick={() => handleUpdateSettings({ weekly_report: !userSettings.weekly_report })}
                  className={`w-10 h-6 rounded-full transition-colors relative focus:outline-none ${userSettings.weekly_report ? 'bg-brand-500' : 'bg-slate-700'}`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${userSettings.weekly_report ? 'left-5' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-surface-900/50 border border-slate-800 rounded-xl">
                <div>
                  <h4 className="text-white text-xs font-bold">Theme Mode</h4>
                  <p className="text-slate-400 text-[10px] mt-0.5">Select visual interface appearance.</p>
                </div>
                <select
                  value={userSettings.theme}
                  onChange={e => handleUpdateSettings({ theme: e.target.value })}
                  className="bg-surface-800 border border-slate-700 rounded-lg text-xs text-white p-1.5 focus:outline-none"
                >
                  <option value="dark">Dark Theme</option>
                  <option value="light" disabled>Light Theme (Coming Soon)</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
