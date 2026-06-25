import { getCandles } from './marketScanner.js'
import { computeTechnicalSummary } from './technicalIndicators.js'
import logger from './logger.js'

/**
 * Calculates Sharpe and Sortino ratios for backtest trade returns.
 */
function calculateBacktestMetrics(trades, dailyValues, initialCapital) {
  const totalTrades = trades.length
  const closedTrades = trades.filter(t => t.status === 'CLOSED')
  
  if (closedTrades.length === 0) {
    return {
      winRate: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      profitFactor: 0,
      maxDrawdownPercent: 0,
      totalPnL: 0,
      roiPercent: 0
    }
  }

  const wins = closedTrades.filter(t => t.pnl > 0)
  const losses = closedTrades.filter(t => t.pnl <= 0)
  const winRate = (wins.length / closedTrades.length) * 100

  // Profit Factor
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit > 0 ? Infinity : 0

  // Drawdown calculation from daily values curve
  let peak = initialCapital
  let maxDD = 0
  for (const val of dailyValues) {
    if (val > peak) peak = val
    const dd = peak - val
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0
    if (ddPct > maxDD) maxDD = ddPct
  }

  // Sharpe & Sortino via daily returns
  let sharpe = 0
  let sortino = 0
  if (dailyValues.length >= 2) {
    const dailyReturns = []
    for (let i = 1; i < dailyValues.length; i++) {
      const prev = dailyValues[i - 1]
      const curr = dailyValues[i]
      if (prev > 0) dailyReturns.push((curr - prev) / prev)
    }

    if (dailyReturns.length > 0) {
      const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      const variance = dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / dailyReturns.length
      const stdDev = Math.sqrt(variance)
      const RISK_FREE_DAILY = 0.0001 // baseline proxy

      sharpe = stdDev > 0 ? ((mean - RISK_FREE_DAILY) / stdDev) * Math.sqrt(252) : 0

      const downsideReturns = dailyReturns.filter(r => r < RISK_FREE_DAILY)
      const downsideVariance = downsideReturns.length > 0
        ? downsideReturns.reduce((s, r) => s + Math.pow(r - RISK_FREE_DAILY, 2), 0) / dailyReturns.length
        : 0
      const downsideStdDev = Math.sqrt(downsideVariance)
      
      sortino = downsideStdDev > 0 ? ((mean - RISK_FREE_DAILY) / downsideStdDev) * Math.sqrt(252) : 0
    }
  }

  const finalVal = dailyValues[dailyValues.length - 1] || initialCapital
  const totalPnL = finalVal - initialCapital
  const roiPercent = (totalPnL / initialCapital) * 100

  return {
    winRate: parseFloat(winRate.toFixed(2)),
    sharpeRatio: parseFloat(sharpe.toFixed(4)),
    sortinoRatio: parseFloat(sortino.toFixed(4)),
    profitFactor: parseFloat(profitFactor.toFixed(4)),
    maxDrawdownPercent: parseFloat(maxDD.toFixed(2)),
    totalPnL: parseFloat(totalPnL.toFixed(2)),
    roiPercent: parseFloat(roiPercent.toFixed(2))
  }
}

/**
 * Calculates RSI indicator values for backtest indices.
 */
function calculateRSI(closes, period = 14) {
  if (closes.length < period + 1) return 50
  
  let gains = 0
  let losses = 0
  
  for (let i = closes.length - period; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) gains += diff
    else losses += Math.abs(diff)
  }
  
  const rs = losses > 0 ? (gains / period) / (losses / period) : 100
  return 100 - (100 / (1 + rs))
}

/**
 * Simulates a strategy backtest.
 * @param {object} params
 * @returns {Promise<object>}
 */
