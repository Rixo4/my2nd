import React from 'react';

export default function PerformanceMetricCard({ label, value, unit, isPositive, isNegative, subtitle, Icon }) {
  let valueColor = 'text-white';
  if (isPositive) valueColor = 'text-chainapex-accentGreen';
  if (isNegative) valueColor = 'text-chainapex-accentRed';

  const isZero = value === '0%' || value === '0.00' || value === '0.00%';

  return (
    <div className={`bg-chainapex-cardBg border border-chainapex-border/50 rounded-xl p-5 hover:scale-102 hover:shadow-xl hover:border-slate-500 transition-all duration-300 ${isZero ? 'opacity-50 hover:opacity-100' : ''}`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-chainapex-textSecondary text-[10px] font-bold uppercase tracking-wider">{label}</span>
        {Icon && <Icon size={16} className="text-chainapex-textMuted" />}
      </div>
      <div>
        <h4 className={`text-2xl font-bold font-mono tracking-tight ${valueColor}`}>
          {value}
        </h4>
        {(subtitle || unit) && (
          <span className="text-chainapex-textMuted text-[10px] uppercase mt-1.5 block font-semibold tracking-wide">
            {subtitle || unit}
          </span>
        )}
      </div>
    </div>
  );
}
