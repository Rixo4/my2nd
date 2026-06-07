import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, BookOpen, GraduationCap, Lightbulb } from 'lucide-react'

const CARDS = [
  {
    title: "What is a Doji?",
    text: "A Doji represents market indecision. It forms when the opening and closing prices are almost exactly the same.",
    tip: "Wait for the next candle to confirm the direction!"
  },
  {
    title: "Support & Resistance",
    text: "Support is a price level where buying is strong enough to stop a fall. Resistance is where selling stops a rise.",
    tip: "Buy at support, sell at resistance."
  },
  {
    title: "Volume Confirmation",
    text: "Patterns are 10x more reliable when accompanied by high trading volume. It shows big money is involved.",
    tip: "Always check the volume bars!"
  },
  {
    title: "The 2% Rule",
    text: "Never risk more than 2% of your total account on a single trade. This keeps you in the game longer.",
    tip: "Survival is the first step to profit."
  }
]

export default function LearningCards() {
  const [index, setIndex] = useState(0)

  const next = () => setIndex((i) => (i + 1) % CARDS.length)
  const prev = () => setIndex((i) => (i - 1 + CARDS.length) % CARDS.length)

  return (
    <div className="bg-surface-800/40 rounded-2xl border border-slate-800/60 p-4 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-brand-400">
          <GraduationCap size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Trader Academy</span>
        </div>
        <div className="flex gap-1">
          <button onClick={prev} className="p-1 hover:bg-white/5 rounded text-slate-500"><ChevronLeft size={14} /></button>
          <button onClick={next} className="p-1 hover:bg-white/5 rounded text-slate-500"><ChevronRight size={14} /></button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="min-h-[100px]"
        >
          <h4 className="text-white text-xs font-bold mb-2">{CARDS[index].title}</h4>
          <p className="text-slate-400 text-[11px] leading-relaxed mb-4">{CARDS[index].text}</p>
          
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex gap-2 items-start">
            <Lightbulb size={12} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-emerald-400 text-[10px] italic">{CARDS[index].tip}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex justify-center gap-1">
        {CARDS.map((_, i) => (
          <div key={i} className={`h-1 rounded-full transition-all ${i === index ? 'w-4 bg-brand-500' : 'w-1 bg-slate-700'}`} />
        ))}
      </div>
    </div>
  )
}
