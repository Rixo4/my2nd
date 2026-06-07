import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'

function SignalIcon({ signal }) {
  if (signal === 'bullish') return <TrendingUp size={14} className="text-emerald-400" />
  if (signal === 'bearish') return <TrendingDown size={14} className="text-red-400" />
  return <Minus size={14} className="text-amber-400" />
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 65 ? 'bg-brand-500' : 'bg-amber-500'
  return (
    <div className="w-full bg-slate-800 rounded-full h-1">
      <div className={`${color} h-1 rounded-full transition-all duration-700`} style={{ width: `${value}%` }} />
    </div>
  )
}

export default function PatternPanel({ patterns = [] }) {
  return (
    <div className="sidebar-section h-full">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Detected Patterns</h3>
        <span className="text-xs text-slate-500">{patterns.length} found</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: '380px' }}>
        <AnimatePresence>
          {patterns.length === 0 ? (
            <div className="text-center py-8 text-slate-600 text-sm">No patterns detected yet</div>
          ) : (
            patterns.map((p, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-surface-800/40 border border-slate-800/60 rounded-xl p-4 hover:border-brand-500/30 transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.signal === 'bullish' ? 'bg-emerald-500' : p.signal === 'bearish' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <h4 className="text-white text-xs font-bold">{p.pattern}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      {p.successRate}% Success
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">
                      {new Date(p.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-slate-400 text-[11px] leading-relaxed mb-4">
                  {p.explanation}
                </p>

                {/* Trade Signals Section */}
                {p.signals && (
                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/60">
                    <div className="text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Entry</p>
                      <p className="text-white text-[10px] font-bold">₹{p.signals.entry.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Stop Loss</p>
                      <p className="text-red-400 text-[10px] font-bold">₹{p.signals.stopLoss.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-500 uppercase font-black mb-1">Target</p>
                      <p className="text-emerald-400 text-[10px] font-bold">₹{p.signals.target.toLocaleString()}</p>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] text-slate-500 italic">Confidence: {p.confidence}%</span>
                  <button className="text-[9px] font-bold text-brand-500 hover:underline flex items-center gap-1">
                    Explain More <Info size={10} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
