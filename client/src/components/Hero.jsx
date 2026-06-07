import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, ShieldCheck, TrendingUp } from 'lucide-react'

const TICKER = ['AAPL +2.4%','BTC +5.1%','MSFT +1.8%','ETH +3.2%','GOOGL -0.9%','SOL +7.4%','TSLA +4.1%','BNB +2.0%','EURUSD +0.3%','AMZN +1.5%']

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.25, 0.46, 0.45, 0.94] }
})

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-grid opacity-40" />
      <div className="absolute inset-0 bg-hero-glow pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]
                      bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
        {/* Badge */}
        <motion.div {...fadeUp(0.1)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
             border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-brand-500 alert-dot" />
          Live Pattern Scanner — 15+ Patterns Detected in Real Time
        </motion.div>

        {/* Headline */}
        <motion.h1 {...fadeUp(0.2)}
          className="text-5xl sm:text-6xl md:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
          Read the Market<br />
          <span className="gradient-text glow-text">Before It Moves.</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p {...fadeUp(0.35)}
          className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          TradeWise automatically detects candlestick patterns from live OHLC data —
          turning raw price action into instant, actionable trading signals.
          No expertise required.
        </motion.p>

        {/* CTAs */}
        <motion.div {...fadeUp(0.5)} className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link to="/dashboard" className="btn-primary text-base px-8 py-4 rounded-xl">
            <Zap size={18} /> Start Scanning Free
            <ArrowRight size={16} />
          </Link>
          <Link to="/how-it-works" className="btn-secondary text-base px-8 py-4 rounded-xl">
            See How It Works
          </Link>
        </motion.div>

        {/* Trust line */}
        <motion.div {...fadeUp(0.65)} className="flex flex-wrap items-center justify-center gap-6 text-slate-500 text-sm mb-16">
          <span className="flex items-center gap-1.5"><ShieldCheck size={15} className="text-brand-500" /> No credit card required</span>
          <span className="w-px h-4 bg-slate-700" />
          <span className="flex items-center gap-1.5"><TrendingUp size={15} className="text-brand-500" /> 5,000+ active traders</span>
          <span className="w-px h-4 bg-slate-700" />
          <span className="flex items-center gap-1.5"><Zap size={15} className="text-brand-500" /> Real-time detection</span>
        </motion.div>

        {/* Ticker bar */}
        <motion.div {...fadeUp(0.75)}
          className="relative w-full overflow-hidden rounded-xl border border-slate-800/60 bg-surface-800/60"
          style={{ backdropFilter: 'blur(10px)' }}>
          <div className="flex ticker-track whitespace-nowrap py-3">
            {[...TICKER, ...TICKER].map((t, i) => {
              const isNeg = t.includes('-')
              return (
                <span key={i} className={`inline-flex items-center gap-1.5 mx-6 text-sm font-mono font-medium
                  ${isNeg ? 'text-red-400' : 'text-emerald-400'}`}>
                  <span className="text-slate-500">{t.split(' ')[0]}</span>
                  {t.split(' ')[1]}
                </span>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32
                      bg-gradient-to-t from-surface-900 to-transparent pointer-events-none" />
    </section>
  )
}
