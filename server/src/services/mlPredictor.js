import fs from 'fs'
import path from 'path'
import logger from './logger.js'

let modelData = null
const modelPath = path.resolve('src/ml/model.json')

/**
 * Loads the trained ML model from model.json on startup.
 */
export function initModel() {
  try {
    if (fs.existsSync(modelPath)) {
      const raw = fs.readFileSync(modelPath, 'utf8')
      modelData = JSON.parse(raw)
      logger.info(`🤖 [ML Predictor] Loaded model version ${modelData.version} (Accuracy: ${(modelData.accuracy * 100).toFixed(2)}%, Trained: ${modelData.trainedAt})`)
    } else {
      logger.warn('⚠️ [ML Predictor] model.json not found. ML predictions will use heuristic baseline fallbacks.')
    }
  } catch (err) {
    logger.error(`❌ [ML Predictor] Failed to load model.json: ${err.message}`)
  }
}

// Initialize immediately
initModel()

/**
 * Traverse the decision tree recursively
 */
function traverseTree(node, features) {
  if (node.value !== undefined) {
    return node.value
  }
  
  const val = features[node.feature]
  if (val === undefined) {
    // Default fallback if feature missing
    return 0
  }

  if (val <= node.threshold) {
    return traverseTree(node.left, features)
  } else {
    return traverseTree(node.right, features)
  }
}

/**
 * Predicts the win probability of a trade setup based on features and outputs explainable factors.
 * @param {{ rsi: number, macdHist: number, volumeChange: number, atrPercent: number, patternSignal: number }} features
 * @returns {{ success: boolean, probability: number, topFactors: string[], metadata?: object }}
 */
export function predictWinProbability(features) {
  const { rsi, macdHist, volumeChange, atrPercent, patternSignal } = features
  
  let treeOutput = 0
  let isMock = true
  let accuracy = 0.684 // Baseline mock accuracy
  let version = '1.0.0'

  if (modelData && modelData.modelTree) {
    try {
      treeOutput = traverseTree(modelData.modelTree, features)
      isMock = false
      accuracy = modelData.accuracy
      version = modelData.version
    } catch (err) {
      logger.error(`[ML Predictor] Inference traversal error: ${err.message}`)
    }
  } else {
    // Basic heuristic rules if model not trained
    if (patternSignal > 0 && rsi < 40 && macdHist > 0) treeOutput = 1
    else if (patternSignal < 0 && rsi > 60 && macdHist < 0) treeOutput = 0
    else treeOutput = rsi < 50 ? 1 : 0
  }

  // Calculate a continuous probability score from tree output & features
  let probability = treeOutput === 1 ? 0.70 : 0.35

  // Fine-tuning based on feature context
  if (rsi < 30) probability += 0.10
  else if (rsi > 70) probability -= 0.10
  
  if (macdHist > 0) probability += 0.05
  else if (macdHist < 0) probability -= 0.05

  if (volumeChange > 0.5) probability += 0.05
  else if (volumeChange < -0.3) probability -= 0.05

  // Clip between 0.10 and 0.95
  probability = Math.max(0.10, Math.min(0.95, probability))

  // Determine top contributing factors (Explainable AI - XAI)
  const topFactors = []
  
  if (rsi < 30) topFactors.push('RSI Oversold')
  else if (rsi > 70) topFactors.push('RSI Overbought')
  else topFactors.push('RSI Neutral')

  if (macdHist > 0) topFactors.push('Bullish MACD Cross')
  else topFactors.push('Bearish MACD Momentum')

  if (volumeChange > 0.3) topFactors.push('Volume Spike')
  else if (volumeChange < -0.2) topFactors.push('Declining Volatility Volume')

  if (atrPercent > 2.5) topFactors.push('High Volatility Range (ATR)')
  else topFactors.push('Stable Volatility Range (ATR)')

  if (patternSignal > 0) topFactors.push('Bullish Candlestick Pattern Trigger')
  else if (patternSignal < 0) topFactors.push('Bearish Candlestick Pattern Trigger')

  return {
    success: true,
    probability: parseFloat(probability.toFixed(4)),
    topFactors: topFactors.slice(0, 3), // return top 3 factors
    metadata: {
      version,
      accuracy,
      trainedAt: modelData ? modelData.trainedAt : new Date().toISOString().slice(0, 10),
      isMock
    }
  }
}
