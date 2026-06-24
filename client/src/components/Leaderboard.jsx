import { Trophy, TrendingUp } from 'lucide-react'

const TOP_TRADERS = [
  { rank: 1, name: 'AlphaQuant_01', returnPct: 142.8, winRate: 74, icon: '🥇' },
  { rank: 2, name: 'SwingTraderPro', returnPct: 98.4, winRate: 68, icon: '🥈' },
  { rank: 3, name: 'PatternMaster', returnPct: 81.2, winRate: 65, icon: '🥉' },
  { rank: 4, name: 'CandleHunter', returnPct: 54.6, winRate: 59, icon: '⚡' },
]

export default function Leaderboard() {
  return (
    <div className="sidebar-section mt-4 border-t border-slate-800/60 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy size={14} className="text-yellow-400" />
        <h3 className="text-white font-semibold text-sm">Top Trader Leaderboard</h3>
      </div>

      <div className="space-y-1.5">
        {TOP_TRADERS.map(t => (
          <div key={t.rank} className="flex items-center justify-between bg-surface-800/40 border border-slate-800/40 px-3 py-2 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs">{t.icon}</span>
              <div>
                <p className="text-[11px] font-bold text-white leading-tight">{t.name}</p>
                <p className="text-[9px] text-slate-500">Win Rate: {t.winRate}%</p>
              </div>
            </div>
            <div className="text-right flex items-center gap-1">
              <TrendingUp size={10} className="text-emerald-400" />
              <span className="text-[10px] font-mono font-bold text-emerald-400">+{t.returnPct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
