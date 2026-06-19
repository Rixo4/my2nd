import React from 'react';
import MetricsCard from './MetricsCard';
import { Wallet, DollarSign, Activity, Award } from 'lucide-react';

export default function MetricsSection({ portfolio, loading }) {
  const portValue = portfolio?.total_value || 10000;
  const initialCap = portfolio?.starting_balance || 10000;
  const profitAmt = portValue - initialCap;
  const profitPct = ((profitAmt / initialCap) * 100).toFixed(2);
  
  const totalUnrealized = portfolio?.positions?.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0) || 0;
  const unrealizedColor = totalUnrealized >= 0 ? 'bg-gradient-to-br from-chainapex-accentGreen to-green-700' : 'bg-gradient-to-br from-chainapex-accentRed to-rose-700';
  
  const realizedColor = (portfolio?.realized_pnl || 0) >= 0 ? 'bg-gradient-to-br from-chainapex-accentGreen to-green-700' : 'bg-gradient-to-br from-chainapex-accentRed to-rose-700';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricsCard 
        title="Net Asset Value"
        value={`₹${portValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="cumulative profit"
        pnlPercent={profitPct}
        Icon={Wallet}
        gradientClass="bg-gradient-to-br from-chainapex-accentPurple to-indigo-600"
        loading={loading}
      />
      <MetricsCard 
        title="Available Cash"
        value={`₹${(portfolio?.cash_balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={`${((portfolio?.cash_balance / portValue) * 100).toFixed(0)}% cash ratio`}
        Icon={DollarSign}
        gradientClass="bg-gradient-to-br from-chainapex-accentBlue to-cyan-600"
        loading={loading}
      />
      <MetricsCard 
        title="Unrealized P&L"
        value={`${totalUnrealized >= 0 ? '+' : ''}₹${totalUnrealized.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle={`across ${portfolio?.positions?.length || 0} open positions`}
        Icon={Activity}
        gradientClass={unrealizedColor}
        loading={loading}
      />
      <MetricsCard 
        title="Realized P&L"
        value={`${(portfolio?.realized_pnl || 0) >= 0 ? '+' : ''}₹${(portfolio?.realized_pnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        subtitle="From completed trades"
        Icon={Award}
        gradientClass={realizedColor}
        loading={loading}
      />
    </div>
  );
}
