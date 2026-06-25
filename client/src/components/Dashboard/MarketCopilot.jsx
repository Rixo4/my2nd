import { useState, useEffect } from 'react'
import { Sparkles, TrendingUp, TrendingDown, RefreshCw, Compass, AlertTriangle, ShieldAlert, BrainCircuit, CheckCircle2, XCircle } from 'lucide-react'

export default function MarketCopilot({ symbol }) {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/copilot/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      const result = await res.json()
      if (result.success) {
        setData(result)
      } else {
        setError(result.error || 'Failed to generate copilot analysis')
      }
    } catch (err) {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Auto reset or trigger on symbol change if desired (let's auto reset so they can trigger explicitly or auto load)
  useEffect(() => {
    setData(null)
    setError(null)
  }, [symbol])

  const ratingColors = {
    BUY: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    SELL: 'text-red-400 bg-red-500/10 border-red-500/30',
    HOLD: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  }

  const ratingGradients = {
    BUY: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/40',
    SELL: 'from-red-500/20 to-pink-500/10 border-red-500/40',
    HOLD: 'from-amber-500/20 to-orange-500/10 border-amber-500/40'
  }

  return (
    <div className="bg-surface-800 p-4 rounded-xl border border-slate-700 flex flex-col gap-3.5 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-purple-400 animate-pulse" />
          <h3 className="text-white font-bold text-xs uppercase tracking-wider">AI Market Copilot</h3>
        </div>
        {data && (
          <button 
            onClick={handleAnalyze} 
            disabled={loading} 
            className="text-slate-500 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
          </button>
        )}
      </div>

      {!data && !loading && (
        <div className="text-center py-6">
          <Compass size={28} className="text-slate-500 mx-auto mb-2.5 opacity-60" />
          <p className="text-slate-400 text-[10px] leading-normal px-2 mb-3">
            Evaluate technical signals (RSI, MACD, Trend Crossovers) and news sentiment for <strong>{symbol}</strong>.
          </p>
          <button
            onClick={handleAnalyze}
            className="w-full bg-gradient-to-r from-purple-600 to-brand-500 hover:from-purple-500 hover:to-brand-400 text-white font-bold py-2 rounded-lg text-[10px] uppercase flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
          >
            <Sparkles size={12} />
            Analyze {symbol}
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-8 flex flex-col items-center justify-center gap-2">
          <RefreshCw size={24} className="text-purple-400 animate-spin" />
          <p className="text-slate-400 text-[10px] animate-pulse">Running mathematical quantitative models...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-center flex items-center gap-2 text-left">
          <ShieldAlert size={14} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-[10px] leading-tight">{error}</p>
        </div>
      )}

      {data && !loading && (
        <div className="flex flex-col gap-3">
          {/* Main analysis card */}
          <div className={`bg-gradient-to-br ${ratingGradients[data.analysis.rating]} border p-3 rounded-xl flex items-center justify-between`}>
            <div>
              <p className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Quant Rating</p>
              <h4 className="text-white text-lg font-black tracking-tight">{symbol}</h4>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase border shadow-sm ${ratingColors[data.analysis.rating]}`}>
              {data.analysis.rating}
            </span>
          </div>

          {/* Confidence Slider */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[9px]">
              <span className="text-slate-400 font-bold uppercase">Confidence Score</span>
              <span className="text-white font-mono font-bold">{(data.analysis.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-brand-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${data.analysis.confidence * 100}%` }}
              />
            </div>
          </div>

          {/* Targets details grid */}
          <div className="grid grid-cols-3 gap-1.5 my-0.5">
            <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg text-center">
              <p className="text-slate-500 text-[8px] uppercase font-black">Entry</p>
              <p className="text-white font-mono font-bold text-[10px] mt-0.5">${data.analysis.entry_point.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg text-center">
              <p className="text-slate-500 text-[8px] uppercase font-black">Target</p>
              <p className="text-emerald-400 font-mono font-bold text-[10px] mt-0.5">${data.analysis.target_price.toFixed(2)}</p>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 p-2 rounded-lg text-center">
              <p className="text-slate-500 text-[8px] uppercase font-black">Stop Loss</p>
              <p className="text-red-400 font-mono font-bold text-[10px] mt-0.5">${data.analysis.stop_loss.toFixed(2)}</p>
            </div>
          </div>

          {/* AI Rationale */}
          <div className="bg-slate-900/40 border border-slate-800 p-2.5 rounded-lg text-left">
            <p className="text-slate-400 text-[9px] leading-relaxed italic">
              "{data.analysis.rationale}"
            </p>
          </div>

          {/* Explainable AI (XAI) Panel */}
          <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex flex-col gap-2.5 backdrop-blur-md">
            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
              <BrainCircuit size={12} className="text-purple-400" />
              <h4 className="text-[10px] text-white font-bold uppercase tracking-wider">Explainable AI (XAI) Panel</h4>
            </div>

            {/* Model Metadata & Regime */}
            <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-lg text-[9px] border border-slate-800">
              <div>
                <p className="text-slate-500 font-bold uppercase">ML Outcome Model</p>
                <p className="text-slate-300 font-mono mt-0.5">v{data.analysis.mlMetadata?.version || '1.0.0'} (Acc: {((data.analysis.mlMetadata?.accuracy || 0.68) * 100).toFixed(1)}%)</p>
              </div>
              <div className="text-right">
                <p className="text-slate-500 font-bold uppercase">Market Regime</p>
                <p className={`font-mono font-bold mt-0.5 ${data.analysis.regime === 'BULL' ? 'text-emerald-400' : data.analysis.regime === 'BEAR' ? 'text-red-400' : 'text-amber-400'}`}>
                  {data.analysis.regime || 'SIDEWAYS'}
                  {data.analysis.regimePenalty ? ` (${data.analysis.regimePenalty}%)` : ''}
                </p>
              </div>
            </div>

            {/* ML Win Probability and factors */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-slate-400 font-bold uppercase">GBDT Win Probability</span>
                <span className="text-purple-400 font-mono font-black">{((data.analysis.mlPrediction || 0.50) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-950 h-1 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${(data.analysis.mlPrediction || 0.50) * 100}%` }}
                />
              </div>
              {data.analysis.topFactors && data.analysis.topFactors.length > 0 && (
                <p className="text-slate-500 text-[8px] italic leading-normal">
                  Key splits: {data.analysis.topFactors.join(' → ')}
                </p>
              )}
            </div>

            {/* Pro/Con Signals */}
            <div className="grid grid-cols-2 gap-2 mt-0.5 pt-1.5 border-t border-slate-800">
              <div>
                <p className="text-emerald-400 font-black text-[9px] uppercase tracking-wide flex items-center gap-1 mb-1">
                  <CheckCircle2 size={10} /> Positive Signals
                </p>
                {data.analysis.positiveSignals && data.analysis.positiveSignals.length > 0 ? (
                  <ul className="flex flex-col gap-0.5">
                    {data.analysis.positiveSignals.map((sig, i) => (
                      <li key={i} className="text-slate-300 text-[8px] list-none pl-2 border-l border-emerald-500/30">{sig}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600 text-[8px] italic">None detected</p>
                )}
              </div>
              <div>
                <p className="text-red-400 font-black text-[9px] uppercase tracking-wide flex items-center gap-1 mb-1">
                  <XCircle size={10} /> Negative Signals
                </p>
                {data.analysis.negativeSignals && data.analysis.negativeSignals.length > 0 ? (
                  <ul className="flex flex-col gap-0.5">
                    {data.analysis.negativeSignals.map((sig, i) => (
                      <li key={i} className="text-slate-300 text-[8px] list-none pl-2 border-l border-red-500/30">{sig}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600 text-[8px] italic">None detected</p>
                )}
              </div>
            </div>
          </div>

          {/* Indicators details checklist */}
          <div className="border-t border-slate-700/50 pt-2 flex flex-wrap gap-1.5 justify-between">
            <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1
              ${data.indicators.rsi < 30 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                data.indicators.rsi > 70 ? 'text-red-400 bg-red-500/10 border-red-500/20' : 
                'text-slate-400 bg-slate-500/10 border-slate-700'}`}>
              RSI: {data.indicators.rsi.toFixed(0)}
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1
              ${data.indicators.trend === 'BULLISH' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                'text-red-400 bg-red-500/10 border-red-500/20'}`}>
              {data.indicators.trend === 'BULLISH' ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
              EMA Crossover
            </span>
            <span className={`text-[9px] px-2 py-0.5 rounded border font-semibold flex items-center gap-1
              ${data.indicators.macd.histogram > 0 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                'text-red-400 bg-red-500/10 border-red-500/20'}`}>
              MACD: {data.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
