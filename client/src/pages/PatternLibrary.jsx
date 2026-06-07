import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BarChart2, Search, ArrowLeft, TrendingUp, TrendingDown, Minus, ArrowRight, Zap } from 'lucide-react'
import { PATTERN_LIBRARY } from '../utils/patternDetection'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const SIGNAL_FILTERS = ['All', 'bullish', 'bearish', 'neutral']

export default function PatternLibrary() {
  const [search, setSearch] = useState('')
  const [sigFilter, setSigFilter] = useState('All')

  const filtered = PATTERN_LIBRARY.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchSig    = sigFilter === 'All' || p.signal === sigFilter
    return matchSearch && matchSig
  })

  const bullish = filtered.filter(p => p.signal === 'bullish')
  const bearish = filtered.filter(p => p.signal === 'bearish')
  const neutral = filtered.filter(p => p.signal === 'neutral')

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-500 text-[10px] font-bold uppercase tracking-widest mb-6"
            >
              Educational Hub
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight"
            >
              Candlestick <span className="gradient-text">Encyclopedia</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-400 text-lg max-w-2xl mx-auto"
            >
              Master 15+ high-probability patterns. Learn how they form, why they work, and exactly how to trade them.
            </motion.p>
          </div>

          {/* Search & Global Filters */}
          <div className="mb-16 flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-800/50 p-4 rounded-2xl border border-slate-800/50 backdrop-blur-xl">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search patterns (e.g. 'Hammer', 'Star')..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-12 bg-surface-900/50"
              />
            </div>
            <div className="flex gap-2 p-1 bg-surface-900/50 rounded-xl border border-slate-800">
              {SIGNAL_FILTERS.map(f => (
                <button
                  key={f}
                  onClick={() => setSigFilter(f)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all uppercase tracking-wider
                    ${sigFilter === f ? 'bg-brand-500 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Categorized Sections */}
          <div className="space-y-24">
            {bullish.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-10">
                  <h2 className="text-2xl font-bold text-white whitespace-nowrap">Bullish Reversals</h2>
                  <div className="h-px w-full bg-gradient-to-r from-emerald-500/20 to-transparent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bullish.map(p => <PatternCard key={p.id} p={p} />)}
                </div>
              </section>
            )}

            {bearish.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-10">
                  <h2 className="text-2xl font-bold text-white whitespace-nowrap">Bearish Reversals</h2>
                  <div className="h-px w-full bg-gradient-to-r from-red-500/20 to-transparent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {bearish.map(p => <PatternCard key={p.id} p={p} />)}
                </div>
              </section>
            )}

            {neutral.length > 0 && (
              <section>
                <div className="flex items-center gap-4 mb-10">
                  <h2 className="text-2xl font-bold text-white whitespace-nowrap">Neutral / Indecision</h2>
                  <div className="h-px w-full bg-gradient-to-r from-amber-500/20 to-transparent" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {neutral.map(p => <PatternCard key={p.id} p={p} />)}
                </div>
              </section>
            )}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 bg-surface-800/20 rounded-3xl border border-dashed border-slate-800">
              <p className="text-slate-500 italic">No patterns found matching your search.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function PatternCard({ p }) {
  return (
    <Link to={`/patterns/${p.id}`} className="block group">
      <motion.div 
        whileHover={{ y: -8 }}
        className="card h-full flex flex-col bg-surface-800/40 border-slate-800/60 hover:border-brand-500/50 transition-all duration-300 overflow-hidden relative"
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b opacity-50 group-hover:opacity-100 transition-opacity
          ${p.signal === 'bullish' ? 'from-emerald-500 to-transparent' : 
            p.signal === 'bearish' ? 'from-red-500 to-transparent' : 
            'from-amber-500 to-transparent'}" 
        />
        
        <div className="p-6 flex flex-col h-full">
          <div className="flex justify-between items-start mb-6">
            <div className={`p-3 rounded-xl bg-surface-700/50 border border-slate-700/50
              ${p.signal === 'bullish' ? 'text-emerald-500' : p.signal === 'bearish' ? 'text-red-500' : 'text-amber-500'}`}>
              {p.signal === 'bullish' ? <TrendingUp size={24} /> : p.signal === 'bearish' ? <TrendingDown size={24} /> : <Minus size={24} />}
            </div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-surface-900/50 px-2 py-1 rounded">
              {p.candles} Candles
            </span>
          </div>

          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-brand-500 transition-colors">
            {p.name}
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8 flex-grow line-clamp-3">
            {p.description}
          </p>

          <div className="flex items-center justify-between pt-6 border-t border-slate-800/60">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${p.reliability === 'High' ? 'bg-emerald-500 animate-pulse' : p.reliability === 'Medium' ? 'bg-amber-500' : 'bg-slate-500'}`} />
              <span className="text-xs text-slate-500">Reliability: <span className="text-slate-200 font-bold">{p.reliability}</span></span>
            </div>
            <div className="flex items-center gap-2 text-brand-500 text-xs font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
              LEARN MORE
              <ArrowRight size={14} />
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  )
}
