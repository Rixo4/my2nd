import { SlidersHorizontal } from 'lucide-react'

const MARKETS = ['All', 'stocks', 'crypto', 'forex']
const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d', '1w']
const SIGNALS = ['All', 'bullish', 'bearish', 'neutral']

export default function Filters({ market, setMarket, timeframe, setTimeframe, signal, setSignal }) {
  return (
    <div className="sidebar-section">
      <div className="flex items-center gap-2">
        <SlidersHorizontal size={14} className="text-brand-400" />
        <h3 className="text-white font-semibold text-sm">Filters</h3>
      </div>

      {/* Market */}
      <div>
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Market</p>
        <div className="flex flex-wrap gap-1.5">
          {MARKETS.map(m => (
            <button key={m} onClick={() => setMarket(m)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all duration-200
                      ${market === m
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600'}`}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Timeframe */}
      <div>
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Timeframe</p>
        <div className="flex flex-wrap gap-1.5">
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => setTimeframe(t)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-mono font-medium transition-all duration-200
                      ${timeframe === t
                        ? 'bg-brand-500 text-white'
                        : 'bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Signal Filter */}
      <div>
        <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider mb-2">Signal Type</p>
        <div className="flex flex-wrap gap-1.5">
          {SIGNALS.map(s => (
            <button key={s} onClick={() => setSignal(s)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all duration-200
                      ${signal === s
                        ? s === 'bullish' ? 'bg-emerald-500 text-white'
                          : s === 'bearish' ? 'bg-red-500 text-white'
                          : s === 'neutral' ? 'bg-amber-500 text-white'
                          : 'bg-brand-500 text-white'
                        : 'bg-surface-700 text-slate-400 hover:text-white hover:bg-surface-600'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
