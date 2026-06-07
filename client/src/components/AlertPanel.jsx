import { motion, AnimatePresence } from 'framer-motion'
import { Bell, TrendingUp, TrendingDown, X } from 'lucide-react'

export default function AlertPanel({ alerts = [], onDismiss }) {
  return (
    <div className="sidebar-section">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-brand-400" />
          <h3 className="text-white font-semibold text-sm">Smart Alerts</h3>
        </div>
        {alerts.length > 0 && (
          <span className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center text-[10px] font-bold text-white alert-dot">
            {alerts.length}
          </span>
        )}
      </div>

      <div className="space-y-2 overflow-y-auto" style={{ maxHeight: '280px' }}>
        <AnimatePresence>
          {alerts.length === 0 ? (
            <div className="text-center py-6 text-slate-600 text-xs">Monitoring markets for patterns...</div>
          ) : (
            alerts.map((alert, i) => (
              <motion.div key={alert.id}
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.3 }}
                className={`rounded-xl p-3 border flex items-start justify-between gap-2
                  ${alert.signal === 'bullish'
                    ? 'bg-emerald-500/10 border-emerald-500/25'
                    : alert.signal === 'bearish'
                    ? 'bg-red-500/10 border-red-500/25'
                    : 'bg-amber-500/10 border-amber-500/25'}`}>
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5">
                    {alert.signal === 'bullish'
                      ? <TrendingUp size={13} className="text-emerald-400" />
                      : alert.signal === 'bearish'
                      ? <TrendingDown size={13} className="text-red-400" />
                      : <Bell size={13} className="text-amber-400" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded
                        ${alert.signal === 'bullish' ? 'bg-emerald-500 text-white' : 
                          alert.signal === 'bearish' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                        {alert.type}
                      </span>
                      <p className="text-white text-xs font-bold">
                        {alert.symbol} — {alert.pattern}
                      </p>
                    </div>
                    <p className="text-slate-400 text-[10px]">{alert.message}</p>
                    
                    {/* Candle History Display */}
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <p className="text-[9px] text-slate-500 uppercase tracking-tighter mb-1">Candle History</p>
                      <div className="flex flex-wrap gap-1">
                        {alert.candleHistory.map((t, idx) => (
                          <span key={idx} className="text-[9px] font-mono bg-white/5 px-1 rounded text-slate-400">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    <p className="text-slate-600 text-[10px] mt-2 font-mono flex items-center gap-1">
                       Alerted at {alert.time}
                    </p>
                  </div>
                </div>
                <button onClick={() => onDismiss(alert.id)}
                        className="text-slate-600 hover:text-slate-300 transition-colors shrink-0 mt-0.5">
                  <X size={12} />
                </button>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