export async function runBacktest({
  symbol,
  strategyName = 'RSI',
  parameters = { rsiLower: 30, rsiUpper: 70, takeProfit: 0.05, stopLoss: 0.03 },
  commissionRate = 0.001, // 0.1% fee
  slippagePercent = 0.0005, // 0.05% slippage
  initialCapital = 10000
}) {
  const sym = symbol.toUpperCase()
  logger.info(`[Backtester] Initializing ${strategyName} strategy backtest on ${sym} with Slippage ${slippagePercent * 100}% & Commission ${commissionRate * 100}%`)

  // Fetch 200 daily candles for comprehensive testing
  let candles = await getCandles(sym, 200)
  if (!candles || candles.length < 30) {
    logger.warn(`[Backtester] Insufficient live candles for ${sym}, generating mock historical backtest candles.`)
    const basePrice = sym === 'BTC' ? 64000 : sym === 'ETH' ? 3500 : sym === 'AAPL' ? 175 : 1.10
    candles = Array.from({ length: 150 }, (_, idx) => {
      const factor = 1 + (Math.sin(idx / 10) * 0.04) + (Math.random() * 0.02 - 0.01)
      const close = basePrice * factor
      return {
        open: close * 0.995,
        high: close * 1.01,
        low: close * 0.99,
        close,
        volume: 10000 + Math.random() * 20000
      }
    })
  }

  let capital = initialCapital
  let positionQty = 0
  let entryPrice = 0
  let entryTime = 0
  const trades = []
  const dailyValues = []

  const rsiLower = Number(parameters.rsiLower || 30)
  const rsiUpper = Number(parameters.rsiUpper || 70)
  const takeProfit = Number(parameters.takeProfit || 0.05)
  const stopLoss = Number(parameters.stopLoss || 0.03)

  // Skip the first 14 candles to build RSI history
  for (let i = 0; i < candles.length; i++) {
    const currentCandle = candles[i]
    const closesSlice = candles.slice(0, i + 1).map(c => c.close)
    const rsi = calculateRSI(closesSlice, 14)

    // Check existing positions for SL / TP exits
    if (positionQty > 0) {
      const currentPrice = currentCandle.close
      const pnlPct = (currentPrice - entryPrice) / entryPrice

      if (pnlPct >= takeProfit || pnlPct <= -stopLoss) {
        // Exit triggered by risk constraints
        const exitPrice = currentPrice * (1 - slippagePercent)
        const grossValue = positionQty * exitPrice
        const fee = grossValue * commissionRate
        const finalCash = grossValue - fee
        const tradePnL = finalCash - (positionQty * entryPrice * (1 + commissionRate))

        capital = finalCash
        positionQty = 0

        trades.push({
          id: `backtest-trade-${trades.length}`,
          side: 'SELL',
          entryPrice,
          exitPrice,
          quantity: positionQty,
          pnl: parseFloat(tradePnL.toFixed(4)),
          pnl_percent: parseFloat((pnlPct * 100).toFixed(2)),
          exitReason: pnlPct >= takeProfit ? 'TAKE_PROFIT' : 'STOP_LOSS',
          status: 'CLOSED'
        })
      }
    }

    // Apply strategy signals
    if (positionQty === 0 && i >= 14) {
      if (rsi < rsiLower) {
        // BUY Signal
        entryPrice = currentCandle.close * (1 + slippagePercent)
        const fee = capital * commissionRate
        const tradeCapital = capital - fee
        positionQty = tradeCapital / entryPrice
        entryTime = i

        trades.push({
          id: `backtest-trade-${trades.length}`,
          side: 'BUY',
          entryPrice,
          quantity: positionQty,
          status: 'OPEN'
        })
        capital = 0
      }
    } else if (positionQty > 0 && i > entryTime) {
      if (rsi > rsiUpper) {
        // SELL Signal
        const exitPrice = currentCandle.close * (1 - slippagePercent)
        const grossValue = positionQty * exitPrice
        const fee = grossValue * commissionRate
        const finalCash = grossValue - fee
        const tradePnL = finalCash - (positionQty * entryPrice * (1 + commissionRate))
        const pnlPct = (exitPrice - entryPrice) / entryPrice

        capital = finalCash
        positionQty = 0

        // Find and update the open trade
        const openTrade = trades.find(t => t.status === 'OPEN')
        if (openTrade) {
          openTrade.exitPrice = exitPrice
          openTrade.pnl = parseFloat(tradePnL.toFixed(4))
          openTrade.pnl_percent = parseFloat((pnlPct * 100).toFixed(2))
          openTrade.exitReason = 'STRATEGY_SIGNAL'
          openTrade.status = 'CLOSED'
        }
      }
    }

    // Calculate current account equity value
    const currentEquity = positionQty > 0 ? (positionQty * currentCandle.close) : capital
    dailyValues.push(currentEquity)
  }

  // Force close any remaining open position at the end
  if (positionQty > 0) {
    const finalCandle = candles[candles.length - 1]
    const exitPrice = finalCandle.close * (1 - slippagePercent)
    const grossValue = positionQty * exitPrice
    const fee = grossValue * commissionRate
    const finalCash = grossValue - fee
    const tradePnL = finalCash - (positionQty * entryPrice * (1 + commissionRate))
    const pnlPct = (exitPrice - entryPrice) / entryPrice

    capital = finalCash
    positionQty = 0

    const openTrade = trades.find(t => t.status === 'OPEN')
    if (openTrade) {
      openTrade.exitPrice = exitPrice
      openTrade.pnl = parseFloat(tradePnL.toFixed(4))
      openTrade.pnl_percent = parseFloat((pnlPct * 100).toFixed(2))
      openTrade.exitReason = 'END_OF_SERIES'
      openTrade.status = 'CLOSED'
    }
  }

  const metrics = calculateBacktestMetrics(trades, dailyValues, initialCapital)

  return {
    success: true,
    symbol: sym,
    strategyName,
    metrics,
    trades: trades.filter(t => t.status === 'CLOSED'),
    totalCandles: candles.length
  }
}
