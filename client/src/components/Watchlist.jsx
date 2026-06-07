import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, Star, List } from 'lucide-react'
import { ALL_SYMBOLS, SYMBOLS } from '../data/mockData'

const DEFAULT_WATCHLIST = ['AAPL', 'BTC', 'EURUSD']

export default function Watchlist({ activeSymbol, onSelect, watchlist: propWatchlist, setWatchlist: propSetWatchlist }) {
  const [localWatchlist, setLocalWatchlist] = useState(DEFAULT_WATCHLIST)
  const watchlist = propWatchlist !== undefined ? propWatchlist : localWatchlist
  const setWatchlist = propSetWatchlist !== undefined ? propSetWatchlist : setLocalWatchlist
  const [search, setSearch] = useState('')

  const suggestions = ALL_SYMBOLS
    .filter(s => !watchlist.includes(s.id) &&
      (s.id.toLowerCase().includes(search.toLowerCase()) ||
       s.label.toLowerCase().includes(search.toLowerCase())))
    .slice(0, 4)

  const add = (id) => { setWatchlist(w => [...w, id]); setSearch('') }
  const remove = (id) => setWatchlist(w => w.filter(x => x !== id))

  const watchlistSymbols = ALL_SYMBOLS.filter(s => watchlist.includes(s.id))

  return (
    <div className="sidebar-section">
      <div className="flex items-center gap-2">
        <Star size={14} className="text-brand-400" />
        <h3 className="text-white font-semibold text-sm">Watchlist</h3>
      </div>

      {/* Search / add */}
      <div className="relative">
        <input type="text" placeholder="Add symbol…" value={search}
               onChange={e => setSearch(e.target.value)}
               className="input-field text-xs pr-8" />
        {search && (
          <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            <X size={12} />
          </button>
        )}
        {/* Suggestions dropdown */}
        <AnimatePresence>
          {search && suggestions.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="absolute top-full left-0 right-0 mt-1 bg-surface-600 border border-slate-700
                                   rounded-xl overflow-hidden z-20 shadow-xl">
              {suggestions.map(s => (
                <button key={s.id} onClick={() => add(s.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5
                                   hover:bg-surface-500 transition-colors duration-150">
                  <div className="text-left">
                    <p className="text-white text-xs font-semibold">{s.id}</p>
                    <p className="text-slate-500 text-[10px]">{s.label}</p>
                  </div>
                  <Plus size={12} className="text-brand-400" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Watchlist items */}
      <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '220px' }}>
        <AnimatePresence>
          {watchlistSymbols.map(sym => (
            <motion.div key={sym.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }}
              onClick={() => onSelect(sym.id)}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer
                          transition-all duration-200 group
                          ${activeSymbol === sym.id
                            ? 'bg-brand-500/15 border border-brand-500/30'
                            : 'hover:bg-surface-700 border border-transparent'}`}>
              <div>
                <p className={`text-xs font-bold ${activeSymbol === sym.id ? 'text-brand-400' : 'text-white'}`}>
                  {sym.id}
                </p>
                <p className="text-slate-500 text-[10px]">{sym.label}</p>
              </div>
              <button onClick={e => { e.stopPropagation(); remove(sym.id) }}
                      className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all">
                <X size={12} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* All Stocks section */}
      <div className="mt-4 pt-4 border-t border-slate-800/60 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <List size={14} className="text-brand-400" />
          <h3 className="text-white font-semibold text-sm">All Stocks</h3>
        </div>
        
        <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '180px' }}>
          {SYMBOLS.stocks.map(sym => {
            const isStarred = watchlist.includes(sym.id)
            return (
              <div key={sym.id}
                onClick={() => onSelect(sym.id)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer
                            transition-all duration-200 group
                            ${activeSymbol === sym.id
                              ? 'bg-brand-500/15 border border-brand-500/30'
                              : 'hover:bg-surface-700 border border-transparent'}`}>
                <div className="truncate pr-2">
                  <p className={`text-xs font-bold truncate ${activeSymbol === sym.id ? 'text-brand-400' : 'text-white'}`}>
                    {sym.id}
                  </p>
                  <p className="text-slate-500 text-[10px] truncate">{sym.label}</p>
                </div>
                <button onClick={e => { 
                  e.stopPropagation(); 
                  if (isStarred) {
                    remove(sym.id)
                  } else {
                    add(sym.id)
                  }
                }}
                className={`text-slate-500 hover:text-yellow-400 transition-colors shrink-0
                            ${isStarred ? 'text-yellow-400' : 'opacity-40 group-hover:opacity-100'}`}>
                  <Star size={12} fill={isStarred ? "currentColor" : "none"} />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
