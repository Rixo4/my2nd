import { getPortfolio } from '../trading/paper_trading/models.js'
import { fetchLivePrice } from '../trading/paper_trading/executors.js'

// Simple mock fallback ATRs per symbol since calculating true ATR requires 14 periods of full history
const SYMBOL_ATRS = {
  AAPL: 4.5,
  MSFT: 8.2,
  GOOGL: 3.8,
  BTC: 1800,
  ETH: 95,
  EURUSD: 0.0075,
  GBPUSD: 0.0090
}

/**
 * Calculate the risk-adjusted optimal position size before submitting a trade.
 * Formula:
 * Position Size = (Account Risk $ / Stop Loss Points) * (Pattern Win Rate / 50%) * (Volatility Multiplier)
 * 
 * @param {object} params
 * @param {string} params.portfolioId
 * @param {string} params.symbol
 * @param {number} params.riskPercent - E.g. 1 for 1% of account
 * @param {string} params.patternName
 * @param {number} params.patternWinRate - Win rate percentage, e.g. 60
 * @returns {Promise<object>}
 */
export async function calculatePositionSize({ portfolioId, symbol, riskPercent = 1, patternName = '', patternWinRate = 50 }) {
  const portfolio = await getPortfolio(portfolioId)
  if (!portfolio) {
    throw new Error('Portfolio not found')
  }

  const symbolUpper = symbol.toUpperCase()
  const livePrice = await fetchLivePrice(symbolUpper)
  if (!livePrice) {
    throw new Error(`Unable to fetch live price for ${symbolUpper}`)
  }

  const equity = portfolio.total_equity || portfolio.cash_balance
  const riskAmount = (equity * (riskPercent / 100))

  // Estimate ATR (Average True Range) as volatility metric
  const atr = SYMBOL_ATRS[symbolUpper] || (livePrice * 0.02) // default to 2% of price

  // Set stop loss points as a multiple of ATR (typically 1.5x to 2x ATR)
  const atrMultiplier = 1.5
  const stopLossPoints = atr * atrMultiplier

  // Win rate ratio relative to standard 50%
  const winRateRatio = (patternWinRate || 50) / 50

  // Volatility multiplier: reduce position sizes during extremely high volatility (relative to price)
  const volRatio = atr / livePrice
  let volatilityMultiplier = 1.0
  if (volRatio > 0.05) {
    volatilityMultiplier = 0.7 // High volatility check
  } else if (volRatio > 0.03) {
    volatilityMultiplier = 0.85
  }

  // Calculate position quantity
  let quantity = (riskAmount / stopLossPoints) * winRateRatio * volatilityMultiplier

  // Bound decimals depending on asset type (crypto vs stock/forex)
  const isForex = ['EURUSD', 'GBPUSD'].includes(symbolUpper)
  const isCrypto = ['BTC', 'ETH'].includes(symbolUpper)
  
  let decimals = 2
  if (isCrypto) decimals = 4
  if (isForex) decimals = 0 // Forex is traded in units/lots, e.g. 10000

  quantity = Number(quantity.toFixed(decimals))
  if (quantity <= 0) {
    quantity = isCrypto ? 0.0001 : 1
  }

  const totalCost = quantity * livePrice
  const maxAffordableQty = portfolio.cash_balance / livePrice
  const fitsCash = totalCost <= portfolio.cash_balance

  return {
    symbol: symbolUpper,
    price: livePrice,
    equity,
    riskAmount: Number(riskAmount.toFixed(2)),
    atr: Number(atr.toFixed(4)),
    stopLossPoints: Number(stopLossPoints.toFixed(4)),
    volatilityMultiplier,
    suggestedQuantity: fitsCash ? quantity : Number((maxAffordableQty * 0.95).toFixed(decimals)),
    suggestedCost: Number((fitsCash ? quantity : maxAffordableQty * 0.95).toFixed(decimals)) * livePrice,
    fitsCash,
    patternName,
    patternWinRate
  }
}
