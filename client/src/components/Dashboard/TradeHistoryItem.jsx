import React from 'react';
import AssetBadge from '../Common/AssetBadge';
import PnLDisplay from '../Common/PnLDisplay';

export default function TradeHistoryItem({ trade, index, total }) {
  const isBuy = trade.side === 'BUY';
  const dotColor = isBuy ? 'bg-chainapex-accentGreen border-chainapex-accentGreen/30' : 'bg-chainapex-accentRed border-chainapex-accentRed/30';
  
  return (
    <div className="relative flex gap-4 w-full group">
      {/* Timeline Line & Dot */}
      <div className="flex flex-col items-center">
        <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 ${dotColor} relative mt-3`} />
        {index !== total - 1 && (
          <div className="w-px bg-chainapex-border/50 flex-1 my-2" />
        )}
      </div>

      {/* Content Card */}
      <div className="bg-chainapex-bgSecondary/30 border border-chainapex-border/50 group-hover:bg-chainapex-cardBg/80 transition-all duration-300 rounded-xl p-4 flex-1 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2.5">
            <AssetBadge symbol={trade.symbol} size={24} />
            <span className="text-white font-bold uppercase text-sm">{trade.symbol}</span>
            <span className={`text-[9px] px-2 py-0.5 rounded border font-bold uppercase tracking-wider ${isBuy ? 'bg-chainapex-accentGreen/10 border-chainapex-accentGreen/20 text-chainapex-accentGreen' : 'bg-chainapex-accentRed/10 border-chainapex-accentRed/20 text-chainapex-accentRed'}`}>
              {trade.side}
            </span>
          </div>
          <span className="text-chainapex-textMuted text-[10px] uppercase font-bold tracking-wider">
            {new Date(trade.executed_at * 1000).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <div className="flex flex-col">
              <span className="text-chainapex-textMuted text-[9px] uppercase font-bold tracking-wider mb-0.5">Quantity</span>
              <span className="text-white font-mono font-bold text-xs">{trade.quantity.toFixed(4)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-chainapex-textMuted text-[9px] uppercase font-bold tracking-wider mb-0.5">Exec Price</span>
              <span className="text-chainapex-textSecondary font-mono text-xs">₹{trade.price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-chainapex-textMuted text-[9px] uppercase font-bold tracking-wider mb-0.5">Cost / Proceeds</span>
              <span className="text-white font-mono text-xs">₹{trade.total_value?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-chainapex-textMuted text-[9px] uppercase font-bold tracking-wider mb-0.5">Realized P&L</span>
            {!isBuy && trade.pnl !== undefined ? (
              <PnLDisplay value={trade.pnl} className="text-sm" />
            ) : (
              <span className="text-chainapex-textMuted font-mono text-xs">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
