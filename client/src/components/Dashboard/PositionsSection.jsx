import React from 'react';
import AssetBadge from '../Common/AssetBadge';
import PnLDisplay from '../Common/PnLDisplay';

export default function PositionsSection({ positions, onClosePosition }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-chainapex-accentBlue animate-pulse" />
          ACTIVE POSITIONS
        </h3>
        <span className="text-chainapex-textSecondary text-xs bg-chainapex-bgPrimary px-3 py-1 rounded-full border border-chainapex-border/50">
          {positions?.length || 0} Open
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-chainapex-bgSecondary rounded-lg text-[10px] font-bold text-chainapex-textSecondary uppercase tracking-wider">
          <div className="col-span-3">Asset</div>
          <div className="col-span-2">Quantity</div>
          <div className="col-span-2">Entry Price</div>
          <div className="col-span-2">Market Price</div>
          <div className="col-span-2">Unrealized P&L</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>
        
        {/* Rows */}
        {!positions || positions.length === 0 ? (
          <div className="text-center py-12 bg-chainapex-bgSecondary/30 rounded-xl border border-dashed border-chainapex-border/50">
            <p className="text-chainapex-textSecondary text-xs">No active positions open.</p>
          </div>
        ) : (
          positions.map((pos) => (
            <div key={pos.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 bg-chainapex-cardBg rounded-xl border border-chainapex-border/50 hover:border-slate-500 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              <div className="col-span-3 flex items-center gap-3">
                <AssetBadge symbol={pos.symbol} />
                <span className="text-white font-bold text-sm uppercase tracking-wide">{pos.symbol}</span>
              </div>
              <div className="col-span-2 text-white font-mono font-bold text-sm">{pos.quantity.toFixed(4)}</div>
              <div className="col-span-2 text-chainapex-textSecondary font-mono text-xs">₹{pos.entry_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="col-span-2 text-white font-mono font-medium text-xs">₹{pos.current_price?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              <div className="col-span-2 text-sm">
                <PnLDisplay value={pos.unrealized_pnl} />
              </div>
              <div className="col-span-1 text-right">
                <button
                  onClick={() => onClosePosition(pos.id)}
                  className="px-3 py-1.5 border border-chainapex-accentRed/30 bg-chainapex-accentRed/5 hover:bg-chainapex-accentRed hover:text-white text-chainapex-accentRed rounded-lg text-xs font-bold transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
