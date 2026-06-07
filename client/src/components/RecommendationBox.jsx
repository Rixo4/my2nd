import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { HelpCircle, ArrowRight, ShieldCheck, Target, AlertTriangle } from 'lucide-react'

export default function RecommendationBox({ trend, patterns }) {
  const latest = patterns[0]
  
  let action = {
    title: "Wait & Watch",
    desc: "The market is currently consolidating. No high-probability setups detected.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    icon: <AlertTriangle size={20} />
  }

  if (latest) {
    if (latest.signal === 'bullish') {
      action = {
        title: "Looking Bullish",
        desc: `A ${latest.pattern} has formed. Combined with the ${trend}, this is a high-confidence long setup.`,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        border: "border-emerald-400/20",
        icon: <ShieldCheck size={20} />
      }
    } else if (latest.signal === 'bearish') {
      action = {
        title: "Bearish Pressure",
        desc: `The ${latest.pattern} suggests a reversal. Be cautious with long positions.`,
        color: "text-red-400",
        bg: "bg-red-400/10",
        border: "border-red-400/20",
        icon: <Target size={20} />
      }
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-2xl border ${action.border} ${action.bg} mb-6`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={action.color}>{action.icon}</div>
        <h3 className={`text-sm font-black uppercase tracking-widest ${action.color}`}>What should I do?</h3>
      </div>
      
      <p className="text-white text-xs font-medium leading-relaxed mb-4">
        {action.desc}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div>
            <p className="text-slate-500 text-[9px] uppercase font-bold mb-1">Market Trend</p>
            <p className="text-white text-[10px] font-bold">{trend}</p>
          </div>
          <div>
            <p className="text-slate-500 text-[9px] uppercase font-bold mb-1">Last Pattern</p>
            <p className="text-white text-[10px] font-bold">{latest?.pattern || 'None'}</p>
          </div>
        </div>
        
        {latest && (
          <Link 
            to={`/patterns/${latest.pattern.toLowerCase().replace(/\s+/g, '-')}`}
            className="flex items-center gap-1.5 text-[10px] font-bold text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-all"
          >
            Details <ArrowRight size={12} />
          </Link>
        )}
      </div>
    </motion.div>
  )
}
