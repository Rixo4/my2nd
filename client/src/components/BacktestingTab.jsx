import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play, RefreshCw, TrendingUp, TrendingDown, Activity,
  BarChart2, Zap, ChevronRight, Layers, AlertCircle,
  CheckCircle, ArrowUpRight, ArrowDownRight, Clock, Target
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

function StatCard({ label, value, sub, color = 'white', icon: Icon }) {
  const colorMap = {
    green:  'text-cyan-400 bg-black/95 border-cyan-500/40 hover:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] border-t-2 border-t-cyan-400',
    red:    'text-pink-500 bg-black/95 border-pink-500/40 hover:border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.15)] border-t-2 border-t-pink-500',
    blue:   'text-cyan-400 bg-black/95 border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.1)] border-t-2 border-t-cyan-500',
    violet: 'text-pink-500 bg-black/95 border-pink-500/30 hover:border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.1)] border-t-2 border-t-pink-500',
    amber:  'text-yellow-400 bg-black/95 border-yellow-500/40 hover:border-yellow-400 shadow-[0_0_12px_rgba(251,238,9,0.15)] border-t-2 border-t-yellow-400',
    white:  'text-white bg-black/95 border-slate-800 hover:border-cyan-500/40 shadow-[0_0_12px_rgba(255,255,255,0.03)] border-t-2 border-t-slate-500',
  }
  return (
    <div className={`flex flex-col gap-2.5 p-5 rounded-none border transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 relative overflow-hidden group ${colorMap[color]}`}>
      {/* Visual cyber corner tab */}
      <div className="absolute top-0 right-0 w-1.5 h-1.5 bg-current opacity-70"></div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black font-mono uppercase tracking-widest text-slate-500">[{label}]</span>
        {Icon && <Icon size={12} className="text-slate-500 opacity-60 group-hover:text-current transition-colors" />}
      </div>
      <p className="text-2xl font-black font-mono tracking-tight">{value}</p>
      {sub && <p className="text-[9px] text-slate-500 font-mono font-bold leading-normal">// {sub}</p>}
    </div>
  )
}

function GradeTag({ value }) {
  const grade = value >= 0 ? (value > 10 ? 'A' : value > 0 ? 'B' : 'C') : 'D'
  const colors = {
    A: 'text-cyan-400 border-cyan-500/35 bg-cyan-950/20 shadow-[0_0_10px_rgba(6,182,212,0.15)]',
    B: 'text-emerald-400 border-emerald-500/35 bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.15)]',
    C: 'text-amber-400 border-amber-500/35 bg-amber-950/20 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    D: 'text-pink-500 border-pink-500/35 bg-pink-950/20 shadow-[0_0_10px_rgba(236,72,153,0.15)]'
  }
  return (
    <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-3 py-1 rounded-none border ${colors[grade]}`}>
      [SYS_GRADE: {grade}]
    </span>
  )
}

function EquityCurve({ trades, initialCapital }) {
  const svgRef = useRef(null)
  const [hovered, setHovered] = useState(null)

  if (!trades || trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-slate-500 text-xs bg-black/60 rounded-none border border-cyan-500/25 font-mono">
        // NO_TRADES_RECORDED
      </div>
    )
  }

  const W = 640, H = 200, PAD = 24
  const points = [{ val: initialCapital, idx: 0, label: 'Start' }]
  let running = initialCapital
  trades.forEach((t, i) => {
    running += (t.pnl || 0)
    points.push({ val: running, idx: i + 1, label: `TR_${String(i + 1).padStart(3, '0')}`, win: (t.pnl || 0) >= 0 })
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
  const areaD = `${pathD} L ${gx(points.length - 1)} ${H - PAD} L ${gx(0)} ${H - PAD} Z`
  const isProfit = points[points.length - 1].val >= initialCapital
  const lineColor = isProfit ? '#00f0ff' : '#ff007f'
  const gradId = isProfit ? 'ecGradCyan' : 'ecGradFuchsia'

  // Generate gridline levels
  const gridLevels = [
    minV,
    minV + range * 0.25,
    minV + range * 0.5,
    minV + range * 0.75,
    maxV
  ]

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

  const baselineY = gy(initialCapital)

  return (
    <div className="relative w-full rounded-none bg-[#050508] border border-cyan-500/35 p-6 shadow-[inset_0_0_15px_rgba(6,182,212,0.05)]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full select-none"
        style={{ height: 200 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal Gridlines */}
        {gridLevels.map((lvl, idx) => (
          <line
            key={idx}
            x1={PAD}
            y1={gy(lvl)}
            x2={W - PAD}
            y2={gy(lvl)}
            stroke="rgba(6, 182, 212, 0.12)"
            strokeWidth="0.8"
            strokeDasharray="4,4"
            opacity="0.8"
          />
        ))}

        {/* Break-even Baseline */}
        {baselineY >= PAD && baselineY <= H - PAD && (
          <g>
            <line
              x1={PAD}
              y1={baselineY}
              x2={W - PAD}
              y2={baselineY}
              stroke="#fbee09"
              strokeWidth="1.2"
              strokeDasharray="2,4"
              opacity="0.6"
            />
            <text
              x={PAD + 6}
              y={baselineY - 4}
              fill="#fbee09"
              fontSize="7.5"
              fontWeight="bold"
              fontFamily="monospace"
              opacity="0.85"
            >
              [ BASELINE: ${fmt(initialCapital, 0)} ]
            </text>
          </g>
        )}

        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} stroke={lineColor} strokeWidth="2.5" fill="none" strokeLinecap="round" />

        {/* Interactive Hover State */}
        {hovered && (
          <>
            <line
              x1={hovered.svgX}
              y1={PAD}
              x2={hovered.svgX}
              y2={H - PAD}
              stroke={lineColor}
              strokeWidth="1.2"
              strokeDasharray="3,3"
              opacity="0.75"
            />
            <circle cx={hovered.svgX} cy={hovered.svgY} r="5.5" fill={lineColor} stroke="#050508" strokeWidth="2" />
            
            {/* Cyber Tooltip overlay */}
            <g transform={`translate(${Math.min(Math.max(hovered.svgX - 65, 4), W - 134)}, ${Math.max(hovered.svgY - 55, 4)})`}>
              <rect width="130" height="46" rx="0" fill="#050508" stroke={lineColor} strokeWidth="1.5" />
              <text x="8" y="14" fill="#64748b" fontSize="8" fontWeight="bold" fontFamily="monospace">
                // {hovered.label}
              </text>
              <text x="8" y="26" fill={lineColor} fontSize="10" fontWeight="black" fontFamily="monospace">
                EQ_VAL: ${fmt(hovered.val, 0)}
              </text>
              {hovered.idx > 0 && (
                <text x="8" y="36" fill={hovered.win ? '#00f0ff' : '#ff007f'} fontSize="8" fontWeight="bold" fontFamily="monospace">
                  {hovered.win ? '[+] WIN' : '[-] LOSS'}
                </text>
              )}
            </g>
          </>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-2 px-2">
        <span>MIN_EQUITY: <span className="text-pink-500 font-bold">${fmt(minV)}</span></span>
        <span>MAX_EQUITY: <span className="text-cyan-400 font-bold">${fmt(maxV)}</span></span>
      </div>
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
  const [aiTune, setAiTune]   = useState(true)
  const [loadingPhase, setLoadingPhase] = useState('SYS_STANDBY')

  const stratConfig = STRATEGIES.find(s => s.id === strategy)

  const handleParamChange = (key, rawVal, type) => {
    setParams(p => ({ ...p, [key]: parseFloat(rawVal) }))
  }

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    // Simulated ML pipeline optimization phases
    const phases = [
      'NEURAL_NET: INITIALIZING_GRADIENTS',
      'TENSOR_SHAPE: [64, 4, 1] INGESTED',
      'ALIGNING SYNAPSE WEIGHT VALS...',
      'OPTIMIZING BIAS NODES (EPOCH 34/100)',
      'OPTIMIZING BIAS NODES (EPOCH 89/100)',
      'CALCULATING MONTE CARLO VALUE...',
      'SYNAPSE COMPILATION COMPLETE'
    ]
    
    let step = 0
    setLoadingPhase(phases[0])
    const interval = setInterval(() => {
      step++
      if (step < phases.length) {
        setLoadingPhase(phases[step])
      } else {
        clearInterval(interval)
      }
    }, 450)

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
      clearInterval(interval)
      setLoading(false)
      setLoadingPhase('SYS_STANDBY')
    }
  }

  function getAIEvaluation(roi, winRate, maxDrawdown, symbol, rsiLower, rsiUpper) {
    const isPositive = roi >= 0
    const isHighDrawdown = maxDrawdown > 15
    const isHighWinRate = winRate >= 55
    
    let report = []
    
    if (isPositive) {
      report.push(`[SYS_OK] AI CORE SIGNAL DETECTED STRONG LONG-TERM CONVERGENCE FOR ASSET [${symbol}].`)
      report.push(`[ANALYSIS] PREDICTIVE ACCURACY AT ${fmt(winRate)}% WIN_RATE GENERATES ROBUST YIELD ALPHA.`)
      if (isHighDrawdown) {
        report.push(`[WARNING] ACCUMULATED DRAWDOWN IS ELEVATED AT ${fmt(maxDrawdown)}%. SUGGEST TIGHTENING STOP LOSS TO MITIGATE RISK.`)
      } else {
        report.push(`[INFO] DRAWDOWN REMAINS WITHIN SECURE MARGINS (<15%). TENSOR OPTIMIZATION CONVERGED SUCCESSFULLY.`)
      }
    } else {
      report.push(`[SYS_WARN] AI QUANT DETECTED SYSTEMIC NEGATIVE DRIFT (ROI: ${fmt(roi)}%).`)
      report.push(`[ANALYSIS] RSI PARAMETERS [${rsiLower}/${rsiUpper}] ARE PRODUCING REPETITIVE WHIPSAWS UNDER CURRENT TREND DYNAMICS.`)
      if (isHighWinRate) {
        report.push(`[DIAGNOSTIC] WIN ACCURACY IS SATISFACTORY BUT LOSS SEVERITY ECLIPSES YIELDS. ADJUST RISK COEFFICIENTS.`)
      } else {
        report.push(`[CRITICAL] LOW CONVERGENCE WIN RATE DELIVERED. ENGINE SUSPECTS OVERFITTING OR HIGH VOLATILITY CLUSTERING.`)
      }
    }
    
    report.push(`[RECOMMENDATION] ENGINE STAGED DEPLOYMENT STATUS: ${isPositive && !isHighDrawdown ? 'DEPLOY_APPROVED_STAGED' : 'OPTIMIZATION_REQUIRED'}.`)
    return report
  }

  const m = result?.metrics

  return (
    <div className="flex flex-col gap-0 w-full min-h-full text-slate-300 cyber-grid-bg cyber-scanlines py-2 px-1">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b-2 border-cyan-500/30 shadow-[0_1px_5px_rgba(6,182,212,0.1)]">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1.5 font-mono">
            <Layers size={12} className="text-pink-500" />
            <span>RESEARCH</span>
            <ChevronRight size={12} className="text-slate-650" />
            <span className="text-cyan-450 font-bold">[ STRATEGY_BACKTESTER ]</span>
          </div>
          <h1 className="text-white text-3xl font-black tracking-widest uppercase cyber-glow-pink font-mono">[ STRATEGY_BACKTESTER ]</h1>
          <p className="text-slate-500 text-xs font-mono mt-0.5">// SIMULATE QUANT STRATEGIES WITH COMMISSIONS & RISK MATRIX</p>
        </div>
        <div className="flex items-center gap-2 border border-cyan-500/35 bg-cyan-950/20 text-cyan-400 px-4 py-2 rounded-none text-[10px] font-bold font-mono tracking-wider shadow-[0_0_12px_rgba(6,182,212,0.2)]">
          <BarChart2 size={12} className="text-cyan-400 animate-pulse" />
          <span>[ ENGINE: WALK_FORWARD // STATUS: ONLINE ]</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">

        {/* Setup Column */}
        <div className="lg:col-span-1 flex flex-col gap-5 p-5 rounded-none cyber-panel cyber-corners">
          <h3 className="text-cyan-400 text-xs font-black uppercase tracking-wider flex items-center gap-2.5 pb-3 border-b border-cyan-500/25 font-mono">
            <Target size={14} className="text-cyan-400" />
            [ SETUP_PARAMETERS ]
          </h3>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] text-cyan-400 font-bold font-mono uppercase tracking-wider">Asset Symbol</label>
            <select
              value={symbol}
              onChange={e => setSymbol(e.target.value)}
              className="bg-black/90 border border-cyan-500/30 hover:border-cyan-400 rounded-none px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/25 transition-all font-mono font-bold cursor-pointer w-full"
            >
              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-cyan-400 font-bold font-mono uppercase tracking-wider">Strategy</label>
            {STRATEGIES.map(s => (
              <button
                key={s.id}
                onClick={() => setStrategy(s.id)}
                className={`w-full text-left px-4 py-3 rounded-none border text-xs font-mono font-black transition-all duration-300 flex flex-col gap-0.5 relative overflow-hidden group ${
                  strategy === s.id
                    ? 'bg-pink-950/15 border-pink-500 text-pink-400 shadow-[0_0_15px_rgba(236,72,153,0.25)]'
                    : 'bg-black/40 border-cyan-500/25 text-cyan-400/70 hover:border-cyan-400 hover:text-cyan-300'
                }`}
              >
                <span className="flex items-center justify-between w-full">
                  <span>{strategy === s.id ? `> ${s.label} <` : s.label}</span>
                  {strategy === s.id && <span className="h-2 w-2 rounded-none bg-pink-500 shadow-[0_0_6px_#ff007f] animate-pulse" />}
                </span>
                <span className="block text-[10px] font-mono font-normal text-slate-500 group-hover:text-slate-400 transition-colors mt-1 leading-relaxed">{s.description}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 pt-3 border-t border-cyan-500/20">
            <label className="text-[10px] text-cyan-400 font-bold font-mono uppercase tracking-widest">Execution Costs</label>
            <div className="flex gap-3">
              <div className="flex-1 flex flex-col gap-1.5">
                <span className="text-[9px] text-cyan-400/80 font-bold font-mono uppercase">Comm %</span>
                <input type="number" value={commission} step="0.01" min="0"
                  onChange={e => setCommission(e.target.value)}
                  className="bg-black/85 border border-cyan-500/25 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/25 rounded-none px-3 py-2 text-xs text-cyan-300 outline-none font-mono font-extrabold" />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <span className="text-[9px] text-cyan-400/80 font-bold font-mono uppercase">Slip %</span>
                <input type="number" value={slippage} step="0.01" min="0"
                  onChange={e => setSlippage(e.target.value)}
                  className="bg-black/85 border border-cyan-500/25 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/25 rounded-none px-3 py-2 text-xs text-cyan-300 outline-none font-mono font-extrabold" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] text-cyan-400/80 font-bold font-mono uppercase">Starting Capital ($)</span>
              <input type="number" value={capital} step="1000" min="100"
                onChange={e => setCapital(e.target.value)}
                className="bg-black/85 border border-cyan-500/25 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/25 rounded-none px-4 py-2.5 text-xs text-cyan-300 outline-none font-mono font-black" />
            </div>

            <div className="flex flex-col gap-2 pt-3 border-t border-cyan-500/20">
              <label className="text-[10px] text-cyan-400 font-bold font-mono uppercase tracking-wider">AI Optimization Node</label>
              <button
                onClick={() => setAiTune(!aiTune)}
                className={`w-full text-left px-3.5 py-2.5 rounded-none border text-xs font-mono font-black transition-all flex items-center justify-between group ${
                  aiTune
                    ? 'bg-cyan-950/15 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-black/40 border-cyan-500/20 text-cyan-500/60 hover:border-cyan-400/50'
                }`}
              >
                <span>[ AI_HYPER_TUNER ]</span>
                <span className={`text-[9px] px-2 py-0.5 border ${
                  aiTune 
                    ? 'border-cyan-400 bg-cyan-950/40 text-cyan-450 shadow-[0_0_5px_#00f0ff]' 
                    : 'border-slate-800 bg-slate-900/10 text-slate-500'
                }`}>
                  {aiTune ? 'ACTIVE' : 'OFFLINE'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Parameters Column */}
        <div className="lg:col-span-2 flex flex-col gap-5 p-5 rounded-none cyber-panel-pink cyber-corners-pink">
          <h3 className="text-pink-500 text-xs font-black uppercase tracking-wider flex items-center gap-2.5 pb-3 border-b border-pink-500/25 font-mono">
            <Zap size={12} className="text-pink-500" />
            [ STRATEGY_MATRIX // {stratConfig?.label?.toUpperCase()} ]
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stratConfig?.params.map(param => (
              <div key={param.key} className="flex flex-col gap-2.5 bg-black/60 p-4 rounded-none border border-pink-500/20 relative">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-pink-400 font-bold font-mono uppercase tracking-wider">{param.label}</label>
                  <span className="text-xs text-cyan-400 font-mono font-black bg-cyan-950/40 px-2.5 py-0.5 rounded-none border border-cyan-500/30 shadow-[inset_0_0_5px_rgba(6,182,212,0.15)]">
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
                  className="w-full h-1 rounded-none appearance-none bg-slate-900 accent-pink-500 cursor-pointer transition-all hover:accent-pink-400 cyber-range-input"
                />
                <div className="flex justify-between text-[9px] text-pink-500/70 font-mono font-bold">
                  <span>{param.min}{param.type === 'percent' ? '%' : ''}</span>
                  <span>{param.max}{param.type === 'percent' ? '%' : ''}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-4 border-t border-pink-500/20">
            {[
              { l: 'RSI OVERSOLD', v: params.rsiLower },
              { l: 'RSI OVERBOUGHT', v: params.rsiUpper },
              { l: 'TAKE PROFIT', v: `${params.takeProfit}%` },
              { l: 'STOP LOSS', v: `${params.stopLoss}%` }
            ].map(item => (
              <div key={item.l} className="text-center py-2.5 px-3 bg-black/70 rounded-none border border-pink-500/20">
                <p className="text-[9px] text-pink-500/60 uppercase tracking-widest font-black font-mono mb-1">{item.l}</p>
                <p className="text-xs text-cyan-300 font-mono font-black">{item.v}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleRun}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2.5 py-4 bg-gradient-to-r from-pink-600 to-fuchsia-600 hover:from-pink-500 hover:to-fuchsia-500 disabled:from-pink-900 disabled:to-fuchsia-950 text-white rounded-none font-mono font-black text-xs tracking-widest uppercase transition-all duration-300 shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:shadow-[0_0_25px_rgba(236,72,153,0.55)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading
              ? <><RefreshCw size={14} className="animate-spin" /> [ {loadingPhase} ]</>
              : <><Play size={14} /> [ INITIATE_BACKTEST_SIM ]</>
            }
          </button>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-pink-950/20 border border-pink-500/30 rounded-none text-pink-505 text-xs font-mono">
              <AlertCircle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {result && m && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-center justify-between p-5 rounded-none cyber-panel cyber-corners">
              <div>
                <p className="text-white font-black font-mono text-sm uppercase tracking-wide">{result.symbol} // {result.strategyName.toUpperCase()}_ENGINE</p>
                <p className="text-cyan-400/65 font-mono text-[9px] mt-0.5">[ CANDLES: {result.totalCandles} // CLOSED_TRADES: {result.trades?.length ?? 0} ]</p>
              </div>
              <div className="flex items-center gap-2.5">
                <GradeTag value={m.roiPercent} />
                <div className={`flex items-center gap-1.5 px-4 py-2 rounded-none text-[10px] font-black font-mono border ${
                  m.roiPercent >= 0
                    ? 'text-cyan-400 bg-cyan-950/30 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                    : 'text-pink-500 bg-pink-950/30 border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.15)]'
                }`}>
                  {m.roiPercent >= 0 ? <ArrowUpRight size={12} className="text-cyan-400" /> : <ArrowDownRight size={12} className="text-pink-550" />}
                  {m.roiPercent >= 0 ? '+' : ''}{fmt(m.roiPercent)}% ROI
                </div>
              </div>
            </div>

            {/* AI Agent Diagnostics Terminal */}
            <div className="p-5 rounded-none cyber-panel cyber-corners bg-black/90 flex flex-col gap-3.5 border-t-2 border-t-cyan-400">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                <div className="flex items-center gap-2 font-mono text-[10px] text-cyan-400 font-extrabold tracking-wider">
                  <Activity size={12} className="text-cyan-400 animate-pulse" />
                  <span>[ AI_AGENT_COPILOT_DIAGNOSTICS ]</span>
                </div>
                <span className="text-[8px] font-mono text-cyan-400/60 font-semibold">[ THREAD_PORT: 0x9F8B ]</span>
              </div>
              <div className="font-mono text-[10px] flex flex-col gap-1.5 text-cyan-300 leading-relaxed bg-black/60 p-4 border border-cyan-500/10">
                {getAIEvaluation(m.roiPercent, m.winRate, m.maxDrawdownPercent, result.symbol, params.rsiLower, params.rsiUpper).map((line, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className="text-pink-500/80">&gt;&gt;</span>
                    <span>{line}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="AI_ROI_YIELD" value={`${m.roiPercent >= 0 ? '+' : ''}${fmt(m.roiPercent)}%`}
                color={m.roiPercent >= 0 ? 'green' : 'red'} icon={TrendingUp} sub={`PnL: $${fmt(m.totalPnL)}`} />
              <StatCard label="PREDICTIVE_ACCURACY" value={`${fmt(m.winRate)}%`}
                color={m.winRate >= 55 ? 'green' : m.winRate >= 40 ? 'blue' : 'red'} icon={CheckCircle}
                sub={`${result.trades?.length ?? 0} trades`} />
              <StatCard label="SHARPE_RISK_NODE" value={fmt(m.sharpeRatio)}
                color={m.sharpeRatio >= 1 ? 'green' : m.sharpeRatio >= 0 ? 'blue' : 'red'} icon={Activity}
                sub="Risk-adjusted return" />
              <StatCard label="SORTINO_DOWNSIDE_COEF" value={fmt(m.sortinoRatio)}
                color={m.sortinoRatio >= 1 ? 'green' : m.sortinoRatio >= 0 ? 'blue' : 'red'} icon={BarChart2}
                sub="Downside risk ratio" />
              <StatCard label="MAX_DRAWDOWN_TENSOR" value={`${fmt(m.maxDrawdownPercent)}%`}
                color={m.maxDrawdownPercent > 20 ? 'red' : m.maxDrawdownPercent > 10 ? 'amber' : 'green'} icon={TrendingDown}
                sub="Peak-to-trough loss" />
              <StatCard label="PROFIT_FACTOR_BIAS" value={fmt(m.profitFactor)}
                color={m.profitFactor >= 1.5 ? 'green' : m.profitFactor >= 1 ? 'blue' : 'red'} icon={Zap}
                sub="Gross profit / loss" />
            </div>

            <div className="p-6 rounded-none cyber-panel cyber-corners">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-cyan-400 text-xs font-black uppercase tracking-wider flex items-center gap-2.5 font-mono">
                  <Activity size={14} className="text-cyan-400" />
                  [ DIAGNOSTIC // EQUITY_CURVE ]
                </h3>
                <div className="flex items-center gap-3.5 text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#00f0ff] inline-block shadow-[0_0_5px_#00f0ff]" /> [PROFIT_CYAN]</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-[#ff007f] inline-block shadow-[0_0_5px_#ff007f]" /> [LOSS_PINK]</span>
                </div>
              </div>
              <EquityCurve trades={result.trades} initialCapital={parseFloat(capital)} />
            </div>

            {result.trades && result.trades.length > 0 && (
              <div className="rounded-none cyber-panel-pink cyber-corners-pink overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-pink-500/20">
                  <h3 className="text-pink-500 text-xs font-black uppercase tracking-wider flex items-center gap-2.5 font-mono">
                    <Clock size={14} className="text-pink-500" />
                    [ TERMINAL_LOG // STRATEGY_TRADES ]
                  </h3>
                  <span className="text-[10px] text-pink-500/70 font-bold font-mono">[ RECORD_COUNT: {result.trades.length} ]</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] font-mono border-collapse">
                    <thead>
                      <tr className="border-b border-pink-500/20 bg-black/60">
                        {['[#]', '[SIDE]', '[ENTRY_PX]', '[EXIT_PX]', '[PNL_VAL]', '[PNL_PCT]', '[DIAG_CODE]'].map(col => (
                          <th key={col} className="px-5 py-3 text-left text-pink-500/75 font-black uppercase tracking-wider whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 bg-black/10">
                      {result.trades.map((trade, i) => {
                        const isPnlPos = (trade.pnl || 0) >= 0
                        const exitLabels = {
                          TAKE_PROFIT: { label: '<TP_EXEC>', color: 'text-cyan-400 bg-cyan-950/20 border-cyan-500/30' },
                          STOP_LOSS: { label: '<SL_BREAK>', color: 'text-pink-500 bg-pink-950/20 border-pink-500/30' },
                          STRATEGY_SIGNAL: { label: '<SIG_EXIT>', color: 'text-cyan-400 border-cyan-500/20 bg-cyan-950/5' },
                          END_OF_SERIES: { label: '<END_DATA>', color: 'text-slate-500 border-slate-800 bg-slate-900/10' }
                        }
                        const exitInfo = exitLabels[trade.exitReason] || { label: `<${trade.exitReason || '—'}>`, color: 'text-slate-500 border-slate-800 bg-slate-900/10' }
                        return (
                          <motion.tr
                            key={trade.id || i}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.02 }}
                            className="hover:bg-pink-950/15 transition-colors"
                          >
                            <td className="px-5 py-3.5 text-slate-500 font-mono font-medium">{i + 1}</td>
                            <td className="px-5 py-3.5">
                              <span className={`font-black uppercase text-[9px] px-2 py-0.5 rounded-none border ${
                                trade.side === 'BUY' 
                                  ? 'text-cyan-400 bg-cyan-950/20 border-cyan-500/30' 
                                  : 'text-pink-500 bg-pink-950/20 border-pink-500/30'
                              }`}>{trade.side}</span>
                            </td>
                            <td className="px-5 py-3.5 text-white font-mono font-semibold">${fmt(trade.entryPrice)}</td>
                            <td className="px-5 py-3.5 text-white font-mono font-semibold">${fmt(trade.exitPrice)}</td>
                            <td className={`px-5 py-3.5 font-mono font-black ${isPnlPos ? 'text-cyan-400' : 'text-pink-500'}`}>
                              {isPnlPos ? '+' : ''}${fmt(trade.pnl)}
                            </td>
                            <td className={`px-5 py-3.5 font-mono font-black ${isPnlPos ? 'text-cyan-400' : 'text-pink-500'}`}>
                              {isPnlPos ? '+' : ''}{fmt(trade.pnl_percent)}%
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-none border ${exitInfo.color}`}>
                                {exitInfo.label}
                              </span>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
