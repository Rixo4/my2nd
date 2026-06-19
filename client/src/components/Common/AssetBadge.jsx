import React from 'react';

const getColor = (symbol) => {
  const sym = symbol?.toUpperCase() || '';
  if (sym === 'BTC') return 'bg-amber-500';
  if (sym === 'ETH') return 'bg-indigo-500';
  if (sym === 'AAPL') return 'bg-slate-500';
  if (sym === 'MSFT') return 'bg-blue-600';
  if (sym === 'GOOGL') return 'bg-red-500';
  if (sym === 'EURUSD' || sym === 'GBPUSD') return 'bg-teal-500';
  return 'bg-brand-500';
};

export default function AssetBadge({ symbol, size = 32, className = '' }) {
  const colorClass = getColor(symbol);
  const text = symbol ? symbol.slice(0, 2).toUpperCase() : '?';
  
  return (
    <div 
      className={`flex items-center justify-center rounded-full text-white font-bold shadow-md ${colorClass} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {text}
    </div>
  );
}
