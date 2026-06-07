import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PATTERN_LIBRARY } from '../utils/patternDetection'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Chart from '../components/Chart'
import { CANDLE_DATA } from '../data/mockData'
import { ArrowLeft, Zap, Info, TrendingUp, ShieldAlert, CheckCircle2, Play } from 'lucide-react'

export default function PatternDetailPage() {
  const { id } = useParams()
  const pattern = PATTERN_LIBRARY.find(p => p.id === id)

  // Find sample data that contains this pattern for the "Live Example"
  // We'll use a slice of AAPL or BTC data for the demo
  const sampleData = (CANDLE_DATA['AAPL'] || []).slice(0, 50)
  const samplePatterns = pattern ? [{ ...pattern, time: sampleData[sampleData.length - 5].time, times: [sampleData[sampleData.length - 5].time] }] : []

  if (!pattern) {
    return (
      <div className="min-h-screen bg-surface-900 flex flex-col items-center justify-center p-4">
        <h1 className="text-white text-2xl font-bold mb-4">Pattern not found</h1>
        <Link to="/patterns" className="btn-primary">Back to Library</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />

      <main className="pt-32 pb-24 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Back Link */}
          <Link to="/patterns" className="inline-flex items-center gap-2 text-slate-500 hover:text-brand-500 transition-colors mb-12 group">
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            Back to Encyclopedia
          </Link>

          {/* Header Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border
                  ${pattern.signal === 'bullish' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                    pattern.signal === 'bearish' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 
                    'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                  {pattern.signal} SIGNAL
                </span>
                <span className="bg-surface-800 text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold border border-slate-700 uppercase tracking-widest">
                  {pattern.candles} Candle Unit
                </span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter">
                {pattern.name}
              </h1>
              <p className="text-slate-400 text-xl leading-relaxed mb-10 max-w-xl">
                {pattern.description}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-surface-800/50 p-5 rounded-2xl border border-slate-800">
                  <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Reliability</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${pattern.reliability === 'High' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <p className="text-white font-bold text-xl">{pattern.reliability}</p>
                  </div>
                </div>
                <div className="bg-surface-800/50 p-5 rounded-2xl border border-slate-800">
                  <p className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-1">Profit Potential</p>
                  <p className="text-brand-500 font-bold text-xl">High Alpha</p>
                </div>
              </div>
            </motion.div>

            {/* Live Chart Example */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-brand-500/10 blur-3xl rounded-full" />
              <div className="relative bg-surface-800 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden p-2">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live Example Visualization</span>
                  </div>
                  <Play size={12} className="text-brand-500" />
                </div>
                <div className="h-[300px]">
                  <Chart data={sampleData} patterns={samplePatterns} height={300} />
                </div>
              </div>
              <p className="text-center text-slate-500 text-[10px] mt-4 uppercase tracking-[0.3em]">Interactive Chart Engine</p>
            </motion.div>
          </div>

          {/* Deep Dive Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card p-10 bg-gradient-to-b from-surface-800 to-surface-900 border-slate-800"
            >
              <div className="w-12 h-12 bg-brand-500/10 rounded-xl flex items-center justify-center mb-8 text-brand-500">
                <Info size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-6">How it works</h2>
              <p className="text-slate-400 leading-relaxed text-lg italic border-l-2 border-brand-500 pl-6 py-2">
                "{pattern.howItWorks}"
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="card p-10 bg-gradient-to-b from-surface-800 to-surface-900 border-slate-800"
            >
              <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-8 text-emerald-500">
                <TrendingUp size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white mb-6">Trading Strategy</h2>
              <p className="text-slate-400 leading-relaxed text-lg mb-8">
                {pattern.whatToDo}
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 size={18} className="text-brand-500" />
                  <span>Wait for confirmation candle</span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle2 size={18} className="text-brand-500" />
                  <span>Check volume for divergence</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Web Reference Image */}
          <div className="mb-24">
            <h2 className="text-2xl font-bold text-white mb-10 text-center uppercase tracking-widest">Real World Example</h2>
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 group">
              <img 
                src={pattern.image} 
                className="w-full h-[500px] object-cover group-hover:scale-105 transition-transform duration-700 opacity-60 group-hover:opacity-100" 
                alt="Web reference"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-900 via-transparent to-transparent" />
              <div className="absolute bottom-10 left-10 right-10">
                <p className="text-white font-bold text-xl mb-2">{pattern.name} in Action</p>
                <p className="text-slate-400 text-sm">Example from global financial markets showcasing the pattern at a major support/resistance level.</p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-24 p-12 rounded-3xl bg-gradient-to-r from-brand-600/20 to-transparent border border-brand-500/20 text-center"
          >
            <h2 className="text-3xl font-bold text-white mb-6">Want to detect {pattern.name} in real-time?</h2>
            <p className="text-slate-400 mb-10 max-w-xl mx-auto">
              Our AI engine scans 50+ markets every second to find high-probability {pattern.name} setups.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/dashboard" className="btn-primary px-10 py-4">
                <Zap size={20} />
                Launch Live Scanner
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
