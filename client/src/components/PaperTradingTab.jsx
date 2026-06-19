import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp, TrendingDown, RefreshCw, ArrowUpRight, ArrowDownRight,
  DollarSign, Wallet, Award, Activity, RotateCcw, ShieldAlert,
  BarChart2, Briefcase, ChevronRight, Clock, Zap, Filter,
  Download, MoreHorizontal, CheckCircle, AlertCircle, X,
  ArrowRight, Circle, Layers, ChevronDown, Bot
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api/v1/paper'
const SUPPORTED_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'BTC', 'ETH', 'EURUSD', 'GBPUSD']

// ── Asset config ──────────────────────────────────────────────────────────────
const ASSET_CONFIG = {
  BTC:    { color: '#f7931a', bg: 'bg-amber-500/20',   text: 'text-amber-400',   label: 'Bitcoin' },
  ETH:    { color: '#627eea', bg: 'bg-indigo-500/20',  text: 'text-indigo-400',  label: 'Ethereum' },
  AAPL:   { color: '#a3a3a3', bg: 'bg-slate-500/20',   text: 'text-slate-300',   label: 'Apple' },
  MSFT:   { color: '#00a4ef', bg: 'bg-blue-500/20',    text: 'text-blue-400',    label: 'Microsoft' },
  GOOGL:  { color: '#ea4335', bg: 'bg-red-500/20',     text: 'text-red-400',     label: 'Google' },
  EURUSD: { color: '#10b981', bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'EUR/USD' },
  GBPUSD: { color: '#8b5cf6', bg: 'bg-purple-500/20',  text: 'text-purple-400',  label: 'GBP/USD' },
}
const getAsset = (sym) => ASSET_CONFIG[sym?.toUpperCase()] || { color: '#8b5cf6', bg: 'bg-purple-500/20', text: 'text-purple-400', label: sym }

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n, dec = 2) {
  if (n == null) return '—'
  return Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })
}
function timeAgo(ts) {
  if (!ts) return ''
  const timeMs = typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime()
  const diff = Date.now() - timeMs
  const m = Math.floor(diff / 60000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Sub-components ────────────────────────────────────────────────────────────
function AssetIcon({ symbol, size = 28 }) {
  const cfg = getAsset(symbol)
  return (
    <div
      className={`flex items-center justify-center rounded-full ${cfg.bg} shrink-0 border border-white/5`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      <span className={`font-black ${cfg.text}`}>{symbol?.slice(0, 2)}</span>
    </div>
  )
}

function Pill({ children, color = 'green' }) {
  const map = {
    green:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
    red:    'bg-rose-500/10    text-rose-400    border-rose-500/25 shadow-[0_0_8px_rgba(244,63,94,0.15)]',
    yellow: 'bg-amber-500/10  text-amber-400  border-amber-500/25',
    blue:   'bg-blue-500/10   text-blue-400   border-blue-500/25 shadow-[0_0_8px_rgba(59,130,246,0.15)]',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/25',
  }
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${map[color]}`}>
      {children}
    </span>
  )
}

function PerfCard({ label, value, isPos, isNeg, sub, Icon }) {
  const color = isPos ? 'text-emerald-400 font-bold' : isNeg ? 'text-rose-400 font-bold' : 'text-white'
  return (
    <div className="flex flex-col gap-1 p-4 bg-slate-950/20 hover:bg-slate-950/45 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-300">
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon size={12} className="text-violet-400/80" />}
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-base font-black font-mono tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 font-medium">{sub}</p>}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PaperTradingTab({ activeSymbol, lastCandlePrice, onRefreshPortfolio }) {
  const { user } = useAuth()
  const portfolioId = user?.uid || localStorage.getItem('tradewise_paper_portfolio_id')

  // ── State ──────────────────────────────────────────────────────────────────
  const [portfolio, setPortfolio]   = useState(null)
  const [metrics,   setMetrics]     = useState(null)
  const [trades,    setTrades]      = useState([])
  const [loading,   setLoading]     = useState(true)
  const [error,     setError]       = useState(null)

  // Stable callback ref — prevents infinite render loop
  const onRefreshPortfolioRef = useRef(onRefreshPortfolio)
  useEffect(() => { onRefreshPortfolioRef.current = onRefreshPortfolio }, [onRefreshPortfolio])

  // Order Ticket
  const [orderSymbol,  setOrderSymbol]  = useState(activeSymbol || 'BTC')
  const [orderSide,    setOrderSide]    = useState('BUY')
  const [orderQty,     setOrderQty]     = useState('0.1')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError,   setOrderError]   = useState(null)
  const [orderSuccess, setOrderSuccess] = useState(null)
  const [assetDropdownOpen, setAssetDropdownOpen] = useState(false)

  // Reset
  const [resetBalance,     setResetBalance]     = useState('10000')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetLoading,     setResetLoading]     = useState(false)

  // Trajectory hover state
  const [hoveredPoint, setHoveredPoint] = useState(null)
  const svgRef = useRef(null)

  // AI Technical Intelligence backend fetching
  const [aiAnalysis, setAiAnalysis] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [marketMood, setMarketMood] = useState(null)

  const fetchAiAnalysis = useCallback(async (symbol) => {
    if (!symbol) return
    setAiLoading(true)
    try {
      const res = await fetch(`${API_BASE}/analysis/${symbol.toUpperCase()}`)
      const data = await res.json()
      if (data.success) {
        setAiAnalysis(data.analysis)
      }
    } catch (err) {
      console.error('Failed to fetch AI analysis:', err)
    } finally {
      setAiLoading(false)
    }
  }, [])

  const fetchMarketMood = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/market-mood`)
      const data = await res.json()
      if (data.success) {
        setMarketMood(data.mood)
      }
    } catch (err) {
      console.error('Failed to fetch market mood:', err)
    }
  }, [])

  useEffect(() => {
    fetchAiAnalysis(orderSymbol)
  }, [orderSymbol, fetchAiAnalysis])

  // ── Auto-align symbol ──────────────────────────────────────────────────────
  useEffect(() => {
    if (activeSymbol && SUPPORTED_SYMBOLS.includes(activeSymbol.toUpperCase())) {
      setOrderSymbol(activeSymbol.toUpperCase())
    }
  }, [activeSymbol])

  // ── Fetch all data ─────────────────────────────────────────────────────────
  const fetchAllData = useCallback(async (id) => {
    if (!id) return
    try {
      setError(null)
      const portRes  = await fetch(`${API_BASE}/portfolio/${id}`)
      const portData = await portRes.json()
      if (!portRes.ok || !portData.success) throw new Error(portData.error || 'Failed to fetch portfolio')
      setPortfolio(portData.portfolio)

      const metData = await (await fetch(`${API_BASE}/metrics/${id}`)).json()
      if (metData.success) setMetrics(metData.metrics)

      const tradeData = await (await fetch(`${API_BASE}/trades/${id}?limit=20`)).json()
      if (tradeData.success) setTrades(tradeData.trades)

      if (onRefreshPortfolioRef.current && portData.portfolio) {
        onRefreshPortfolioRef.current({
          balance:     portData.portfolio.cash_balance,
          totalValue:  portData.portfolio.total_value,
          positions:   portData.portfolio.positions || []
        })
      }
    } catch (err) {
      console.error('Error fetching paper trading data:', err)
      setError('Connection to backend lost. Please try refreshing.')
    }
  }, [])

  // ── Init portfolio ─────────────────────────────────────────────────────────
  const initPortfolio = useCallback(async () => {
    if (!portfolioId) return
    setLoading(true)
    try {
      setError(null)
      const res = await fetch(`${API_BASE}/portfolio/${portfolioId}`)
      if (res.status === 404) {
        await fetch(`${API_BASE}/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: portfolioId, name: `${user?.name || 'TradeWise'}'s Paper Account`, startingBalance: 10000 })
        })
      }
      await fetchAllData(portfolioId)
    } catch (err) {
      console.error('Initial load failed:', err)
      setError('Could not connect to the database. Make sure the server is running.')
    } finally {
      setLoading(false)
    }
  }, [portfolioId, fetchAllData, user])

  useEffect(() => {
    if (!portfolioId) { setLoading(false); return }
    initPortfolio()
    fetchMarketMood()
    const interval = setInterval(() => {
      fetchAllData(portfolioId)
      fetchMarketMood()
    }, 4000)
    return () => clearInterval(interval)
  }, [portfolioId, fetchAllData, initPortfolio, fetchMarketMood])

  // ── Place order ────────────────────────────────────────────────────────────
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault()
    setOrderLoading(true); setOrderError(null); setOrderSuccess(null)
    try {
      const payload = { portfolioId, symbol: orderSymbol.toUpperCase(), quantity: Number(orderQty) }
      if (orderSide === 'BUY') {
        const res  = await fetch(`${API_BASE}/positions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const data = await res.json()
        if (data.success) { 
          setOrderSuccess(`BUY filled: ${data.position.quantity} ${data.position.symbol} @ ₹${data.fill.fillPrice}`)
          fetchAllData(portfolioId)
          fetchAiAnalysis(orderSymbol)
        }
        else setOrderError(data.error || 'Failed to place buy order')
      } else {
        const position = portfolio?.positions?.find(p => p.symbol === orderSymbol.toUpperCase() && p.side === 'BUY')
        if (!position) throw new Error(`No open BUY position for ${orderSymbol}. Buy first.`)
        const res  = await fetch(`${API_BASE}/positions/${position.id}?portfolioId=${portfolioId}`, { method: 'DELETE' })
        const data = await res.json()
        if (data.success) { 
          setOrderSuccess(`SELL filled: Closed ${orderSymbol} @ ₹${data.fill.fillPrice}`)
          fetchAllData(portfolioId)
          fetchAiAnalysis(orderSymbol)
        }
        else setOrderError(data.error || 'Failed to close position')
      }
    } catch (err) {
      setOrderError(err.message || 'An error occurred.')
    } finally {
      setOrderLoading(false)
    }
  }

  // ── Close position ─────────────────────────────────────────────────────────
  const handleClosePosition = async (positionId) => {
    try {
      const res  = await fetch(`${API_BASE}/positions/${positionId}?portfolioId=${portfolioId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        fetchAllData(portfolioId)
        fetchAiAnalysis(orderSymbol)
      }
      else alert(data.error || 'Failed to close position')
    } catch (err) { console.error('Failed to close position:', err) }
  }

  // ── Reset portfolio ────────────────────────────────────────────────────────
  const handleResetPortfolio = async () => {
    setResetLoading(true)
    try {
      const res  = await fetch(`${API_BASE}/reset/${portfolioId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newBalance: Number(resetBalance) }) })
      const data = await res.json()
      if (data.success) { setShowResetConfirm(false); fetchAllData(portfolioId) }
      else alert(data.error || 'Failed to reset portfolio')
    } catch (err) { console.error('Reset failed:', err) }
    finally { setResetLoading(false) }
  }

  // ── Get Estimated Asset Price ──────────────────────────────────────────────
  const getSymbolPrice = (sym) => {
    if (sym.toUpperCase() === activeSymbol?.toUpperCase() && lastCandlePrice) {
      return lastCandlePrice
    }
    const pos = portfolio?.positions?.find(p => p.symbol === sym.toUpperCase())
    if (pos?.current_price) return pos.current_price
    
    const tr = trades?.find(t => t.symbol === sym.toUpperCase())
    if (tr?.fill_price) return tr.fill_price

    const fallbacks = { AAPL: 180, MSFT: 420, GOOGL: 175, BTC: 63000, ETH: 3500, EURUSD: 90, GBPUSD: 105 }
    return fallbacks[sym.toUpperCase()] || 100
  }

  // ── Quantity percentage triggers ───────────────────────────────────────────
  const handleQtyPercentage = (pct) => {
    const price = getSymbolPrice(orderSymbol)
    if (orderSide === 'BUY') {
      const cash = portfolio?.cash_balance || 0
      const maxQty = cash / price
      setOrderQty((maxQty * pct).toFixed(4))
    } else {
      const pos = portfolio?.positions?.find(p => p.symbol === orderSymbol.toUpperCase() && p.side === 'BUY')
      if (pos) {
        setOrderQty((pos.quantity * pct).toFixed(4))
      }
    }
  }

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading && !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
        <p className="text-slate-500 text-sm">Connecting to paper trading engine…</p>
      </div>
    )
  }

  if (error && !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto px-4">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
          <ShieldAlert className="text-rose-400" size={28} />
        </div>
        <h3 className="text-white text-base font-bold mb-2">Backend Unreachable</h3>
        <p className="text-slate-500 text-xs leading-relaxed mb-6">{error}</p>
        <button onClick={initPortfolio} className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-violet-500/20">
          <RefreshCw size={13} /> Reconnect
        </button>
      </div>
    )
  }

  // ── Computed values ────────────────────────────────────────────────────────
  const portValue   = portfolio?.total_value    || 10000
  const initialCap  = portfolio?.starting_balance || 10000
  const cashBal     = portfolio?.cash_balance   || 0
  const profitAmt   = portValue - initialCap
  const profitPct   = ((profitAmt / initialCap) * 100).toFixed(2)
  const unrealised  = portfolio?.positions?.reduce((s, p) => s + (p.unrealized_pnl || 0), 0) || 0
  const realized    = portfolio?.realized_pnl   || 0
  const openCount   = portfolio?.positions?.length || 0

  // ── Trajectory Points Calculation ──────────────────────────────────────────
  const generateChartPoints = () => {
    let currentVal = portValue
    let points = []
    
    const sortedTrades = [...trades]
      .filter(t => t.pnl != null)
      .sort((a, b) => a.executed_at - b.executed_at)
      
    if (metrics?.equity_curve && metrics.equity_curve.length > 1) {
      points = metrics.equity_curve.map((snap) => ({
        val: snap.total_value,
        time: new Date(snap.date),
        label: 'Daily Equity Value'
      }))
      const todayStr = new Date().toISOString().slice(0, 10)
      const lastSnapDate = metrics.equity_curve[metrics.equity_curve.length - 1].date
      if (lastSnapDate !== todayStr && Math.abs(currentVal - points[points.length - 1].val) > 0.01) {
        points.push({ val: currentVal, time: new Date(), label: 'Latest Balance' })
      }
    } else if (sortedTrades.length > 0) {
      let runningVal = initialCap
      points.push({ val: runningVal, time: new Date((sortedTrades[0].executed_at * 1000) - 12 * 60 * 60 * 1000), label: 'Account Opened' })
      
      sortedTrades.forEach((t) => {
        runningVal += (t.pnl || 0)
        points.push({
          val: runningVal,
          time: new Date(t.executed_at * 1000),
          label: `${t.side} ${t.symbol} fill`
        })
      })
      
      if (Math.abs(runningVal - portValue) > 0.01) {
        points.push({ val: portValue, time: new Date(), label: 'Current Snapshot' })
      }
    } else {
      const base = initialCap
      const now = Date.now()
      const oneDay = 24 * 60 * 60 * 1000
      points = [
        { val: base, time: new Date(now - 5 * oneDay), label: 'Starting Balance' },
        { val: base * 1.002, time: new Date(now - 4 * oneDay), label: 'Session Start' },
        { val: base * 0.995, time: new Date(now - 3 * oneDay), label: 'Market Dip' },
        { val: base * 1.012, time: new Date(now - 2 * oneDay), label: 'Recovery' },
        { val: base * 1.008, time: new Date(now - 1 * oneDay), label: 'Consolidation' },
        { val: currentVal, time: new Date(now), label: 'Latest Balance' }
      ]
    }
    return points
  }

  const chartPoints = generateChartPoints()
  const chartMinVal = Math.min(...chartPoints.map(p => p.val))
  const chartMaxVal = Math.max(...chartPoints.map(p => p.val))
  const chartValRange = chartMaxVal - chartMinVal || 1

  // SVG Chart Sizing Constants
  const svgWidth = 500
  const svgHeight = 160
  const chartPadding = 15

  const getSvgX = (idx) => (idx / (chartPoints.length - 1)) * (svgWidth - chartPadding * 2) + chartPadding
  const getSvgY = (val) => svgHeight - ((val - chartMinVal) / chartValRange) * (svgHeight - chartPadding * 2) - chartPadding

  let pathD = ''
  if (chartPoints.length > 0) {
    pathD = `M ${getSvgX(0)} ${getSvgY(chartPoints[0].val)}`
    for (let i = 1; i < chartPoints.length; i++) {
      const x0 = getSvgX(i - 1)
      const y0 = getSvgY(chartPoints[i - 1].val)
      const x1 = getSvgX(i)
      const y1 = getSvgY(chartPoints[i].val)
      const cpX1 = x0 + (x1 - x0) / 2
      const cpY1 = y0
      const cpX2 = x0 + (x1 - x0) / 2
      const cpY2 = y1
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${x1} ${y1}`
    }
  }

  const areaD = pathD ? `${pathD} L ${getSvgX(chartPoints.length - 1)} ${svgHeight - chartPadding} L ${getSvgX(0)} ${svgHeight - chartPadding} Z` : ''

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const currentSvgWidth = rect.width
    const relativeX = (mouseX / currentSvgWidth) * svgWidth
    
    let closestIdx = 0
    let closestDist = Infinity
    for (let i = 0; i < chartPoints.length; i++) {
      const ptX = getSvgX(i)
      const dist = Math.abs(ptX - relativeX)
      if (dist < closestDist) {
        closestDist = dist
        closestIdx = i
      }
    }
    
    const pt = chartPoints[closestIdx]
    setHoveredPoint({
      ...pt,
      x: getSvgX(closestIdx),
      y: getSvgY(pt.val),
      screenX: (getSvgX(closestIdx) / svgWidth) * currentSvgWidth,
      screenY: (getSvgY(pt.val) / svgHeight) * rect.height
    })
  }

  // Win Rate Ring Calculations
  const winRate = metrics?.win_rate || 0
  const ringRadius = 24
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringStrokeOffset = ringCircumference - (winRate / 100) * ringCircumference

  // Cash Ratio Progress Bar Calculation
  const cashRatio = ((cashBal / portValue) * 100) || 0

  return (
    <div className="flex flex-col gap-0 w-full min-h-full" style={{ background: 'transparent' }}>

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5">
            <Layers size={12} className="text-violet-400" />
            <span>Overview</span>
            <ChevronRight size={12} className="text-slate-600" />
            <span className="text-slate-300 font-semibold">Paper Trading</span>
          </div>
          <h1 className="text-white text-2xl font-black tracking-tight flex items-center gap-2">
            Paper Trading Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Professional Grade Real-time Simulation Engine.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => fetchAllData(portfolioId)}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-white/5 bg-slate-950/20 hover:bg-slate-950/50 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all duration-300"
          >
            <Download size={13} /> Export Data
          </button>
          <button
            onClick={() => { setResetBalance(initialCap.toString()); setShowResetConfirm(true) }}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-white/5 bg-slate-950/20 hover:bg-slate-950/50 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all duration-300"
          >
            <RotateCcw size={13} /> Reset Portfolio
          </button>
        </div>
      </div>

      {/* ── Live Ticker Bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 mb-6 pb-4 border-b border-white/5 overflow-x-auto hide-scrollbar">
        {SUPPORTED_SYMBOLS.map(sym => {
          const cfg = getAsset(sym)
          const isActive = sym === activeSymbol?.toUpperCase()
          const isTargetOrderSym = sym === orderSymbol?.toUpperCase()
          
          return (
            <button
              key={sym}
              type="button"
              onClick={() => setOrderSymbol(sym)}
              className={`flex items-center gap-2 shrink-0 pb-1.5 transition-all outline-none border-b-2 ${
                isTargetOrderSym 
                  ? 'border-violet-500 scale-102 font-bold' 
                  : 'border-transparent opacity-65 hover:opacity-100 hover:scale-101'
              }`}
            >
              <AssetIcon symbol={sym} size={18} />
              <span className={`text-xs font-extrabold ${isTargetOrderSym ? 'text-white' : 'text-slate-400'}`}>{sym}</span>
              {isActive && lastCandlePrice ? (
                <span className="text-xs text-emerald-400 font-mono font-bold animate-pulse">
                  ₹{lastCandlePrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-xs text-slate-600 font-mono">—</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Main Layout Grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left Content Area (2/3 width) ──────────────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Core Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Total Portfolio Value: Premium Hero Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#4f46e5] via-[#7c3aed] to-[#ec4899] text-white p-6 rounded-3xl border border-white/10 shadow-[0_8px_32px_rgba(124,58,237,0.25)] group hover:scale-[1.01] transition-all duration-300">
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-blue-400 rounded-full blur-3xl opacity-35 animate-pulse" />
              <div className="absolute -bottom-16 -right-16 w-32 h-32 bg-pink-400 rounded-full blur-3xl opacity-35 animate-pulse" style={{ animationDelay: '2s' }} />
              
              <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-white/80 flex items-center gap-1.5">
                      <Wallet size={12} className="text-white/80" />
                      Total Portfolio Value
                    </span>
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <p className="text-3xl font-black font-mono tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]">
                    ₹{fmt(portValue)}
                  </p>
                </div>
                
                <div className="flex items-center gap-1.5 text-[11px] text-white/95 font-bold bg-black/15 backdrop-blur-md px-3 py-1 rounded-full w-max">
                  {profitAmt >= 0 ? <ArrowUpRight size={13} className="text-emerald-400" /> : <ArrowDownRight size={13} className="text-rose-400" />}
                  <span className={profitAmt >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {profitAmt >= 0 ? '+' : ''}₹{fmt(profitAmt)} ({profitPct}%)
                  </span>
                  <span className="text-white/60 font-medium">session</span>
                </div>
              </div>
            </div>

            {/* Unrealized P/L */}
            <div className="relative overflow-hidden bg-slate-950/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-xl hover:border-violet-500/20 transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
              <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Activity size={12} className="text-violet-400" />
                      Unrealized P/L
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${unrealised >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      Open Risk
                    </span>
                  </div>
                  <p className={`text-3xl font-black font-mono tracking-tight leading-none ${unrealised >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{ textShadow: unrealised >= 0 ? '0 0 16px rgba(16,185,129,0.15)' : '0 0 16px rgba(244,63,94,0.15)' }}>
                    {unrealised >= 0 ? '+' : ''}₹{fmt(unrealised)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                  P/L for active holding positions.
                </p>
              </div>
            </div>

            {/* Realized Gains */}
            <div className="relative overflow-hidden bg-slate-950/40 backdrop-blur-xl border border-white/5 p-6 rounded-3xl shadow-xl hover:border-violet-500/20 transition-all duration-300 group">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
              <div className="relative z-10 flex flex-col h-full justify-between gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <Award size={12} className="text-violet-400" />
                      Realized Gains
                    </span>
                    <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                      Settled
                    </span>
                  </div>
                  <p className={`text-3xl font-black font-mono tracking-tight leading-none ${realized >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} style={{ textShadow: realized >= 0 ? '0 0 16px rgba(16,185,129,0.15)' : '0 0 16px rgba(244,63,94,0.15)' }}>
                    {realized >= 0 ? '+' : ''}₹{fmt(realized)}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 font-semibold leading-normal">
                  {openCount} open position{openCount !== 1 ? 's' : ''} currently active.
                </p>
              </div>
            </div>

          </div>

          {/* Portfolio Trajectory Chart Card */}
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart2 size={13} className="text-violet-400" />
                  Portfolio Trajectory
                </p>
                <p className="text-slate-500 text-[10px] mt-0.5">Historical account valuation tracker</p>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/50 p-1 rounded-xl border border-white/5">
                <span className="text-[9px] font-bold text-violet-400 px-2 py-1 rounded bg-violet-500/15">Interactive</span>
              </div>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="relative w-full h-[180px] select-none">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-full cursor-crosshair overflow-visible"
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                  </linearGradient>
                  <filter id="glow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#8b5cf6" floodOpacity="0.45" />
                  </filter>
                </defs>

                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
                  const yVal = chartPadding + p * (svgHeight - chartPadding * 2)
                  return (
                    <line
                      key={idx}
                      x1={chartPadding}
                      y1={yVal}
                      x2={svgWidth - chartPadding}
                      y2={yVal}
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth="1"
                    />
                  )
                })}

                {/* Area Fill */}
                {areaD && (
                  <path d={areaD} fill="url(#chart-grad)" className="transition-all duration-300" />
                )}

                {/* Path Line */}
                {pathD && (
                  <path
                    d={pathD}
                    fill="none"
                    stroke="#c084fc"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    className="transition-all duration-300"
                  />
                )}

                {/* Data Points */}
                {chartPoints.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={getSvgX(idx)}
                    cy={getSvgY(pt.val)}
                    r="4.5"
                    className="fill-[#0b0b14] stroke-[#c084fc] stroke-[2.5]"
                  />
                ))}

                {/* Hover Guideline & Indicator */}
                {hoveredPoint && (
                  <>
                    <line
                      x1={hoveredPoint.x}
                      y1={chartPadding}
                      x2={hoveredPoint.x}
                      y2={svgHeight - chartPadding}
                      stroke="rgba(139,92,246,0.3)"
                      strokeWidth="1.5"
                      strokeDasharray="4,4"
                    />
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="7.5"
                      className="fill-violet-500/30 stroke-violet-400 stroke-[2] animate-ping"
                    />
                    <circle
                      cx={hoveredPoint.x}
                      cy={hoveredPoint.y}
                      r="5.5"
                      className="fill-violet-400 stroke-[#0b0b14] stroke-[2]"
                    />
                  </>
                )}
              </svg>

              {/* Floating Tooltip inside Chart Container */}
              {hoveredPoint && (
                <div
                  className="absolute z-10 bg-slate-950/95 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-100 flex flex-col gap-0.5 text-xs text-left"
                  style={{
                    left: `${Math.min(80, Math.max(3, (hoveredPoint.screenX / svgWidth) * 100))}%`,
                    top: `${Math.min(65, Math.max(10, (hoveredPoint.screenY / svgHeight) * 100 - 45))}%`,
                    transform: 'translateX(-50%)'
                  }}
                >
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{hoveredPoint.label}</p>
                  <p className="text-white font-mono font-black text-sm">₹{fmt(hoveredPoint.val)}</p>
                  <p className="text-[9px] text-violet-400 font-mono font-medium">{hoveredPoint.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              )}
            </div>

            {/* Labels under chart */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-wider">
              <span>{chartPoints[0]?.time?.toLocaleDateString()}</span>
              <span>Account Performance Trajectory</span>
              <span>{chartPoints[chartPoints.length - 1]?.time?.toLocaleDateString()}</span>
            </div>
          </div>

          {/* AI Technical Intelligence (Advisory Panel) */}
          {(() => {
            const aiData = aiAnalysis
            const isForex = ['EURUSD', 'GBPUSD'].includes(orderSymbol.toUpperCase())
            const dec = isForex ? 4 : 2
            
            if (aiLoading && !aiData) {
              return (
                <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
                  <div className="absolute top-0 left-0 w-24 h-1 bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse" />
                  <div className="flex flex-col gap-4 py-4 animate-pulse">
                    <div className="h-6 w-48 bg-white/10 rounded animate-pulse" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-3">
                        <div className="h-4 w-32 bg-white/5 rounded" />
                        <div className="h-2 w-full bg-white/5 rounded" />
                        <div className="h-12 w-full bg-white/5 rounded" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="h-16 bg-white/5 rounded" />
                        <div className="h-16 bg-white/5 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              )
            }

            if (!aiData) return null

            return (
              <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
                <div className="absolute top-0 left-0 w-24 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
                
                <div className="flex items-center justify-between mb-5 border-b border-white/5 pb-3">
                  <div>
                    <p className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Zap size={13} className="text-violet-400" />
                      AI Technical Intelligence ({orderSymbol})
                    </p>
                    <p className="text-slate-500 text-[10px] mt-0.5">Real-time predictive signals & target bounds</p>
                  </div>
                  <Pill color={aiData.verdict === 'Bullish' ? 'green' : aiData.verdict === 'Bearish' ? 'red' : 'yellow'}>
                    {aiData.verdict}
                  </Pill>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left sub-panel: AI Verdict & narrative analysis */}
                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex justify-between items-center mb-1.5 text-[10px]">
                        <span className="text-slate-500 font-bold uppercase tracking-wider">AI Confidence</span>
                        <span className="text-white font-extrabold">{aiData.confidence}%</span>
                      </div>
                      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            aiData.verdict === 'Bullish' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.45)]' :
                            aiData.verdict === 'Bearish' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.45)]' :
                            'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.45)]'
                          }`}
                          style={{ width: `${aiData.confidence}%` }}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest block mb-1">AI Analysis</span>
                      <p className="text-slate-300 text-xs leading-relaxed font-medium">
                        {aiData.analysis}
                      </p>
                    </div>
                  </div>
                  
                  {/* Right sub-panel: Trade Levels & Support/Resistance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                    {/* Trade Levels */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Trade Levels</span>
                      <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">Signal</span>
                          <span className={`font-bold ${aiData.signal === 'BUY' ? 'text-emerald-400' : aiData.signal === 'SELL' ? 'text-rose-400' : 'text-amber-400'}`}>{aiData.signal}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">Entry</span>
                          <span className="text-white font-mono font-bold">₹{fmt(aiData.entry, dec)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500 font-medium">Target</span>
                          <span className="text-emerald-400 font-mono font-bold">₹{fmt(aiData.target, dec)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs border-t border-white/4 pt-1.5 mt-0.5">
                          <span className="text-slate-500 font-medium">Stop Loss</span>
                          <span className="text-rose-400 font-mono font-bold">₹{fmt(aiData.stopLoss, dec)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Support & Resistance */}
                    <div className="flex flex-col gap-2.5">
                      <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Support / Resistance</span>
                      <div className="flex flex-col gap-3">
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-2.5 flex justify-between items-center text-xs">
                          <span className="text-rose-400 font-bold flex items-center gap-1">
                            <Circle size={6} className="fill-rose-400" />
                            Resistance
                          </span>
                          <span className="text-rose-400 font-mono font-bold">₹{fmt(aiData.resistance, dec)}</span>
                        </div>
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2.5 flex justify-between items-center text-xs">
                          <span className="text-emerald-400 font-bold flex items-center gap-1">
                            <Circle size={6} className="fill-emerald-400" />
                            Support
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">₹{fmt(aiData.support, dec)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* AI Coach Widget */}
          {aiAnalysis && (
            <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 left-0 w-24 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                  <Bot size={16} className="text-teal-400" />
                </div>
                <h3 className="text-teal-400 text-xs font-black uppercase tracking-wider">AI Coach</h3>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed font-mono">
                "{aiAnalysis.coach || `Based on current technicals, ${orderSymbol} shows a neutral setup. Maintain discipline and follow risk management bounds.`}"
              </p>
            </div>
          )}

          {/* Active Positions watchlist block */}
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <div className="flex items-center gap-3">
                <p className="text-white text-xs font-black uppercase tracking-wider">Active Positions</p>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_8px_rgba(139,92,246,0.15)]">
                  {openCount} Open
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5 bg-slate-900/10">
                    {['Asset', 'Side / Type', 'Entry Price', 'Market Price', 'Size', 'Unrealized P/L', 'Signal', 'Action'].map(h => (
                      <th key={h} className="px-6 py-3.5 text-left text-[9px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!portfolio?.positions || portfolio.positions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-white/3 border border-white/5 flex items-center justify-center">
                            <Briefcase size={18} className="text-slate-600" />
                          </div>
                          <p className="text-slate-500 text-xs font-medium">No open positions. Ready to execute your first trade.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    portfolio.positions.map((pos, i) => {
                      const cfg    = getAsset(pos.symbol)
                      const pnl    = pos.unrealized_pnl || 0
                      const isPos  = pnl >= 0
                      return (
                        <motion.tr
                          key={pos.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="border-b border-white/4 hover:bg-white/2 transition-all duration-200 group"
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <AssetIcon symbol={pos.symbol} size={28} />
                              <div>
                                <p className="text-white text-xs font-black">{pos.symbol}</p>
                                <p className="text-slate-600 text-[9px] font-medium">{cfg.label}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Pill color={pos.side === 'BUY' ? 'green' : 'red'}>{pos.side === 'BUY' ? 'LONG' : 'SHORT'}</Pill>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-slate-400 font-mono text-xs font-bold">₹{fmt(pos.entry_price)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-mono text-xs font-black">₹{fmt(pos.current_price)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-white font-mono text-xs font-bold">{pos.quantity?.toFixed(4)}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className={`flex items-center gap-0.5 font-bold text-xs font-mono ${isPos ? 'text-emerald-400' : 'text-rose-400'}`} style={{ textShadow: isPos ? '0 0 12px rgba(16,185,129,0.1)' : '0 0 12px rgba(244,63,94,0.1)' }}>
                              {isPos ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                              {isPos ? '+' : '-'}₹{fmt(Math.abs(pnl))}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <Pill color={isPos ? 'green' : 'red'}>{isPos ? 'Accumulating' : 'Declining'}</Pill>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="lg:opacity-0 group-hover:opacity-100 px-3.5 py-1.5 border border-rose-500/25 bg-rose-500/5 hover:bg-rose-500 hover:border-rose-500 text-rose-400 hover:text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all duration-200"
                            >
                              Close
                            </button>
                          </td>
                        </motion.tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* ── Right Content Area (1/3 width) ─────────────────────────────────── */}
        <div className="flex flex-col gap-6">

          {/* Order Execution Ticket Card */}
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <p className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Zap size={13} className="text-violet-400" />
                Execute Order
              </p>
              <span className="text-[9px] text-slate-500 font-mono font-bold bg-slate-900/60 border border-white/5 px-2 py-0.5 rounded">SIMULATOR</span>
            </div>

            <form onSubmit={handlePlaceOrder} className="flex flex-col gap-4">
              {/* Buy / Sell Tabs */}
              <div className="grid grid-cols-2 bg-slate-950/60 p-1.5 rounded-xl border border-white/5 relative">
                {['BUY', 'SELL'].map(side => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => { setOrderSide(side); setOrderError(null); setOrderSuccess(null) }}
                    className={`py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-300 relative z-10 ${
                      orderSide === side
                        ? side === 'BUY'
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                          : 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {side === 'BUY' ? 'Buy / Long' : 'Sell / Close'}
                  </button>
                ))}
              </div>

              {/* Asset Custom Dropdown */}
              <div className="flex flex-col gap-1.5 relative">
                <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Asset Selector</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAssetDropdownOpen(!assetDropdownOpen)}
                    className="w-full bg-slate-950/60 hover:bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-xs text-white flex items-center justify-between outline-none transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <AssetIcon symbol={orderSymbol} size={20} />
                      <span className="font-extrabold">{orderSymbol}</span>
                      <span className="text-[10px] text-slate-500">— {getAsset(orderSymbol).label}</span>
                    </div>
                    <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${assetDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {assetDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-[#0b0b14] border border-white/10 rounded-xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto"
                      >
                        {SUPPORTED_SYMBOLS.map(s => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => { setOrderSymbol(s); setAssetDropdownOpen(false); setOrderError(null); setOrderSuccess(null) }}
                            className={`w-full px-4 py-3 text-left text-xs flex items-center gap-2.5 transition-colors ${
                              orderSymbol.toUpperCase() === s.toUpperCase() 
                                ? 'bg-violet-600/20 text-white font-bold' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <AssetIcon symbol={s} size={18} />
                            <span className="font-extrabold">{s}</span>
                            <span className="text-[10px] text-slate-500">{getAsset(s).label}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Quantity Inputs */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Quantity</label>
                  {orderSide === 'SELL' && (() => {
                    const pos = portfolio?.positions?.find(p => p.symbol === orderSymbol && p.side === 'BUY')
                    return pos ? <span className="text-[9px] text-slate-500 font-mono font-medium">Own: {pos.quantity.toFixed(4)}</span> : null
                  })()}
                </div>
                <input
                  type="number" step="any" value={orderQty}
                  onChange={e => { setOrderQty(e.target.value); setOrderError(null); setOrderSuccess(null) }}
                  placeholder="0.00"
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 outline-none focus:border-violet-500/60 font-mono transition-all"
                />

                {/* Percentage Shortcuts */}
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {[0.25, 0.50, 0.75, 1.0].map(pct => {
                    const label = pct === 1.0 ? 'MAX' : `${pct * 100}%`
                    return (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleQtyPercentage(pct)}
                        className="py-1 bg-white/3 hover:bg-white/8 border border-white/5 rounded-lg text-[9px] font-bold text-slate-400 hover:text-white transition-all duration-200"
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Estimate info */}
              {(() => {
                const targetPrice = getSymbolPrice(orderSymbol)
                const isLive = orderSymbol.toUpperCase() === (activeSymbol || '').toUpperCase() && lastCandlePrice
                return (
                  <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-4 flex flex-col gap-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium flex items-center gap-1.5">
                        {isLive && <span className="flex h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                        Rate Price
                      </span>
                      <span className="text-white font-mono font-bold">₹{fmt(targetPrice)}</span>
                    </div>
                    <div className="flex justify-between border-t border-white/4 pt-2 mt-0.5">
                      <span className="text-slate-500 font-medium">Est. Value</span>
                      <span className="text-violet-300 font-mono font-black">₹{fmt((Number(orderQty) || 0) * targetPrice)}</span>
                    </div>
                  </div>
                )
              })()}

              {/* Error/Success Feedbacks */}
              {orderError && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-500/8 border border-rose-500/15 rounded-xl text-rose-400 text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{orderError}</span>
                </div>
              )}
              {orderSuccess && (
                <div className="flex items-start gap-2.5 p-3.5 bg-emerald-500/8 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs">
                  <CheckCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="leading-relaxed font-semibold">{orderSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={orderLoading}
                className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-950 transition-all duration-300 disabled:opacity-50 ${
                  orderSide === 'BUY'
                    ? 'bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-400/25'
                    : 'bg-rose-400 hover:bg-rose-300 shadow-lg shadow-rose-400/25'
                }`}
              >
                {orderLoading ? 'Transacting…' : `Submit ${orderSide} Order`}
              </button>
            </form>
          </div>

          {/* Market Mood Today Widget */}
          {marketMood && (
            <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-1 border-b border-white/5 pb-3">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Zap size={16} className="text-cyan-400" />
                </div>
                <h3 className="text-cyan-400 text-xs font-black uppercase tracking-wider">Market Mood Today</h3>
              </div>
              
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* Stocks */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Stocks</span>
                  <span className="text-emerald-400 font-mono font-black text-lg">{marketMood.stocks.percent}%</span>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${marketMood.stocks.percent}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">{marketMood.stocks.sentiment}</span>
                </div>

                {/* Crypto */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Crypto</span>
                  <span className="text-emerald-400 font-mono font-black text-lg">{marketMood.crypto.percent}%</span>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${marketMood.crypto.percent}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">{marketMood.crypto.sentiment}</span>
                </div>

                {/* Forex */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Forex</span>
                  <span className="text-amber-400 font-mono font-black text-lg">{marketMood.forex.percent}%</span>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${marketMood.forex.percent}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">{marketMood.forex.sentiment}</span>
                </div>

                {/* Overall */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Overall</span>
                  <span className="text-emerald-400 font-mono font-black text-lg">{marketMood.overall.percent}%</span>
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden border border-white/5">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${marketMood.overall.percent}%` }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-semibold">{marketMood.overall.sentiment}</span>
                </div>
              </div>
            </div>
          )}

          {/* Account analytics summary */}
          <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 flex flex-col gap-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-white text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                <Wallet size={13} className="text-violet-400" />
                Performance Analytics
              </p>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Win Rate Donut Ring */}
              <div className="flex items-center gap-4 bg-slate-950/20 p-4 border border-white/5 rounded-2xl">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg className="w-14 h-14 transform -rotate-90">
                    <circle
                      cx="28"
                      cy="28"
                      r={ringRadius}
                      className="stroke-white/5"
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="28"
                      cy="28"
                      r={ringRadius}
                      className="stroke-emerald-500 transition-all duration-1000 ease-out"
                      strokeWidth="4"
                      fill="transparent"
                      strokeDasharray={ringCircumference}
                      strokeDashoffset={ringStrokeOffset}
                      strokeLinecap="round"
                      style={{
                        filter: 'drop-shadow(0 0 4px rgba(16, 185, 129, 0.4))'
                      }}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="text-[11px] font-black text-white">{winRate}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-white text-xs font-bold">Win Rate Success</p>
                  <p className="text-slate-500 text-[10px] mt-0.5">{metrics?.winning_trades || 0} Wins / {metrics?.losing_trades || 0} Losses</p>
                </div>
              </div>

              {/* Cash Ratio Progress bar */}
              <div className="flex flex-col gap-1.5 bg-slate-950/20 p-4 border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Cash Ratio</span>
                  <span className="text-blue-400 font-bold font-mono">{cashRatio.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.max(0, cashRatio))}%`,
                      boxShadow: '0 0 8px rgba(59, 130, 246, 0.5)'
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-0.5">
                  <span>Cash: ₹{fmt(cashBal, 0)}</span>
                  <span>Assets: ₹{fmt(portValue - cashBal, 0)}</span>
                </div>
              </div>

              {/* Analytics metrics grid (2x2) */}
              <div className="grid grid-cols-2 gap-3">
                <PerfCard
                  label="Profit Factor"
                  value={metrics?.profit_factor != null ? metrics.profit_factor.toFixed(2) : '0.00'}
                  isPos={metrics?.profit_factor > 1.2}
                  sub="Gross profit / loss"
                  Icon={Activity}
                />
                <PerfCard
                  label="Sharpe Ratio"
                  value={metrics?.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : '0.00'}
                  isPos={metrics?.sharpe_ratio > 0.5}
                  sub="Risk-adj. returns"
                  Icon={Award}
                />
                <PerfCard
                  label="Max Drawdown"
                  value={`-${metrics?.max_drawdown_percent ?? 0}%`}
                  isNeg={metrics?.max_drawdown_percent > 0}
                  sub="Peak-to-trough"
                  Icon={TrendingDown}
                />
                <PerfCard
                  label="Current Streak"
                  value={`${metrics?.current_streak?.count || 0} ${metrics?.current_streak?.type || '—'}`}
                  isPos={metrics?.current_streak?.type === 'WIN'}
                  isNeg={metrics?.current_streak?.type === 'LOSS'}
                  sub="Consecutive trades"
                  Icon={Zap}
                />
              </div>

            </div>
          </div>

          {/* Timeline styled Activity Feed */}
          {trades.length > 0 && (
            <div className="bg-slate-950/40 backdrop-blur-xl border border-white/5 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-5">
                <p className="text-white text-xs font-black uppercase tracking-wider">Recent Activity</p>
                <button className="p-1 rounded-lg hover:bg-white/5 text-slate-600 hover:text-slate-400 transition-colors">
                  <MoreHorizontal size={14} />
                </button>
              </div>

              <div className="relative border-l border-white/5 pl-4 ml-2 flex flex-col gap-5">
                {trades.slice(0, 5).map((trade, i) => {
                  const isBuy = trade.side === 'BUY'
                  const hasPnL = trade.pnl != null
                  const pnlPos = (trade.pnl || 0) >= 0
                  
                  return (
                    <motion.div
                      key={trade.id || i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative flex items-center justify-between text-xs"
                    >
                      {/* Timeline dot */}
                      <span className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full border-[2.5px] border-slate-950 ${
                        isBuy ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]'
                      }`} />

                      <div className="flex items-center gap-2">
                        <AssetIcon symbol={trade.symbol} size={22} />
                        <div>
                          <p className="text-white font-bold">{isBuy ? 'Buy' : 'Sell'} {trade.symbol}</p>
                          <p className="text-slate-500 text-[9px]">{timeAgo(trade.executed_at)}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-white font-mono font-black">₹{fmt(trade.fill_price || trade.price)}</p>
                        <p className="text-slate-500 text-[9px] font-mono">{(trade.quantity || 0).toFixed(4)}</p>
                      </div>

                      <div className="text-right shrink-0 w-16">
                        {hasPnL ? (
                          <span className={`font-mono font-bold ${pnlPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {pnlPos ? '+' : ''}₹{fmt(trade.pnl)}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[10px]">—</span>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ── Reset Confirm Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1,    y: 0 }}
              exit={{ opacity: 0, scale: 0.95,    y: 8 }}
              className="bg-[#0b0b14] border border-white/10 w-full max-w-sm rounded-3xl p-6 shadow-2xl relative overflow-hidden"
            >
              {/* Glow backdrop */}
              <div className="absolute -top-12 -left-12 w-28 h-28 bg-rose-500/10 rounded-full blur-3xl" />

              <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                    <RotateCcw size={15} className="text-rose-400" />
                  </div>
                  <h3 className="text-white text-sm font-bold">Reset Portfolio?</h3>
                </div>
                <button onClick={() => setShowResetConfirm(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <p className="text-slate-400 text-xs leading-relaxed mb-5 relative z-10">
                This will clear all open positions and trade history, resetting your balance to the amount below.
              </p>

              <div className="flex flex-col gap-1.5 mb-6 relative z-10">
                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Starting Balance (₹)</label>
                <input
                  type="number"
                  value={resetBalance}
                  onChange={e => setResetBalance(e.target.value)}
                  className="bg-slate-950/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-rose-500/40 font-mono transition-colors"
                />
              </div>

              <div className="flex gap-3 relative z-10">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetLoading}
                  className="flex-1 py-2.5 border border-white/8 bg-white/3 hover:bg-white/8 text-slate-400 hover:text-white text-xs rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPortfolio}
                  disabled={resetLoading}
                  className="flex-1 py-2.5 bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs rounded-xl font-bold transition-all shadow-lg shadow-rose-500/25"
                >
                  {resetLoading ? 'Resetting…' : 'Yes, Reset'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
