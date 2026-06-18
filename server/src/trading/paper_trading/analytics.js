/**
 * Performance analytics — advanced metrics for a paper trading portfolio.
 */

import { roundPrice } from '../common/utils.js'

/**
 * Calculate comprehensive performance metrics from trade history.
 *
 * @param {object[]} trades   - All trades for the portfolio
 * @param {object[]} snapshots - Daily portfolio snapshots
 * @param {number}   startingBalance
 * @returns {object}
 */
export function calculateMetrics(trades, snapshots, startingBalance) {
  const sellTrades = trades.filter((t) => t.side === 'SELL')
  const totalTrades = trades.length
  const closedTrades = sellTrades.length

  // ── Drawdown & equity curve (computed regardless of closed trades) ─────────
  const sortedSnapshots = [...snapshots].sort((a, b) =>
    a.snapshot_date.localeCompare(b.snapshot_date)
  )

  let maxDrawdown = 0
  let maxDrawdownPercent = 0
  let peak = startingBalance

  for (const snap of sortedSnapshots) {
    if (snap.total_value > peak) peak = snap.total_value
    const drawdown = roundPrice(peak - snap.total_value)
    const drawdownPct = peak > 0 ? roundPrice((drawdown / peak) * 100, 4) : 0
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownPercent = drawdownPct
    }
  }

  const equityCurve = sortedSnapshots.map((s) => ({
    date: s.snapshot_date,
    total_value: s.total_value,
    cash_balance: s.cash_balance,
    positions_value: s.positions_value,
  }))

  if (closedTrades === 0) {
    return {
      total_trades: totalTrades,
      closed_trades: 0,
      win_rate: 0,
      average_win: 0,
      average_loss: 0,
      profit_factor: 0,
      best_trade: null,
      worst_trade: null,
      total_realized_pnl: 0,
      max_drawdown: maxDrawdown,
      max_drawdown_percent: maxDrawdownPercent,
      current_streak: { type: null, count: 0 },
      sharpe_ratio: 0,
      equity_curve: equityCurve,
    }
  }

  // ── Win/Loss split ────────────────────────────────────────────────────────
  const wins  = sellTrades.filter((t) => (t.pnl ?? 0) > 0)
  const losses = sellTrades.filter((t) => (t.pnl ?? 0) <= 0)
  const winRate = roundPrice((wins.length / closedTrades) * 100, 2)

  const avgWin  = wins.length > 0
    ? roundPrice(wins.reduce((s, t) => s + t.pnl, 0) / wins.length)
    : 0
  const avgLoss = losses.length > 0
    ? roundPrice(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
    : 0

  // ── Profit factor ─────────────────────────────────────────────────────────
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0
    ? roundPrice(grossProfit / grossLoss, 4)
    : grossProfit > 0 ? Infinity : 0

  // ── Best / Worst trade ────────────────────────────────────────────────────
  const sorted = [...sellTrades].sort((a, b) => (b.pnl ?? 0) - (a.pnl ?? 0))
  const bestTrade  = sorted[0]  || null
  const worstTrade = sorted[sorted.length - 1] || null

  // ── Total realized P&L ────────────────────────────────────────────────────
  const totalRealizedPnL = roundPrice(
    sellTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
  )

  // (drawdown already computed above)

  // ── Current streak (consecutive wins / losses) ────────────────────────────
  const recentTrades = [...sellTrades].sort((a, b) => b.executed_at - a.executed_at)
  let streak = { type: null, count: 0 }
  if (recentTrades.length > 0) {
    const firstType = (recentTrades[0].pnl ?? 0) > 0 ? 'WIN' : 'LOSS'
    streak = { type: firstType, count: 0 }
    for (const t of recentTrades) {
      const tType = (t.pnl ?? 0) > 0 ? 'WIN' : 'LOSS'
      if (tType === firstType) streak.count++
      else break
    }
  }

  // ── Sharpe ratio approximation (using daily snapshot returns) ─────────────
  let sharpeRatio = 0
  if (sortedSnapshots.length >= 2) {
    const dailyReturns = []
    for (let i = 1; i < sortedSnapshots.length; i++) {
      const prev = sortedSnapshots[i - 1].total_value
      const curr = sortedSnapshots[i].total_value
      if (prev > 0) dailyReturns.push((curr - prev) / prev)
    }
    if (dailyReturns.length > 0) {
      const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / dailyReturns.length
      const stdDev = Math.sqrt(variance)
      const RISK_FREE_RATE_DAILY = 0.0001 // ~2.5% annual
      sharpeRatio = stdDev > 0
        ? roundPrice(((mean - RISK_FREE_RATE_DAILY) / stdDev) * Math.sqrt(252), 4)
        : 0
    }
  }

  return {
    total_trades: totalTrades,
    closed_trades: closedTrades,
    win_rate: winRate,
    winning_trades: wins.length,
    losing_trades: losses.length,
    average_win: avgWin,
    average_loss: avgLoss,
    profit_factor: profitFactor,
    best_trade: bestTrade ? { symbol: bestTrade.symbol, pnl: bestTrade.pnl, pnl_percent: bestTrade.pnl_percent } : null,
    worst_trade: worstTrade ? { symbol: worstTrade.symbol, pnl: worstTrade.pnl, pnl_percent: worstTrade.pnl_percent } : null,
    total_realized_pnl: totalRealizedPnL,
    max_drawdown: maxDrawdown,
    max_drawdown_percent: maxDrawdownPercent,
    current_streak: streak,
    sharpe_ratio: sharpeRatio,
    equity_curve: equityCurve,
  }
}
