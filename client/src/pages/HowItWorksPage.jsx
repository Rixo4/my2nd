import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Globe, ScanSearch, Cpu, Bell, TrendingUp, ArrowRight, CheckCircle2, BarChart2, Zap } from 'lucide-react'

const STEPS = [
  {
    icon: Globe,
    title: 'Select Market & Timeframe',
    desc: 'Connect to global markets including US Equities, major Crypto pairs, and Forex. Choose from intraday (5m, 15m) to swing trading (1d, 1w) timeframes.',
    details: [
      'Live WebSocket data streams',
      'Historical OHLC backfill',
      'Multi-exchange support'
    ],
    color: 'text-brand-400',
    bg: 'bg-brand-500/10'
  },
  {
    icon: ScanSearch,
    title: 'AI-Powered Scanning',
    desc: 'Our engine processes millions of data points per second. It scans your entire watchlist simultaneously to find emerging price action patterns.',
    details: [
      'Real-time pattern identification',
      'Volume-weighted analysis',
      'Noise filtering algorithms'
    ],
    color: 'text-violet-400',
    bg: 'bg-violet-500/10'
  },
  {
    icon: Cpu,
    title: 'Pattern Detection Engine',
    desc: 'Proprietary algorithms detect 15+ high-probability candlestick formations. From Hammer reversals to complex Morning Star transitions.',
    details: [
      '15+ standard patterns',
      'Confidence scoring (0-100%)',
      'Trend context validation'
    ],
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10'
  },
  {
    icon: Bell,
    title: 'Instant Smart Alerts',
    desc: 'Never miss a move. Receive push notifications, SMS, or dashboard alerts the moment a high-confidence setup is confirmed.',
    details: [
      'Configurable alert triggers',
      'Cross-device notifications',
      'Execution level suggestions'
    ],
    color: 'text-amber-400',
    bg: 'bg-amber-500/10'
  }
]

