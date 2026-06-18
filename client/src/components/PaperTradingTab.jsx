import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  TrendingUp, TrendingDown, RefreshCw, Trash2, ArrowUpRight, ArrowDownRight, 
  HelpCircle, DollarSign, Wallet, Award, Activity, RotateCcw, ShieldAlert,
  ChevronRight, BarChart2, Briefcase
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const API_BASE = '/api/v1/paper'
const SUPPORTED_SYMBOLS = ['AAPL', 'MSFT', 'GOOGL', 'BTC', 'ETH', 'EURUSD', 'GBPUSD']

export default function PaperTradingTab({ activeSymbol, lastCandlePrice, onRefreshPortfolio }) {
  const { user } = useAuth()
  const portfolioId = user?.uid
  const [portfolio, setPortfolio] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [trades, setTrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Order Ticket State
  const [orderSymbol, setOrderSymbol] = useState(activeSymbol || 'BTC')
  const [orderSide, setOrderSide] = useState('BUY')
  const [orderQty, setOrderQty] = useState('0.1')
  const [orderLoading, setOrderLoading] = useState(false)
  const [orderError, setOrderError] = useState(null)
  const [orderSuccess, setOrderSuccess] = useState(null)

  // Reset State
  const [resetBalance, setResetBalance] = useState('10000')
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  // Auto-align order ticket with active symbol changes
  useEffect(() => {
    if (activeSymbol && SUPPORTED_SYMBOLS.includes(activeSymbol.toUpperCase())) {
      setOrderSymbol(activeSymbol.toUpperCase())
    }
  }, [activeSymbol])

  // Fetch portfolio data, metrics, and trades
  const fetchAllData = useCallback(async (id) => {
    if (!id) return
    try {
      setError(null)
      // Fetch Portfolio summary
      const portRes = await fetch(`${API_BASE}/portfolio/${id}`)
      const portData = await portRes.json()
      
      if (!portRes.ok || !portData.success) {
        throw new Error(portData.error || 'Failed to fetch portfolio')
      }
      setPortfolio(portData.portfolio)

      // Fetch Metrics
      const metRes = await fetch(`${API_BASE}/metrics/${id}`)
      const metData = await metRes.json()
      if (metData.success) {
        setMetrics(metData.metrics)
      }

      // Fetch Trades
      const tradeRes = await fetch(`${API_BASE}/trades/${id}?limit=20`)
      const tradeData = await tradeRes.json()
      if (tradeData.success) {
        setTrades(tradeData.trades)
      }

      // Sync data back to parent if callback exists
      if (onRefreshPortfolio && portData.portfolio) {
        onRefreshPortfolio({
          balance: portData.portfolio.cash_balance,
          totalValue: portData.portfolio.total_value,
          positions: portData.portfolio.positions || []
        })
      }
    } catch (err) {
      console.error('Error fetching paper trading data:', err)
      setError('Connection to backend lost. Please try refreshing.')
    }
  }, [onRefreshPortfolio])

  const initPortfolio = useCallback(async () => {
    if (!portfolioId) return
    setLoading(true)
    try {
      setError(null)
      // Check if portfolio exists
      const res = await fetch(`${API_BASE}/portfolio/${portfolioId}`)
      if (res.status === 404) {
        // Auto-create for this user ID
        await fetch(`${API_BASE}/portfolio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: portfolioId, 
            name: `${user?.name || 'TradeWise'}'s Paper Account`, 
            startingBalance: 10000 
          })
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

  // Initial load
  useEffect(() => {
    if (!portfolioId) {
      setLoading(false)
      return
    }

    initPortfolio()

    // Polling updates
    const interval = setInterval(() => {
      fetchAllData(portfolioId)
    }, 4000)
    return () => clearInterval(interval)
  }, [portfolioId, fetchAllData, initPortfolio])

  // Place a trade
  const handlePlaceOrder = async (e) => {
    if (e) e.preventDefault()
    setOrderLoading(true)
    setOrderError(null)
    setOrderSuccess(null)

    try {
      const payload = {
        portfolioId,
        symbol: orderSymbol.toUpperCase(),
        quantity: Number(orderQty)
      }

      const endpoint = orderSide === 'BUY' ? 'positions' : null
      
      if (orderSide === 'BUY') {
        const res = await fetch(`${API_BASE}/positions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        const data = await res.json()
        if (data.success) {
          setOrderSuccess(`BUY filled: ${data.position.quantity} ${data.position.symbol} @ $${data.fill.fillPrice}`)
          fetchAllData(portfolioId)
        } else {
          setOrderError(data.error || 'Failed to place buy order')
        }
      } else {
        // Find corresponding open position to close
        const position = portfolio?.positions?.find(p => p.symbol === orderSymbol.toUpperCase() && p.side === 'BUY')
        if (!position) {
          throw new Error(`No open BUY position found for ${orderSymbol}. You must buy first.`)
        }
        
        // Handle partial sells or full sells
        // For simplicity, closing the position if they execute SELL on active positions
        const res = await fetch(`${API_BASE}/positions/${position.id}?portfolioId=${portfolioId}`, {
          method: 'DELETE'
        })
        const data = await res.json()
        if (data.success) {
          setOrderSuccess(`SELL filled: Closed position for ${orderSymbol} @ $${data.fill.fillPrice}`)
          fetchAllData(portfolioId)
        } else {
          setOrderError(data.error || 'Failed to place sell order')
        }
      }
    } catch (err) {
      setOrderError(err.message || 'An error occurred during transaction.')
    } finally {
      setOrderLoading(false)
    }
  }

  // Close specific position
  const handleClosePosition = async (positionId) => {
    try {
      const res = await fetch(`${API_BASE}/positions/${positionId}?portfolioId=${portfolioId}`, {
        method: 'DELETE'
      })
      const data = await res.json()
      if (data.success) {
        fetchAllData(portfolioId)
      } else {
        alert(data.error || 'Failed to close position')
      }
    } catch (err) {
      console.error('Failed to close position:', err)
    }
  }

  // Reset Portfolio
  const handleResetPortfolio = async () => {
    setResetLoading(true)
    try {
      const res = await fetch(`${API_BASE}/reset/${portfolioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newBalance: Number(resetBalance) })
      })
      const data = await res.json()
      if (data.success) {
        setShowResetConfirm(false)
        fetchAllData(portfolioId)
      } else {
        alert(data.error || 'Failed to reset portfolio')
      }
    } catch (err) {
      console.error('Reset failed:', err)
    } finally {
      setResetLoading(false)
    }
  }

  if (loading && !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <RefreshCw className="animate-spin text-brand-400" size={32} />
        <p className="text-slate-400 text-sm">Loading paper trading details...</p>
      </div>
    )
  }

  if (error && !portfolio) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto px-4">
        <ShieldAlert className="text-red-400 mb-4 animate-pulse" size={48} />
        <h3 className="text-white text-lg font-bold mb-2">Backend Connection Required</h3>
        <p className="text-slate-400 text-xs leading-relaxed mb-6">
          {error}
        </p>
        <button 
          onClick={initPortfolio}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-brand-500/20 flex items-center gap-2"
        >
          <RefreshCw size={14} /> Reconnect
        </button>
      </div>
    )
  }

  const portValue = portfolio?.total_value || 10000
  const initialCap = portfolio?.starting_balance || 10000
  const profitAmt = portValue - initialCap
  const profitPct = ((profitAmt / initialCap) * 100).toFixed(2)

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-10">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-white text-xl font-bold tracking-tight mb-1 flex items-center gap-2">
            <Briefcase className="text-brand-400" size={20} />
            Paper Trading Dashboard
          </h2>
          <p className="text-slate-400 text-xs">Simulate positions, monitor risk metrics, and record performance stats without risking real money.</p>
        </div>

        <button 
          onClick={() => {
            setResetBalance(initialCap.toString())
            setShowResetConfirm(true)
          }}
          className="px-3 py-1.5 border border-slate-800 hover:border-slate-700 bg-surface-800/50 hover:bg-surface-800 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto"
        >
          <RotateCcw size={13} /> Reset Portfolio
        </button>
      </div>

      {/* CORE FINANCIALS SUMMARY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Asset Value */}
        <div className="bg-surface-800/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-brand-500/5 rounded-full blur-xl group-hover:bg-brand-500/10 transition-all pointer-events-none" />
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Net Asset Value</span>
            <Wallet size={16} className="text-brand-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-white font-mono text-2xl font-bold">
              ₹{portValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <div className="flex items-center gap-1 mt-1">
              {parseFloat(profitPct) >= 0 ? (
                <span className="text-emerald-400 text-xs font-bold flex items-center">
                  <ArrowUpRight size={14} /> +{profitPct}%
                </span>
              ) : (
                <span className="text-red-400 text-xs font-bold flex items-center">
                  <ArrowDownRight size={14} /> {profitPct}%
                </span>
              )}
              <span className="text-slate-500 text-[10px]">cumulative profit</span>
            </div>
          </div>
        </div>

        {/* Cash Balance */}
        <div className="bg-surface-800/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Available Cash</span>
            <DollarSign size={16} className="text-slate-400" />
          </div>
          <div className="mt-4">
            <h3 className="text-white font-mono text-2xl font-bold">
              ₹{portfolio?.cash_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-slate-500 text-[10px] block mt-1">
              {((portfolio?.cash_balance / portValue) * 100).toFixed(0)}% cash ratio
            </span>
          </div>
        </div>

        {/* Open PnL */}
        <div className="bg-surface-800/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Unrealized P&L</span>
            <Activity size={16} className="text-slate-400" />
          </div>
          <div className="mt-4">
            {portfolio?.positions?.length > 0 ? (
              (() => {
                const totalUnrealized = portfolio.positions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0)
                const pnlColor = totalUnrealized >= 0 ? 'text-emerald-400' : 'text-red-400'
                return (
                  <>
                    <h3 className={`font-mono text-2xl font-bold ${pnlColor}`}>
                      {totalUnrealized >= 0 ? '+' : ''}₹{totalUnrealized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <span className="text-slate-500 text-[10px] block mt-1">
                      across {portfolio.positions.length} open position{portfolio.positions.length > 1 ? 's' : ''}
                    </span>
                  </>
                )
              })()
            ) : (
              <>
                <h3 className="text-slate-400 font-mono text-2xl font-bold">₹0.00</h3>
                <span className="text-slate-500 text-[10px] block mt-1">No open positions</span>
              </>
            )}
          </div>
        </div>

        {/* Realized PnL */}
        <div className="bg-surface-800/40 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Realized P&L</span>
            <Award size={16} className="text-slate-400" />
          </div>
          <div className="mt-4">
            <h3 className={`font-mono text-2xl font-bold ${portfolio?.realized_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {portfolio?.realized_pnl >= 0 ? '+' : ''}₹{portfolio?.realized_pnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <span className="text-slate-500 text-[10px] block mt-1">From completed trades</span>
          </div>
        </div>

      </div>

      {/* DETAILED STATS GRID & TRADING TICKET */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Performance Metrics */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Active Positions */}
          <div className="bg-surface-800/30 border border-slate-800/60 rounded-2xl p-6">
            <h3 className="text-white text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-400 animate-pulse" />
              Active Positions
            </h3>

            {!portfolio?.positions || portfolio.positions.length === 0 ? (
              <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl">
                <p className="text-slate-500 text-xs">No active positions open.</p>
                <p className="text-slate-600 text-[10px] mt-1">Place a trade using the ticket to begin simulating.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800/50 pb-2">
                      <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Symbol</th>
                      <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Quantity</th>
                      <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Entry Price</th>
                      <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Market Price</th>
                      <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Unrealized P&L</th>
                      <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {portfolio.positions.map((pos) => {
                      const isProfit = (pos.unrealized_pnl || 0) >= 0
                      const pnlColor = isProfit ? 'text-emerald-400' : 'text-red-400'
                      
                      return (
                        <tr key={pos.id} className="hover:bg-surface-800/20 group transition-colors">
                          <td className="py-3 text-xs font-bold text-white uppercase">{pos.symbol}</td>
                          <td className="py-3 text-xs font-mono text-slate-300">{pos.quantity.toFixed(4)}</td>
                          <td className="py-3 text-xs font-mono text-slate-300">₹{pos.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="py-3 text-xs font-mono text-slate-300">₹{pos.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className={`py-3 text-xs font-mono font-bold ${pnlColor}`}>
                            {isProfit ? '+' : ''}₹{pos.unrealized_pnl?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <span className="text-[10px] font-normal opacity-80 ml-1">
                              ({isProfit ? '+' : ''}{pos.unrealized_pnl_percent?.toFixed(2)}%)
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <button
                              onClick={() => handleClosePosition(pos.id)}
                              className="px-2.5 py-1 text-[10px] border border-red-500/20 hover:border-red-500/50 bg-red-500/5 hover:bg-red-500 text-red-400 hover:text-white rounded-lg font-bold transition-all"
                            >
                              Close Position
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Performance Analytics Grid */}
          <div className="bg-surface-800/30 border border-slate-800/60 rounded-2xl p-6">
            <h3 className="text-white text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <BarChart2 className="text-brand-400" size={14} />
              Performance Analytics
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              
              {/* Win Rate */}
              <div className="bg-surface-800/25 border border-slate-800/40 p-4 rounded-xl text-center">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Win Rate</span>
                <p className="text-white text-2xl font-bold font-mono mt-1">
                  {metrics?.win_rate != null ? `${metrics.win_rate}%` : '0%'}
                </p>
                <span className="text-slate-600 text-[8px] mt-0.5 block">
                  {metrics?.winning_trades || 0}W / {metrics?.losing_trades || 0}L
                </span>
              </div>

              {/* Profit Factor */}
              <div className="bg-surface-800/25 border border-slate-800/40 p-4 rounded-xl text-center">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Profit Factor</span>
                <p className="text-white text-2xl font-bold font-mono mt-1">
                  {metrics?.profit_factor != null ? metrics.profit_factor.toFixed(2) : '0.00'}
                </p>
                <span className="text-slate-600 text-[8px] mt-0.5 block">gross profits / gross losses</span>
              </div>

              {/* Sharpe Ratio */}
              <div className="bg-surface-800/25 border border-slate-800/40 p-4 rounded-xl text-center">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Sharpe Ratio</span>
                <p className="text-white text-2xl font-bold font-mono mt-1">
                  {metrics?.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : '0.00'}
                </p>
                <span className="text-slate-600 text-[8px] mt-0.5 block">Risk-adjusted return</span>
              </div>

              {/* Max Drawdown */}
              <div className="bg-surface-800/25 border border-slate-800/40 p-4 rounded-xl text-center">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Max Drawdown</span>
                <p className="text-red-400 text-2xl font-bold font-mono mt-1">
                  {metrics?.max_drawdown_percent != null ? `-${metrics.max_drawdown_percent}%` : '0.00%'}
                </p>
                <span className="text-slate-600 text-[8px] mt-0.5 block">
                  Peak-to-trough decline
                </span>
              </div>

              {/* Average Win/Loss */}
              <div className="bg-surface-800/25 border border-slate-800/40 p-4 rounded-xl text-center">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Avg Win / Loss</span>
                <div className="flex flex-col mt-1">
                  <span className="text-emerald-400 text-xs font-bold font-mono">
                    +₹{metrics?.average_win?.toFixed(2) || '0.00'}
                  </span>
                  <span className="text-red-400 text-xs font-bold font-mono">
                    ₹{metrics?.average_loss?.toFixed(2) || '0.00'}
                  </span>
                </div>
              </div>

              {/* Current Streak */}
              <div className="bg-surface-800/25 border border-slate-800/40 p-4 rounded-xl text-center">
                <span className="text-slate-500 text-[9px] font-bold uppercase tracking-wider">Active Streak</span>
                <p className={`text-2xl font-bold font-mono mt-1 ${metrics?.current_streak?.type === 'WIN' ? 'text-emerald-400' : metrics?.current_streak?.type === 'LOSS' ? 'text-red-400' : 'text-slate-400'}`}>
                  {metrics?.current_streak?.count || 0} {metrics?.current_streak?.type || 'NONE'}
                </p>
                <span className="text-slate-600 text-[8px] mt-0.5 block">consecutive trades</span>
              </div>

            </div>

            {/* Best and Worst Trades */}
            {metrics?.best_trade && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-800/50">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">🏆 Best Sim Trade:</span>
                  <span className="text-emerald-400 font-bold font-mono uppercase">
                    {metrics.best_trade.symbol} (+₹{metrics.best_trade.pnl?.toFixed(2)})
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">⚠️ Worst Sim Trade:</span>
                  <span className="text-red-400 font-bold font-mono uppercase">
                    {metrics.worst_trade.symbol} (₹{metrics.worst_trade.pnl?.toFixed(2)})
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Right Column: Quick Trading Ticket */}
        <div className="flex flex-col gap-6">
          
          {/* PLACE ORDER CARD */}
          <div className="bg-surface-800/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="text-white text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp size={14} className="text-brand-400" />
              Order Execution Ticket
            </h3>

            <form onSubmit={handlePlaceOrder} className="flex flex-col gap-4">
              
              {/* Buy/Sell Side Toggle */}
              <div className="grid grid-cols-2 bg-slate-900/60 p-1 rounded-xl border border-slate-800/80">
                <button
                  type="button"
                  onClick={() => { setOrderSide('BUY'); setOrderQty('0.1'); setOrderError(null); setOrderSuccess(null); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all uppercase
                    ${orderSide === 'BUY' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Buy / Long
                </button>
                <button
                  type="button"
                  onClick={() => { setOrderSide('SELL'); setOrderQty('0.1'); setOrderError(null); setOrderSuccess(null); }}
                  className={`py-2 rounded-lg text-xs font-bold transition-all uppercase
                    ${orderSide === 'SELL' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  Sell / Close
                </button>
              </div>

              {/* Symbol Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Asset Symbol</label>
                <select
                  value={orderSymbol}
                  onChange={(e) => { setOrderSymbol(e.target.value); setOrderError(null); setOrderSuccess(null); }}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 transition-colors w-full"
                >
                  {SUPPORTED_SYMBOLS.map(sym => (
                    <option key={sym} value={sym}>{sym}</option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Quantity</label>
                  {orderSide === 'SELL' && (() => {
                    const pos = portfolio?.positions?.find(p => p.symbol === orderSymbol.toUpperCase() && p.side === 'BUY')
                    return pos ? (
                      <span className="text-[10px] text-slate-500">Max own: {pos.quantity.toFixed(4)}</span>
                    ) : null
                  })()}
                </div>
                <input
                  type="number"
                  step="any"
                  value={orderQty}
                  onChange={(e) => { setOrderQty(e.target.value); setOrderError(null); setOrderSuccess(null); }}
                  placeholder="0.00"
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-brand-500 font-mono transition-colors"
                />
              </div>

              {/* Cost/Proceeds Estimation */}
              {lastCandlePrice && orderSymbol.toUpperCase() === (activeSymbol || '').toUpperCase() && (
                <div className="bg-slate-900/30 border border-slate-800/40 p-3 rounded-xl flex flex-col gap-1 text-[11px] font-medium text-slate-400">
                  <div className="flex justify-between">
                    <span>Est. Market Price:</span>
                    <span className="text-white font-mono">₹{lastCandlePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800/30">
                    <span>Est. Value:</span>
                    <span className="text-white font-mono font-bold">
                      ₹{((Number(orderQty) || 0) * lastCandlePrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}

              {/* Messages */}
              {orderError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] leading-normal flex items-start gap-1.5">
                  <span className="font-bold uppercase">Rejected:</span>
                  <span>{orderError}</span>
                </div>
              )}

              {orderSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] leading-normal font-medium">
                  {orderSuccess}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={orderLoading}
                className={`py-3 rounded-xl text-xs font-black uppercase text-white shadow-lg transition-all duration-300 disabled:opacity-50
                  ${orderSide === 'BUY' 
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10 hover:shadow-emerald-500/20' 
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/10 hover:shadow-red-500/20'}`}
              >
                {orderLoading ? 'Sending Order...' : `Execute Sim ${orderSide}`}
              </button>

            </form>
          </div>

        </div>

      </div>

      {/* HISTORICAL TRADES */}
      <div className="bg-surface-800/30 border border-slate-800/60 rounded-2xl p-6">
        <h3 className="text-white text-xs font-black uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity size={14} className="text-brand-400" />
          Trade Execution History
        </h3>

        {trades.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/10 border border-dashed border-slate-800/80 rounded-xl">
            <p className="text-slate-500 text-xs">No executed trades logged in SQLite.</p>
            <p className="text-slate-600 text-[10px] mt-1">Closed positions will record realized P&L logs here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/50 pb-2">
                  <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Time</th>
                  <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Symbol</th>
                  <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Side</th>
                  <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Quantity</th>
                  <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Execution Price</th>
                  <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Total Cost</th>
                  <th className="text-slate-500 text-[10px] font-bold uppercase tracking-wider pb-3">Realized P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {trades.map((t) => {
                  const isSell = t.side === 'SELL'
                  const isProfit = t.pnl >= 0
                  const pnlColor = isSell ? (isProfit ? 'text-emerald-400' : 'text-red-400') : 'text-slate-400'
                  
                  return (
                    <tr key={t.id} className="hover:bg-surface-800/10 transition-colors">
                      <td className="py-2.5 text-xs text-slate-400 font-mono">
                        {new Date(t.executed_at * 1000).toLocaleString(undefined, { hourCycle: 'h23', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-2.5 text-xs font-bold text-white uppercase">{t.symbol}</td>
                      <td className="py-2.5 text-xs">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase
                          ${t.side === 'BUY' ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}
                        >
                          {t.side}
                        </span>
                      </td>
                      <td className="py-2.5 text-xs font-mono text-slate-300">{t.quantity.toFixed(4)}</td>
                      <td className="py-2.5 text-xs font-mono text-slate-300">₹{t.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-2.5 text-xs font-mono text-slate-300">₹{t.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className={`py-2.5 text-xs font-mono font-bold ${pnlColor}`}>
                        {isSell ? (
                          <>
                            {isProfit ? '+' : ''}₹{t.pnl?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            <span className="text-[10px] font-normal opacity-85 ml-1">
                              ({isProfit ? '+' : ''}{t.pnl_percent?.toFixed(2)}%)
                            </span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CONFIRM RESET DIALOG MODAL */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-800 border border-slate-700 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <h3 className="text-white text-base font-bold mb-2 flex items-center gap-2">
                <RotateCcw className="text-red-400" size={18} />
                Reset Paper Portfolio?
              </h3>
              
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                This will wipe out all simulated trade histories, clear all open positions in SQLite, and set your cash balance back to the starting balance.
              </p>

              <div className="flex flex-col gap-1.5 mb-6">
                <label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Starting Balance (₹)</label>
                <input
                  type="number"
                  value={resetBalance}
                  onChange={(e) => setResetBalance(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-brand-500 font-mono transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  disabled={resetLoading}
                  className="px-4 py-2 border border-slate-700 hover:bg-slate-700/30 text-slate-300 text-xs rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetPortfolio}
                  disabled={resetLoading}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs rounded-xl font-bold transition-all shadow-lg shadow-red-500/10 flex items-center gap-1.5"
                >
                  {resetLoading ? 'Resetting...' : 'Yes, Reset Wallet'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}
