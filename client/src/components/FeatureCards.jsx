import { motion } from 'framer-motion'
import { ScanSearch, BookOpen, Star, Bell, SlidersHorizontal, LineChart } from 'lucide-react'

const FEATURES = [
  {
    icon: ScanSearch,
    title: 'Candlestick Scanner',
    description: 'Scan hundreds of instruments simultaneously and surface only the ones forming high-probability patterns — right now, on your chosen timeframe.',
    benefit: 'Stop scrolling. Let the scanner bring setups to you.',
    color: 'text-brand-400',
    bg: 'bg-brand-500/10',
    border: 'border-brand-500/20',
  },
  {
    icon: BookOpen,
    title: 'Pattern Library',
    description: 'Access a visual reference of 15+ candlestick formations — each with signal type, confidence context, and plain-language explanation.',
    benefit: 'Learn and trade simultaneously.',
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
  },
  {
    icon: Star,
    title: 'Watchlist',
    description: 'Build personalized watchlists across stocks, crypto, and forex. Receive pattern signals on your priority tickers without re-scanning.',
    benefit: 'Stay focused on what matters most.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: Bell,
    title: 'Smart Alerts',
    description: 'Get notified the moment a Doji forms on BTC or an Engulfing appears on a top-cap equity — automatically, before the move happens.',
    benefit: 'Never miss a setup, even away from screen.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: SlidersHorizontal,
    title: 'Dynamic Filters',
    description: 'Filter by signal type (bullish / bearish / neutral), timeframe, market, or sector. Narrow thousands of data points to your exact edge.',
    benefit: 'Cut the clutter. See only what fits your plan.',
    color: 'text-sky-400',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/20',
  },
  {
    icon: LineChart,
    title: 'Technical Analysis',
    description: 'View volume overlays, trend context, and support/resistance levels alongside each detected pattern for multi-factor confluence.',
    benefit: 'Higher-conviction decisions in a single view.',
    color: 'text-pink-400',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
  },
]

export default function FeatureCards() {
  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="section-label mb-4">BUILT FOR PRECISION</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Every Tool a Serious Trader Needs.
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            One platform. Every market. All the setups — delivered automatically.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="card-hover p-6 group cursor-default">
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${f.bg} border ${f.border} flex items-center
                              justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                <f.icon size={22} className={f.color} />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">{f.description}</p>
              <p className={`text-xs font-semibold ${f.color} border-t border-slate-800/60 pt-4`}>
                → {f.benefit}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
