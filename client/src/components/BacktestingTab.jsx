import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, RefreshCw, TrendingUp, TrendingDown, Activity,
  BarChart2, Zap, ChevronRight, Layers, AlertCircle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Clock, Target,
  Filter, Download, Search, Settings2, SlidersHorizontal
} from 'lucide-react'

function fmt(n, dec = 2) {
  if (n == null) return '—'
  return Number(n).toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

const STRATEGIES = [
  {
    id: 'RSI',
    label: 'RSI Momentum',
    description: 'Buy when RSI crosses below oversold, sell when overbought.',
    params: [
      { key: 'rsiLower', label: 'Oversold Level', type: 'number', default: 30, min: 10, max: 45 },
      { key: 'rsiUpper', label: 'Overbought Level', type: 'number', default: 70, min: 55, max: 90 },
      { key: 'takeProfit', label: 'Take Profit %', type: 'percent', default: 5, min: 1, max: 25 },
      { key: 'stopLoss', label: 'Stop Loss %', type: 'percent', default: 3, min: 0.5, max: 15 }
    ]
  }
]

const SYMBOLS = ['BTC', 'ETH', 'AAPL', 'MSFT', 'GOOGL', 'EURUSD', 'GBPUSD']

function StatCard({ label, value, change, isPositive, icon: Icon }) {
  return (
    <div className="bg-[#1C1C24] p-6 rounded-[1.5rem] flex flex-col gap-3 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
          {Icon ? <Icon size={14} className="text-slate-300" /> : <Activity size={14} className="text-slate-300" />}
        </div>
        <span className="text-slate-400 text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-end gap-3 mt-2">
        <span className="text-[28px] font-semibold text-white tracking-tight leading-none">{value}</span>
        {change && (
          <span className={`text-xs font-medium mb-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPositive ? '+' : ''}{change}
          </span>
        )}
      </div>
      <div className="mt-4 h-12 w-full opacity-40 group-hover:opacity-100 transition-opacity absolute bottom-0 left-0">
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full translate-y-2">
          <path d="M0,20 Q10,25 20,10 T40,15 T60,5 T80,20 T100,10" fill="none" stroke={isPositive ? '#34d399' : '#fb7185'} strokeWidth="2" vectorEffect="non-scaling-stroke"/>
          <path d="M0,20 Q10,25 20,10 T40,15 T60,5 T80,20 T100,10 L100,30 L0,30 Z" fill={`url(#gradient-${isPositive ? 'green' : 'red'})`} opacity="0.2" />
          <defs>
            <linearGradient id="gradient-green" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gradient-red" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" stopOpacity="1" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}

function EquityCurve({ trades, initialCapital }) {
  const svgRef = useRef(null)
  const [hovered, setHovered] = useState(null)

  if (!trades || trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-slate-500 text-sm">
        No trading data available.
      </div>
    )
  }

  const W = 800, H = 280, PAD = 20
  const points = [{ val: initialCapital, idx: 0, label: 'Start' }]
  let running = initialCapital
  trades.forEach((t, i) => {
    running += (t.pnl || 0)
    points.push({ val: running, idx: i + 1, label: `Trade ${i + 1}`, win: (t.pnl || 0) >= 0 })
  })

  const minV = Math.min(...points.map(p => p.val))
  const maxV = Math.max(...points.map(p => p.val))
  const range = maxV - minV || 1

  const gx = (i) => ((i / (points.length - 1)) * (W - PAD * 2)) + PAD
  const gy = (v) => H - PAD - ((v - minV) / range) * (H - PAD * 2)

  let pathD = `M ${gx(0)} ${gy(points[0].val)}`
  for (let i = 1; i < points.length; i++) {
    const cx1 = gx(i - 1) + (gx(i) - gx(i - 1)) / 2
    pathD += ` C ${cx1} ${gy(points[i-1].val)}, ${cx1} ${gy(points[i].val)}, ${gx(i)} ${gy(points[i].val)}`
  }
  const areaD = `${pathD} L ${gx(points.length - 1)} ${H} L ${gx(0)} ${H} Z`
  
  const lineColor = '#8b5cf6' // Violet-500
  const gradId = 'ecGradPurple'

  const handleMouseMove = (e) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * W
    let ci = 0, cd = Infinity
    for (let i = 0; i < points.length; i++) {
      const d = Math.abs(gx(i) - relX)
      if (d < cd) { cd = d; ci = i }
    }
    setHovered({ ...points[ci], svgX: gx(ci), svgY: gy(points[ci].val) })
  }

  return (
    <div className="relative w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        style={{ height: 280 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6d28d9" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} stroke={lineColor} strokeWidth="3" fill="none" strokeLinecap="round" />

        {hovered && (
          <>
            <line x1={hovered.svgX} y1={0} x2={hovered.svgX} y2={H} stroke="#4b5563" strokeWidth="1" strokeDasharray="4,4" />
            <circle cx={hovered.svgX} cy={hovered.svgY} r="6" fill="#13131A" stroke={lineColor} strokeWidth="3" />
            <g transform={`translate(${Math.min(Math.max(hovered.svgX - 50, 0), W - 100)}, ${Math.max(hovered.svgY - 45, 10)})`}>
              <rect width="100" height="34" rx="8" fill="#2d2d3d" stroke="#4b5563" strokeWidth="1" />
              <text x="50" y="22" fill="#fff" fontSize="12" fontWeight="600" textAnchor="middle" fontFamily="sans-serif">
                ${fmt(hovered.val, 0)}
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  )
}

export default function BacktestingTab() {
  const [symbol, setSymbol] = useState('BTC')
  const [strategy, setStrategy] = useState('RSI')
  const [params, setParams] = useState({ rsiLower: 30, rsiUpper: 70, takeProfit: 5, stopLoss: 3 })
  const [commission, setCommission] = useState('0.1')
  const [slippage, setSlippage]   = useState('0.05')
  const [capital, setCapital]     = useState('10000')
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState(null)
  const [error, setError]     = useState(null)

  const stratConfig = STRATEGIES.find(s => s.id === strategy)

  const handleParamChange = (key, rawVal, type) => {
    setParams(p => ({ ...p, [key]: parseFloat(rawVal) }))
  }

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const body = {
        symbol,
        strategyName: strategy,
        parameters: {
          rsiLower: params.rsiLower,
          rsiUpper: params.rsiUpper,
          takeProfit: params.takeProfit / 100,
          stopLoss: params.stopLoss / 100
        },
        commissionRate: parseFloat(commission) / 100,
        slippagePercent: parseFloat(slippage) / 100,
        initialCapital: parseFloat(capital)
      }
      const res = await fetch('/api/chat/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Backtest failed')
      setResult(data.result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const m = result?.metrics

  return (
    <div className="min-h-full bg-[#13131A] text-white p-6 font-sans">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-[28px] font-semibold text-white tracking-tight">Strategy Backtester</h1>
          <p className="text-slate-400 text-sm mt-1">Here's your latest simulation outcome.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1C1C24] hover:bg-[#252530] text-slate-200 text-sm font-medium rounded-full border border-white/5 transition-colors">
            <Filter size={16} className="text-slate-400" />
            <span>Filter</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-[#1C1C24] hover:bg-[#252530] text-slate-200 text-sm font-medium rounded-full border border-white/5 transition-colors">
            <Download size={16} className="text-slate-400" />
            <span>Export</span>
          </button>
          <button 
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 disabled:text-indigo-400 text-white text-sm font-medium rounded-full transition-colors ml-2 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            <span>{loading ? 'Simulating...' : 'Run Simulation'}</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column (Main Content) */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Top Controls / Filters (inline) */}
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1C1C24] rounded-full border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <Layers size={16} className="text-slate-400" />
              <select 
                value={symbol} onChange={e => setSymbol(e.target.value)}
                className="bg-transparent text-sm text-white font-medium outline-none cursor-pointer appearance-none pr-2"
              >
                {SYMBOLS.map(s => <option key={s} value={s} className="bg-[#1C1C24]">{s}</option>)}
              </select>
            </div>
            
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1C1C24] rounded-full border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <SlidersHorizontal size={16} className="text-slate-400" />
              <select 
                value={strategy} onChange={e => setStrategy(e.target.value)}
                className="bg-transparent text-sm text-white font-medium outline-none cursor-pointer appearance-none pr-2"
              >
                {STRATEGIES.map(s => <option key={s.id} value={s.id} className="bg-[#1C1C24]">{s.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1C1C24] rounded-full border border-white/5 focus-within:border-indigo-500/50 transition-colors">
              <span className="text-slate-400 text-sm font-medium">$</span>
              <input 
                type="number" value={capital} onChange={e => setCapital(e.target.value)}
                className="bg-transparent text-sm text-white font-medium outline-none w-24"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <StatCard 
              label="Net ROI" 
              value={m ? `${m.roiPercent >= 0 ? '+' : ''}${fmt(m.roiPercent)}%` : '—'} 
              change={m ? `PnL $${fmt(m.totalPnL)}` : null}
              isPositive={m?.roiPercent >= 0}
              icon={TrendingUp}
            />
            <StatCard 
              label="Win Rate" 
              value={m ? `${fmt(m.winRate)}%` : '—'} 
              change={m ? `${result?.trades?.length || 0} trades` : null}
              isPositive={m?.winRate >= 50}
              icon={CheckCircle}
            />
            <StatCard 
              label="Max Drawdown" 
              value={m ? `${fmt(m.maxDrawdownPercent)}%` : '—'} 
              change={m ? `Peak to trough` : null}
              isPositive={m?.maxDrawdownPercent < 15}
              icon={TrendingDown}
            />
          </div>

          {/* Main Chart (Equity Curve) */}
          <div className="bg-[#1C1C24] rounded-[1.5rem] p-6 border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-white">Performance Overview</h2>
              {m && (
                <div className="px-3 py-1 bg-white/5 rounded-full text-xs font-medium text-slate-300">
                  {result.totalCandles} Candles
                </div>
              )}
            </div>
            <EquityCurve trades={result?.trades} initialCapital={parseFloat(capital)} />
          </div>

          {/* Trades Table */}
          <div className="bg-[#1C1C24] rounded-[1.5rem] p-6 border border-white/5 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-lg font-semibold">Recent Transactions</h3>
              <div className="flex items-center gap-2 px-4 py-2 bg-[#13131A] rounded-full border border-white/5">
                <Search size={14} className="text-slate-400" />
                <input type="text" placeholder="Search..." className="bg-transparent text-sm text-white outline-none w-28 sm:w-40" />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="text-slate-400 text-sm border-b border-white/5">
                    <th className="pb-4 font-normal pl-2">Action</th>
                    <th className="pb-4 font-normal">Entry Price</th>
                    <th className="pb-4 font-normal">Exit Price</th>
                    <th className="pb-4 font-normal">PnL</th>
                    <th className="pb-4 font-normal">Return</th>
                    <th className="pb-4 font-normal pr-2 text-right">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {result?.trades?.length > 0 ? result.trades.map((trade, i) => {
                    const isPnlPos = (trade.pnl || 0) >= 0
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 pl-2">
                          <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium ${
                            trade.side === 'BUY' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : 'bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/20'
                          }`}>
                            {trade.side}
                          </span>
                        </td>
                        <td className="py-4 text-white text-sm font-medium">${fmt(trade.entryPrice)}</td>
                        <td className="py-4 text-white text-sm font-medium">${fmt(trade.exitPrice)}</td>
                        <td className="py-4">
                          <span className={`text-sm font-medium ${isPnlPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPnlPos ? '+' : ''}${fmt(trade.pnl)}
                          </span>
                        </td>
                        <td className="py-4">
                          <span className={`text-sm font-medium ${isPnlPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPnlPos ? '+' : ''}{fmt(trade.pnl_percent)}%
                          </span>
                        </td>
                        <td className="py-4 pr-2 text-right">
                          <span className="text-slate-400 text-sm">
                            {trade.exitReason === 'TAKE_PROFIT' ? 'Take Profit' : trade.exitReason === 'STOP_LOSS' ? 'Stop Loss' : trade.exitReason === 'STRATEGY_SIGNAL' ? 'Signal' : 'End of Data'}
                          </span>
                        </td>
                      </tr>
                    )
                  }) : (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-500 text-sm">
                        No trades generated. Run simulation first.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-[350px] flex flex-col gap-6 shrink-0">
          
          {/* Balance / Output Card (Deep purple gradient) */}
          <div className="bg-gradient-to-br from-[#2E1E5E] to-[#12111A] rounded-[1.5rem] p-7 border border-indigo-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/30 blur-[60px] rounded-full mix-blend-screen" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-fuchsia-500/20 blur-[50px] rounded-full mix-blend-screen" />
            
            <div className="relative z-10 flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-md">
                  <Activity size={18} className="text-white" />
                </div>
                <span className="text-indigo-200 text-sm font-medium">Final Equity</span>
              </div>
              
              <div>
                <h2 className="text-4xl font-bold text-white tracking-tight">
                  ${result ? fmt(parseFloat(capital) + m.totalPnL) : fmt(capital)}
                </h2>
              </div>
              
              <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center justify-between bg-black/25 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                  <span className="text-indigo-200/80 text-sm">Net Return</span>
                  <span className={`text-sm font-bold ${result && m.roiPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {result ? `${m.roiPercent >= 0 ? '+' : ''}${fmt(m.roiPercent)}%` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-black/25 rounded-2xl p-4 backdrop-blur-sm border border-white/5">
                  <span className="text-indigo-200/80 text-sm">Profit Factor</span>
                  <span className="text-white text-sm font-bold">
                    {result ? `${fmt(m.profitFactor)}x` : '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Parameters */}
          <div className="bg-[#1C1C24] rounded-[1.5rem] p-6 border border-white/5 flex flex-col gap-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white text-lg font-semibold">Parameters</h3>
              <Settings2 size={18} className="text-slate-400" />
            </div>
            
            <div className="flex flex-col gap-5">
              {stratConfig?.params.map(param => (
                <div key={param.key} className="flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">{param.label}</span>
                    <span className="text-white text-sm font-medium bg-white/5 px-2 py-0.5 rounded-md">
                      {params[param.key]}{param.type === 'percent' ? '%' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={param.min}
                    max={param.max}
                    step={param.type === 'percent' ? 0.5 : 1}
                    value={params[param.key]}
                    onChange={e => handleParamChange(param.key, e.target.value, param.type)}
                    className="w-full h-1.5 bg-slate-800 rounded-full appearance-none accent-indigo-500 cursor-pointer transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Execution Costs */}
          <div className="bg-[#1C1C24] rounded-[1.5rem] p-6 border border-white/5 flex flex-col gap-5">
            <h3 className="text-white text-lg font-semibold mb-1">Execution Costs</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#13131A] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-slate-400 text-xs block mb-1.5">Commission %</span>
                <input type="number" value={commission} step="0.01" min="0" onChange={e => setCommission(e.target.value)} 
                  className="bg-transparent text-white w-full outline-none font-medium text-sm" />
              </div>
              <div className="bg-[#13131A] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors">
                <span className="text-slate-400 text-xs block mb-1.5">Slippage %</span>
                <input type="number" value={slippage} step="0.01" min="0" onChange={e => setSlippage(e.target.value)} 
                  className="bg-transparent text-white w-full outline-none font-medium text-sm" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
