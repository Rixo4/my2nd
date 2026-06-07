import { motion } from 'framer-motion'
import { Globe, ScanSearch, Cpu, Bell, TrendingUp } from 'lucide-react'

const STEPS = [
  {
    icon: Globe,
    num: '01',
    title: 'Select Your Market',
    desc: 'Choose from equities, forex, or crypto. Pick your preferred timeframe — from 5-minute intraday to weekly swing setups.',
    color: 'text-brand-400',
    glow: 'rgba(249,115,22,0.3)',
  },
  {
    icon: ScanSearch,
    num: '02',
    title: 'Scan the Data',
    desc: 'TradeWise pulls live OHLC data across your selected universe. The engine processes price action across every candle.',
    color: 'text-violet-400',
    glow: 'rgba(167,139,250,0.3)',
  },
  {
    icon: Cpu,
    num: '03',
    title: 'Detect Patterns',
    desc: 'Proprietary algorithms identify candlestick formations — flagging reversals, continuations, and momentum shifts in real time.',
    color: 'text-emerald-400',
    glow: 'rgba(52,211,153,0.3)',
  },
  {
    icon: Bell,
    num: '04',
    title: 'Get Alerts',
    desc: 'Instant notifications fire the moment a pattern is confirmed. Your dashboard populates with signals ranked by strength.',
    color: 'text-amber-400',
    glow: 'rgba(251,191,36,0.3)',
  },
  {
    icon: TrendingUp,
    num: '05',
    title: 'Analyze & Act',
    desc: 'Review patterns with full technical context. Validate your thesis, set entry and exit levels, and execute with confidence.',
    color: 'text-sky-400',
    glow: 'rgba(56,189,248,0.3)',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="relative max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <p className="section-label mb-4">THE PROCESS</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            From Market to Move in <span className="gradient-text">5 Steps.</span>
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">No manual scanning. No missed setups. Just a clear path from raw data to decisive action.</p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line */}
          <div className="hidden lg:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r
                          from-transparent via-brand-500/30 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {STEPS.map((step, i) => (
              <motion.div key={step.num}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="relative flex flex-col items-center text-center group">
                {/* Icon circle */}
                <div className="relative mb-5">
                  <div className="w-20 h-20 rounded-2xl bg-surface-700 border border-slate-700/60
                                  flex items-center justify-center group-hover:border-brand-500/50
                                  transition-all duration-300"
                       style={{ '--glow': step.glow }}>
                    <step.icon size={28} className={step.color} />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-surface-800
                                  border border-slate-700 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-brand-400">{step.num}</span>
                  </div>
                </div>
                <h3 className="text-white font-semibold mb-2">{step.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
