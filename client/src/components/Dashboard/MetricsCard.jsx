import React from 'react';

export default function MetricsCard({ title, value, subtitle, pnlPercent, Icon, gradientClass, loading }) {
  return (
    <div className={`rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 backdrop-blur-sm border border-white/10 relative overflow-hidden group ${gradientClass}`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-all pointer-events-none transform translate-x-8 -translate-y-8" />
      
      <div className="flex justify-between items-start relative z-10">
        <span className="text-white/80 text-xs uppercase tracking-wider font-bold">{title}</span>
        {Icon && <Icon size={20} className="text-white/80" />}
      </div>
      
      <div className="mt-6 relative z-10">
        {loading ? (
          <div className="h-8 w-32 bg-white/20 animate-pulse rounded mb-2"></div>
        ) : (
          <h3 className="text-white text-3xl font-bold font-mono tracking-tight">{value}</h3>
        )}
        
        <div className="flex items-center gap-2 mt-2">
          {pnlPercent !== undefined && pnlPercent !== null && !loading && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pnlPercent >= 0 ? 'bg-white/20 text-emerald-50' : 'bg-black/20 text-rose-50'}`}>
              {pnlPercent >= 0 ? '+' : ''}{pnlPercent}%
            </span>
          )}
          {!loading && subtitle && (
            <span className="text-sm text-white/70">{subtitle}</span>
          )}
          {loading && <div className="h-4 w-24 bg-white/10 animate-pulse rounded"></div>}
        </div>
      </div>
    </div>
  );
}
