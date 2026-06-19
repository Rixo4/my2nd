import React from 'react';
import TradeHistoryItem from './TradeHistoryItem';
import { Clock } from 'lucide-react';

export default function TradeHistorySection({ trades }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <Clock className="text-chainapex-accentPurple" size={16} />
          TRADE EXECUTION HISTORY
        </h3>
        {trades?.length > 0 && (
          <span className="text-chainapex-accentBlue text-[10px] font-bold uppercase tracking-wider hover:underline cursor-pointer">View Full Ledger</span>
        )}
      </div>

      <div className="flex flex-col mt-2">
        {!trades || trades.length === 0 ? (
          <div className="text-center py-12 bg-chainapex-bgSecondary/30 rounded-xl border border-dashed border-chainapex-border/50">
            <p className="text-chainapex-textSecondary text-xs">No executed trades logged.</p>
          </div>
        ) : (
          trades.map((trade, idx) => (
            <TradeHistoryItem key={trade.id} trade={trade} index={idx} total={trades.length} />
          ))
        )}
      </div>
    </div>
  );
}
