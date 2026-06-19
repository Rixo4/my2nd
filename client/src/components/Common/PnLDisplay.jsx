import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function PnLDisplay({ value, isPercent = false, prefix = '₹', className = '', showArrow = true }) {
  if (value == null) return <span className="text-chainapex-textMuted">—</span>;
  
  const isProfit = value >= 0;
  const colorClass = isProfit ? 'text-chainapex-accentGreen' : 'text-chainapex-accentRed';
  const Icon = isProfit ? ArrowUpRight : ArrowDownRight;
  
  const formattedValue = Math.abs(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return (
    <span className={`flex items-center gap-1 font-bold ${colorClass} ${className}`}>
      {showArrow && <Icon size={16} />}
      <span>{isProfit ? '+' : '-'}{!isPercent && prefix}{formattedValue}{isPercent && '%'}</span>
    </span>
  );
}