const MarketTimeframeVisualizer = () => {
  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex gap-2">
          {['Stocks', 'Crypto', 'Forex'].map((m, idx) => (
            <span key={m} className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${idx === 0 ? 'border-brand-500 bg-brand-500/10 text-white' : 'border-slate-800 text-slate-500'}`}>
              {m}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[8px] font-mono text-emerald-400 uppercase font-black">WS LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
          <span className="text-[9px] text-slate-500 font-bold uppercase">Asset</span>
          <span className="text-white text-xs font-extrabold font-mono text-left">AAPL:NASDAQ</span>
        </div>
        <div className="flex flex-col gap-1 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
          <span className="text-[9px] text-slate-500 font-bold uppercase">Timeframe</span>
          <div className="flex gap-1.5 mt-0.5">
            {['15m', '1h', '1d'].map((tf, i) => (
              <span key={tf} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${i === 2 ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                {tf}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-2 text-left">
        <span className="text-[9px] text-slate-500 font-bold uppercase">Active Stream</span>
        <div className="flex items-center justify-between bg-emerald-950/10 border border-emerald-500/10 p-2.5 rounded-xl">
          <span className="text-emerald-400 text-[10px] font-mono font-bold">Subscribed: AAPL.1d.candles</span>
          <span className="text-[9px] text-slate-500 font-mono">159ms latency</span>
        </div>
      </div>
    </div>
  )
}

const ScanningVisualizer = () => {
  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col gap-3 relative overflow-hidden">
      {/* Scanning Laser Line Effect */}
      <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-violet-500/40 to-transparent top-1/3 animate-pulse" />

      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <span className="text-xs font-bold text-white">Watchlist Scanner</span>
        <span className="text-[8px] font-mono text-violet-400 font-black uppercase bg-violet-500/10 border border-violet-500/20 px-2 py-0.5 rounded">
          Active Scan
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {[
          { sym: 'BTC', status: 'Pattern Found', color: 'text-emerald-400', progress: 100 },
          { sym: 'AAPL', status: 'Scanning (78%)...', color: 'text-violet-400', progress: 78 },
          { sym: 'TSLA', status: 'Waiting in queue', color: 'text-slate-500', progress: 0 },
          { sym: 'SOL', status: 'Scanning (100%)', color: 'text-slate-400', progress: 100 }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between bg-slate-900/30 p-2.5 rounded-xl border border-slate-800/40">
            <div className="flex items-center gap-3">
              <span className="text-white text-xs font-bold font-mono">{item.sym}</span>
              {item.progress > 0 && item.progress < 100 && (
                <div className="w-20 bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div className="bg-violet-500 h-full rounded-full" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </div>
            <span className={`text-[9px] font-bold ${item.color}`}>{item.status}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const PatternDetectionVisualizer = () => {
  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col gap-4 relative">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <span className="text-xs font-bold text-white">Pattern Recognition Engine</span>
        <span className="text-[8px] font-mono text-emerald-400 font-black uppercase bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
          Candlestick Match
        </span>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/50">
        {/* SVG Mini Chart */}
        <svg className="w-full sm:w-48 h-28" viewBox="0 0 200 120">
          <line x1="0" y1="30" x2="200" y2="30" stroke="#1a1a2e" strokeDasharray="2" />
          <line x1="0" y1="60" x2="200" y2="60" stroke="#1a1a2e" strokeDasharray="2" />
          <line x1="0" y1="90" x2="200" y2="90" stroke="#1a1a2e" strokeDasharray="2" />

          {/* Candle 1 (Bearish red) */}
          <line x1="30" y1="20" x2="30" y2="80" stroke="#ef4444" strokeWidth="2" />
          <rect x="22" y="30" width="16" height="35" fill="#ef4444" rx="1" />

          {/* Candle 2 (Bearish red) */}
          <line x1="70" y1="50" x2="70" y2="100" stroke="#ef4444" strokeWidth="2" />
          <rect x="62" y="60" width="16" height="25" fill="#ef4444" rx="1" />

          {/* Candle 3 (Bearish red) */}
          <line x1="110" y1="70" x2="110" y2="110" stroke="#ef4444" strokeWidth="2" />
          <rect x="102" y="75" width="16" height="20" fill="#ef4444" rx="1" />

          {/* Candle 4 (Bullish engulfing green) */}
          <line x1="150" y1="35" x2="150" y2="105" stroke="#22c55e" strokeWidth="2" />
          <rect x="142" y="45" width="16" height="55" fill="#22c55e" rx="1" />

          {/* Dotted border highlighting engulfing */}
          <rect x="94" y="25" width="72" height="90" fill="none" stroke="#22c55e" strokeDasharray="3" strokeWidth="1.5" rx="4" />
        </svg>

        <div className="flex flex-col gap-2 text-left w-full sm:w-auto">
          <span className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wide">Signal Confirmed</span>
          <span className="text-white text-xs font-bold">Bullish Engulfing</span>
          <span className="text-slate-400 text-[9px] leading-tight">Engulfs previous 3 candles at support level</span>
          <span className="text-[9px] text-emerald-400 font-bold">Confidence: 94%</span>
        </div>
      </div>
    </div>
  )
}

const AlertVisualizer = () => {
  return (
    <div className="w-full bg-slate-950/80 border border-slate-800/80 p-6 rounded-2xl shadow-xl flex flex-col gap-4 relative overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <span className="text-xs font-bold text-white">Smart Notification</span>
        <span className="text-[8px] font-mono text-amber-400 font-black uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
          Alert Triggered
        </span>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 relative shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-brand-500 rounded flex items-center justify-center">
              <BarChart2 size={10} className="text-white" />
            </div>
            <span className="text-white text-[10px] font-black uppercase tracking-wider">CHARTIFY</span>
          </div>
          <span className="text-[9px] text-slate-500">now</span>
        </div>

        <div className="flex flex-col gap-1 text-left">
          <span className="text-white text-xs font-bold">🚨 Reversal Alert: AAPL</span>
          <p className="text-slate-300 text-[10px] leading-relaxed">
            Bullish Hammer detected on 15m timeframe. Rejection of low price confirmed with 92% volume surge.
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <span className="flex-1 text-center text-[10px] font-bold bg-brand-500 text-white py-1.5 rounded-lg cursor-pointer">
            Open Chart
          </span>
          <span className="flex-1 text-center text-[10px] font-bold border border-slate-800 text-slate-300 py-1.5 rounded-lg cursor-pointer">
            Dismiss
          </span>
        </div>
      </div>
    </div>
  )
}

const VISUALIZERS = [
  MarketTimeframeVisualizer,
  ScanningVisualizer,
  PatternDetectionVisualizer,
  AlertVisualizer
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-surface-900">
      <Navbar />
      
      <main className="pt-32 pb-24 px-4">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto text-center mb-24">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-6"
          >
            Behind the Engine
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight"
          >
            How <span className="gradient-text">CHARTIFY</span> Works
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg max-w-2xl mx-auto"
          >
            We've distilled complex technical analysis into a streamlined automated workflow. 
            Here is the step-by-step breakdown of how we turn raw data into trading alpha.
          </motion.p>
        </div>

        {/* Detailed Steps */}
        <div className="max-w-5xl mx-auto space-y-32">
          {STEPS.map((step, i) => (
            <motion.div 
              key={step.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-center`}
            >
              <div className="flex-1 space-y-6">
                <div className={`w-16 h-16 rounded-2xl ${step.bg} flex items-center justify-center`}>
                  <step.icon size={32} className={step.color} />
                </div>
                <h2 className="text-3xl font-bold text-white">{step.title}</h2>
                <p className="text-slate-400 text-lg leading-relaxed">{step.desc}</p>
                <ul className="space-y-3">
                  {step.details.map(detail => (
                    <li key={detail} className="flex items-center gap-3 text-slate-300">
                      <CheckCircle2 size={18} className="text-brand-500" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex-1 w-full rounded-3xl bg-surface-800 border border-slate-800 flex items-center justify-center p-6 relative group overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-grid-pattern opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none" />
                <div className="relative z-10 w-full flex items-center justify-center">
                  {(() => {
                    const Component = VISUALIZERS[i]
                    return <Component />
                  })()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Final CTA on Page */}
        <div className="max-w-4xl mx-auto mt-40">
          <div className="card p-12 text-center bg-gradient-to-b from-brand-500/10 to-transparent border-brand-500/20">
            <h2 className="text-3xl font-bold text-white mb-6">Ready to see it in action?</h2>
            <p className="text-slate-400 mb-10 text-lg">Join 5,000+ traders who are already automating their pattern detection.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/dashboard" className="btn-primary text-lg px-10">
                <Zap size={20} />
                Try Live Dashboard
              </Link>
              <Link to="/login" className="btn-secondary text-lg px-10">
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
