import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Zap } from 'lucide-react'

export default function FinalCTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl overflow-hidden p-12 glow-ring"
          style={{ background: 'linear-gradient(135deg, #0f0f1f 0%, #111128 50%, #0f0f1f 100%)' }}>

          {/* Background effects */}
          <div className="absolute inset-0 bg-hero-glow pointer-events-none opacity-60" />
          <div className="absolute inset-0 bg-grid opacity-30" />

          <div className="relative z-10">
            <p className="section-label mb-6">GET STARTED</p>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Stop Watching Markets.<br />
              <span className="gradient-text">Start Reading Them.</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
              Every minute you spend manually scanning charts is a minute your edge is slipping.
              CHARTIFY hands you an institutional-grade detection engine — for every trader, at every level.
              The setups are already forming. Will you see them in time?
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard" className="btn-primary text-base px-8 py-4">
                <Zap size={18} />
                Start Scanning Free
                <ArrowRight size={16} />
              </Link>
              <Link to="/patterns" className="btn-secondary text-base px-8 py-4">
                Explore Pattern Library
              </Link>
            </div>

            <p className="text-slate-600 text-sm mt-6">
              Free plan available · No credit card required · Cancel anytime
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
