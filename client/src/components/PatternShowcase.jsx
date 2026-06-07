import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { PATTERN_LIBRARY } from '../utils/patternDetection'

export default function PatternShowcase() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <p className="section-label mb-4">PATTERN LIBRARY</p>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            15 Patterns. Endless Opportunity.
          </h2>
          <p className="text-slate-400 max-w-lg mx-auto">
            CHARTIFY detects the formations that drive markets — so you never trade blind.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {PATTERN_LIBRARY.map((p, i) => (
            <motion.div key={p.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              className="card-hover p-5 flex gap-4 items-start">
              {/* Signal badge */}
              <div className="pt-0.5">
                <span className={p.signal === 'bullish' ? 'badge-bullish' :
                                 p.signal === 'bearish' ? 'badge-bearish' : 'badge-neutral'}>
                  {p.signal === 'bullish' ? '↑' : p.signal === 'bearish' ? '↓' : '~'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-white font-semibold text-sm">{p.name}</h3>
                  <span className="text-slate-600 text-xs">{p.candles}C</span>
                </div>
                <p className="text-slate-500 text-xs leading-relaxed line-clamp-2">{p.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded
                    ${p.reliability === 'High' ? 'bg-emerald-500/10 text-emerald-400' :
                      p.reliability === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-slate-500/10 text-slate-400'}`}>
                    {p.reliability} Reliability
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link to="/patterns" className="btn-secondary inline-flex">
            View Full Pattern Encyclopedia →
          </Link>
        </div>
      </div>
    </section>
  )
}
