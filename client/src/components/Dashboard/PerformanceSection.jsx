import React from 'react';
import PerformanceMetricCard from './PerformanceMetricCard';
import { Target, TrendingUp, Activity, AlertTriangle, Repeat, BarChart2 } from 'lucide-react';

export default function PerformanceSection({ metrics }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="text-chainapex-accentPurple" size={16} />
          PERFORMANCE METRICS
        </h3>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <PerformanceMetricCard
          label="WIN RATE"
          value={metrics?.win_rate != null ? `${metrics.win_rate}%` : '0%'}
          isPositive={metrics?.win_rate > 50}
          isNegative={metrics?.win_rate > 0 && metrics?.win_rate < 50}
          subtitle={`${metrics?.winning_trades || 0}W / ${metrics?.losing_trades || 0}L`}
          Icon={Target}
        />
        <PerformanceMetricCard
          label="PROFIT FACTOR"
          value={metrics?.profit_factor != null ? metrics.profit_factor.toFixed(2) : '0.00'}
          isPositive={metrics?.profit_factor > 1.2}
          subtitle="Gross profits / losses"
          Icon={TrendingUp}
        />
        <PerformanceMetricCard
          label="SHARPE RATIO"
          value={metrics?.sharpe_ratio != null ? metrics.sharpe_ratio.toFixed(2) : '0.00'}
          isPositive={metrics?.sharpe_ratio > 0.5}
          subtitle="Risk-adjusted return"
          Icon={Activity}
        />
        <PerformanceMetricCard
          label="MAX DRAWDOWN"
          value={metrics?.max_drawdown_percent != null ? `-${metrics.max_drawdown_percent}%` : '0.00%'}
          isNegative={metrics?.max_drawdown_percent > 0}
          subtitle="Peak-to-trough drop"
          Icon={AlertTriangle}
        />
        <PerformanceMetricCard
          label="AVG WIN / LOSS"
          value={metrics?.average_win ? `+₹${metrics.average_win.toFixed(0)} / -₹${(metrics.average_loss || 0).toFixed(0)}` : '0.00'}
          subtitle="Trade averages"
          Icon={Repeat}
        />
        <PerformanceMetricCard
          label="ACTIVE STREAK"
          value={`${metrics?.current_streak?.count || 0} ${metrics?.current_streak?.type || 'NONE'}`}
          isPositive={metrics?.current_streak?.type === 'WIN'}
          isNegative={metrics?.current_streak?.type === 'LOSS'}
          subtitle="Consecutive trades"
          Icon={Target}
        />
      </div>
    </div>
  );
}
