import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, ShieldCheck, Target, AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react'

function getAction(trend, latest) {
  const t = trend || 'Sideways'

  if (latest) {
    if (latest.signal === 'bullish') {
      if (t === 'Uptrend') {
        return {
          title: 'High-Confidence Buy Setup',
          desc: `A ${latest.pattern} has formed in an active Uptrend — a strong confirmation signal. Momentum favors long positions.`,
          color: 'text-emerald-400',
          bg: 'bg-emerald-400/10',
          border: 'border-emerald-400/30',
          icon: <ShieldCheck size={20} />
        }
      } else if (t === 'Downtrend') {
        return {
          title: 'Possible Reversal — Wait for Confirmation',
          desc: `A ${latest.pattern} has appeared during a Downtrend. This may signal a reversal but is not confirmed. Wait for a second bullish candle before entering.`,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          border: 'border-amber-400/30',
          icon: <AlertTriangle size={20} />
        }
      } else {
        return {
          title: 'Mild Bullish Signal — Use Caution',
          desc: `A ${latest.pattern} has formed in a Sideways market. Consider waiting for trend confirmation before entering a long position.`,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          border: 'border-amber-400/30',
          icon: <AlertTriangle size={20} />
        }
      }
    } else if (latest.signal === 'bearish') {
      if (t === 'Downtrend') {
        return {
          title: 'High-Confidence Sell Pressure',
          desc: `A ${latest.pattern} confirms the existing Downtrend. Avoid new longs. Consider protecting existing positions with stop-losses.`,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          border: 'border-red-400/30',
          icon: <Target size={20} />
        }
      } else if (t === 'Uptrend') {
        return {
          title: 'Caution — Trend May Be Weakening',
          desc: `A ${latest.pattern} appeared in an Uptrend — a potential warning sign. Tighten stop-losses but do not panic sell until confirmed.`,
          color: 'text-amber-400',
          bg: 'bg-amber-400/10',
          border: 'border-amber-400/30',
          icon: <AlertTriangle size={20} />
        }
      } else {
        return {
          title: 'Bearish Pattern — Avoid Longs',
          desc: `A ${latest.pattern} has formed in a Sideways market. Avoid new buy entries. A confirmed breakdown could signal a Downtrend.`,
          color: 'text-red-400',
          bg: 'bg-red-400/10',
          border: 'border-red-400/30',
          icon: <Target size={20} />
        }
      }
    }
  }

  if (t === 'Uptrend') {
    return {
      title: 'Uptrend in Progress',
      desc: 'Market is trending up with higher highs and higher lows. Look for pullbacks to support for potential entry points.',
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
      border: 'border-emerald-400/30',
      icon: <TrendingUp size={20} />
    }
  } else if (t === 'Downtrend') {
    return {
      title: 'Downtrend in Progress',
      desc: 'Sellers are in control. Wait for confirmed reversal signals before entering any long positions.',
      color: 'text-red-400',
      bg: 'bg-red-400/10',
      border: 'border-red-400/30',
      icon: <TrendingDown size={20} />
    }
  } else {
    return {
      title: 'Market Consolidating',
      desc: 'No clear directional trend. Avoid chasing price — wait for a breakout above resistance or breakdown below support.',
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
      border: 'border-amber-400/30',
      icon: <Minus size={20} />
    }
  }
}

export default function RecommendationBox({ trend, patterns }) {
  const latest = patterns[0]
  const action = getAction(trend, latest)

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
