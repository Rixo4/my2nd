import { useState, useEffect } from 'react'
import { AlertCircle, Calculator, ChevronRight, Scale } from 'lucide-react'

export default function PositionSizingCalculator({ portfolioId, symbol, patternName, patternWinRate, onApplySize }) {
  const [riskPercent, setRiskPercent] = useState(1) // default 1% risk
  const [loading, setLoading] = useState(false)
  const [sizingData, setSizingData] = useState(null)
  const [error, setError] = useState(null)

  const calculateSize = async () => {
    if (!portfolioId || !symbol) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/suggestions/validate-position-size', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId,
          symbol,
          riskPercent,
          patternName: patternName || 'Unknown Pattern',
          patternWinRate: patternWinRate || 50
        })
      })
      const data = await res.json()
      if (data.success) {
        setSizingData(data.sizing)
      } else {
        setError(data.error || 'Failed to calculate size')
      }
    } catch (err) {
      console.error(err)
      setError('Error communicating with sizing calculator')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    calculateSize()
  }, [symbol, riskPercent, patternWinRate])

  return (
    <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Calculator className="w-4 h-4 text-purple-400" />
        <span className="text-xs font-bold text-slate-200">AI Risk & Position Sizer</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Account Risk (%)</label>
          <select
            value={riskPercent}
            onChange={(e) => setRiskPercent(Number(e.target.value))}
            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
          >
            <option value={0.5}>0.5% (Low Risk)</option>
            <option value={1}>1.0% (Standard)</option>
            <option value={2}>2.0% (Aggressive)</option>
            <option value={5}>5.0% (High Risk)</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-1">Pattern Win Rate</label>
          <div className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300">
            {patternWinRate || 50}%
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4 gap-2">
          <div className="w-3.5 h-3.5 border-2 border-purple-500/25 border-t-purple-400 rounded-full animate-spin"></div>
          <span className="text-[10px] text-slate-400">Computing ATR volatility size...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-[10px] text-rose-400">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>{error}</span>
        </div>
      ) : sizingData ? (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 bg-slate-900/50 p-2.5 rounded border border-slate-850 text-center">
            <div>
              <p className="text-[9px] text-slate-500 mb-0.5">ATR Volatility</p>
              <p className="text-[11px] font-medium text-slate-300">{sizingData.atr.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 mb-0.5">Risk Capital</p>
              <p className="text-[11px] font-medium text-slate-300">${sizingData.riskAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-500 mb-0.5">Stop Loss pts</p>
              <p className="text-[11px] font-medium text-slate-300">{sizingData.stopLossPoints.toFixed(2)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-800/80 pt-3">
            <div>
              <span className="text-[10px] text-slate-400 block">Recommended Position</span>
              <span className="text-sm font-black text-white">{sizingData.suggestedQuantity} {symbol}</span>
            </div>

            {onApplySize && (
              <button
                type="button"
                onClick={() => onApplySize(sizingData.suggestedQuantity)}
                className="bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 hover:border-purple-500 hover:text-white text-purple-300 text-[10px] font-extrabold px-3 py-1.5 rounded transition-colors flex items-center gap-0.5"
              >
                Use suggested size <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
