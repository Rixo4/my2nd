/**
 * Candlestick Pattern Detection Engine
 * All functions take OHLC candle objects: { open, high, low, close }
 */

const bodySize = c => Math.abs(c.close - c.open)
const range = c => c.high - c.low
const upperWick = c => c.high - Math.max(c.open, c.close)
const lowerWick = c => Math.min(c.open, c.close) - c.low
const isBullish = c => c.close > c.open
const isBearish = c => c.close < c.open
const midpoint = c => (c.open + c.close) / 2

// ─── Trend Context Helpers ──────────────────────────────────────────
function getTrendContext(candles, index, length = 5) {
  if (index < length) return 'neutral'
  const slice = candles.slice(index - length, index)
  const start = slice[0].close
  const end = slice[slice.length - 1].close
  const diff = ((end - start) / start) * 100
  if (diff > 0.5) return 'uptrend'
  if (diff < -0.5) return 'downtrend'
  return 'sideways'
}

// ─── Single-Candle Patterns ────────────────────────────────────────────────

export function isDoji(c) {
  const r = range(c)
  if (r === 0) return false
  // Stricter Doji: Body must be less than 5% of range
  return bodySize(c) <= 0.05 * r && r > (c.close * 0.001) // Avoid noise in tiny candles
}

export function isHammer(c, trend) {
  if (trend !== 'downtrend') return false // Hammers only matter after a downtrend
  const r = range(c)
  if (r === 0) return false
  const body = bodySize(c)
  const lw = lowerWick(c)
  const uw = upperWick(c)
  // Lower shadow must be at least 2x body, upper shadow must be tiny
  return body <= 0.25 * r && lw >= 2 * body && uw <= 0.05 * r
}

export function isShootingStar(c, trend) {
  if (trend !== 'uptrend') return false // Shooting stars only matter after an uptrend
  const r = range(c)
  if (r === 0) return false
  const body = bodySize(c)
  const uw = upperWick(c)
  const lw = lowerWick(c)
  return isBearish(c) && body <= 0.25 * r && uw >= 2 * body && lw <= 0.05 * r
}

export function isHangingMan(c) {
  const r = range(c)
  if (r === 0) return false
  const body = bodySize(c)
  const lw = lowerWick(c)
  const uw = upperWick(c)
  return isBearish(c) && body <= 0.3 * r && lw >= 2.5 * body && uw <= 0.1 * r
}

export function isMarubozu(c) {
  const r = range(c)
  if (r === 0) return false
  return bodySize(c) >= 0.92 * r
}

export function isSpinningTop(c) {
  const r = range(c)
  if (r === 0) return false
  const body = bodySize(c)
  const lw = lowerWick(c)
  const uw = upperWick(c)
  return body <= 0.25 * r && lw >= 0.2 * r && uw >= 0.2 * r
}

// ─── Two-Candle Patterns ────────────────────────────────────────────────────

export function isBullishEngulfing(prev, curr, trend) {
  if (trend !== 'downtrend') return false
  const body1 = bodySize(prev)
  const body2 = bodySize(curr)
  return (
    isBearish(prev) &&
    isBullish(curr) &&
    curr.open <= prev.close &&
    curr.close >= prev.open &&
    body2 > body1 * 1.2 // Second body should be clearly larger
  )
}

export function isBearishEngulfing(prev, curr, trend) {
  if (trend !== 'uptrend') return false
  const body1 = bodySize(prev)
  const body2 = bodySize(curr)
  return (
    isBullish(prev) &&
    isBearish(curr) &&
    curr.open >= prev.close &&
    curr.close <= prev.open &&
    body2 > body1 * 1.2
  )
}

export function isPiercingLine(prev, curr) {
  return (
    isBearish(prev) &&
    isBullish(curr) &&
    curr.open < prev.low &&
    curr.close > midpoint(prev) &&
    curr.close < prev.open
  )
}

export function isDarkCloudCover(prev, curr) {
  return (
    isBullish(prev) &&
    isBearish(curr) &&
    curr.open > prev.high &&
    curr.close < midpoint(prev) &&
    curr.close > prev.open
  )
}

// ─── Three-Candle Patterns ──────────────────────────────────────────────────

export function isMorningStar(c1, c2, c3, trend) {
  if (trend !== 'downtrend') return false
  return (
    isBearish(c1) &&
    bodySize(c2) <= 0.3 * range(c2) &&
    isBullish(c3) &&
    c3.close > midpoint(c1)
  )
}

export function isEveningStar(c1, c2, c3, trend) {
  if (trend !== 'uptrend') return false
  return (
    isBullish(c1) &&
    bodySize(c2) <= 0.3 * range(c2) &&
    isBearish(c3) &&
    c3.close < midpoint(c1)
  )
}

export function isThreeWhiteSoldiers(c1, c2, c3) {
  return (
    isBullish(c1) && isBullish(c2) && isBullish(c3) &&
    c2.open > c1.open && c2.close > c1.close &&
    c3.open > c2.open && c3.close > c2.close &&
    bodySize(c1) > 0.5 * range(c1) &&
    bodySize(c2) > 0.5 * range(c2) &&
    bodySize(c3) > 0.5 * range(c3)
  )
}

export function isThreeBlackCrows(c1, c2, c3) {
  return (
    isBearish(c1) && isBearish(c2) && isBearish(c3) &&
    c2.open < c1.open && c2.close < c1.close &&
    c3.open < c2.open && c3.close < c2.close &&
    bodySize(c1) > 0.5 * range(c1) &&
    bodySize(c2) > 0.5 * range(c2) &&
    bodySize(c3) > 0.5 * range(c3)
  )
}

// ─── Confidence Score ───────────────────────────────────────────────────────

function confidence(base, bonus = 0) {
  return Math.min(98, Math.max(52, base + bonus + Math.floor(Math.random() * 12)))
}

// ─── Full Scan ──────────────────────────────────────────────────────────────

// ─── Trend Detection Logic ──────────────────────────────────────────
export function detectTrend(candles) {
  if (candles.length < 20) return 'Analyzing...'
  const last20 = candles.slice(-20)
  const firstAvg = (last20[0].close + last20[5].close) / 2
  const lastAvg = (last20[14].close + last20[19].close) / 2

  const diff = ((lastAvg - firstAvg) / firstAvg) * 100
  // Use 0.3% threshold to work for both 1-minute mock data and real crypto/stock data
  if (diff > 0.3) return 'Uptrend'
  if (diff < -0.3) return 'Downtrend'
  return 'Sideways'
}

// ─── Trade Suggestion Logic ──────────────────────────────────────────
function calculateTradeSignals(pattern, candle) {
  const { open, close, high, low } = candle
  const range = high - low
  
  if (pattern.signal === 'bullish') {
    return {
      entry: close + (range * 0.1),
      stopLoss: low - (range * 0.2),
      target: close + (range * 2.5)
    }
  } else if (pattern.signal === 'bearish') {
    return {
      entry: close - (range * 0.1),
      stopLoss: high + (range * 0.2),
      target: close - (range * 2.5)
    }
  }
  return null
}

// ─── Pattern Detection Engine ────────────────────────────────────────
export function detectPatterns(candles) {
  const results = []
  const n = candles.length
  const currentTrend = detectTrend(candles)

  for (let i = 2; i < n; i++) {
    const c = candles[i]
    const p = candles[i - 1]
    const pp = candles[i - 2]
    const time = c.time
    
    // Calculate immediate trend context for this candle
    const trendCtx = getTrendContext(candles, i)
    
    let found = null

    // Priority Check: Stars > Engulfing > Single Patterns
    if (i >= 4) {
      if (isMorningStar(pp, p, c, trendCtx)) found = { time, times: [pp.time, p.time, c.time], pattern: 'Morning Star', signal: 'bullish', confidence: 85, successRate: 78 }
      else if (isEveningStar(pp, p, c, trendCtx)) found = { time, times: [pp.time, p.time, c.time], pattern: 'Evening Star', signal: 'bearish', confidence: 85, successRate: 76 }
    }

    if (!found) {
      if (isBullishEngulfing(p, c, trendCtx)) found = { time, times: [p.time, c.time], pattern: 'Bullish Engulfing', signal: 'bullish', confidence: 80, successRate: 74 }
      else if (isBearishEngulfing(p, c, trendCtx)) found = { time, times: [p.time, c.time], pattern: 'Bearish Engulfing', signal: 'bearish', confidence: 80, successRate: 72 }
    }

    if (!found) {
      if (isHammer(c, trendCtx)) found = { time, times: [c.time], pattern: 'Hammer', signal: 'bullish', confidence: 72, successRate: 68 }
      else if (isShootingStar(c, trendCtx)) found = { time, times: [c.time], pattern: 'Shooting Star', signal: 'bearish', confidence: 70, successRate: 65 }
      else if (isDoji(c)) found = { time, times: [c.time], pattern: 'Doji', signal: 'neutral', confidence: 60, successRate: 54 }
    }

    if (found) {
      // Bonus confidence for trend alignment
      if ((found.signal === 'bullish' && currentTrend === 'Uptrend') || 
          (found.signal === 'bearish' && currentTrend === 'Downtrend')) {
        found.confidence += 5
      }
      
      found.signals = calculateTradeSignals(found, c)
      found.explanation = getExplanation(found.pattern)
      results.push({ ...found, candle: c })
    }
  }
  return results.reverse()
}

function getExplanation(name) {
  const explanations = {
    'Hammer': 'Buyers are taking control after a price drop. Sellers tried to push lower but failed.',
    'Doji': 'The market is in complete indecision. Bulls and bears are equal. Wait for a breakout.',
    'Bullish Engulfing': 'Strong buying surge has completely overwhelmed the previous selling pressure.',
    'Bearish Engulfing': 'Sellers have taken complete control, swallowing up all recent gains.',
    'Morning Star': 'A dawn of a new uptrend. After a dark period, buyers have decisively returned.',
    'Evening Star': 'The party is over for the bulls. Bears have crashed the trend at the peak.'
  }
  return explanations[name] || 'A significant price action formation signaling a potential move.'
}

// ─── Pattern Library Definitions ────────────────────────────────────────────

export const PATTERN_LIBRARY = [
  { 
    id: 'hammer',
    name: 'Hammer',             
    signal: 'bullish', 
    reliability: 'High',   
    candles: 1, 
    description: 'Small body, long lower wick. Buyers pushed back hard after a bearish session.',
    howItWorks: 'The price drops significantly during the session, but buyers step in and push it back up near the opening price. This shows that sellers are losing control and a bottom may be forming.',
    whatToDo: 'Wait for the next candle to close above the hammer’s body for confirmation. Set a stop-loss below the low of the hammer.',
    image: 'https://images.unsplash.com/photo-1611974717482-4824d673893c?auto=format&fit=crop&q=80&w=1200'
  },
  { 
    id: 'doji',
    name: 'Doji',               
    signal: 'neutral', 
    reliability: 'Medium', 
    candles: 1, 
    description: 'Open and close are nearly equal. Signals extreme market indecision.',
    howItWorks: 'Both bulls and bears fought for control, but neither could sustain a move by the session end. It often appears at the end of a trend, signaling a potential reversal.',
    whatToDo: 'Look for the next candle’s direction. A bullish candle after a Doji at a bottom is a strong buy; a bearish candle after a Doji at a top is a sell signal.',
    image: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=1200'
  },
  { 
    id: 'bullish-engulfing',
    name: 'Bullish Engulfing',  
    signal: 'bullish', 
    reliability: 'High',   
    candles: 2, 
    description: 'Large green candle fully engulfs the prior red candle.',
    howItWorks: 'The first candle is bearish, following a downtrend. The second candle opens lower but rallies strongly to close above the first candle’s open, signaling a complete shift in sentiment.',
    whatToDo: 'Consider a long position at the close of the engulfing candle. Place stop-loss below the second candle’s low.',
    image: 'https://images.unsplash.com/photo-1611974717482-4824d673893c?auto=format&fit=crop&q=80&w=1200'
  },
  { 
    id: 'bearish-engulfing',
    name: 'Bearish Engulfing',  
    signal: 'bearish', 
    reliability: 'High',   
    candles: 2, 
    description: 'Large red candle swallows the prior green candle.',
    howItWorks: 'The first candle is bullish, continuing an uptrend. The second candle opens higher but crashes to close below the first candle’s open, showing sellers have taken complete control.',
    whatToDo: 'Look for short opportunities at the close of the bearish candle. Stop-loss goes above the high of the engulfing candle.',
    image: 'https://images.unsplash.com/photo-1642790103517-18129f1ef3ca?auto=format&fit=crop&q=80&w=1200'
  },
  { 
    id: 'morning-star',
    name: 'Morning Star',       
    signal: 'bullish', 
    reliability: 'High',   
    candles: 3, 
    description: 'A 3-candle reversal pattern signaling the end of a downtrend.',
    howItWorks: '1. Large bearish candle. 2. Small "star" candle (indecision). 3. Large bullish candle that closes deep within the first candle’s body. It signals a dawn of a new uptrend.',
    whatToDo: 'Enter long after the third candle closes. This is a high-probability reversal signal.',
    image: 'https://images.unsplash.com/photo-1611974717482-4824d673893c?auto=format&fit=crop&q=80&w=1200'
  },
  { 
    id: 'evening-star',
    name: 'Evening Star',       
    signal: 'bearish', 
    reliability: 'High',   
    candles: 3, 
    description: 'A 3-candle topping pattern signaling the start of a downtrend.',
    howItWorks: '1. Large bullish candle. 2. Small "star" (indecision). 3. Large bearish candle closing well into the first candle’s body. Sellers are now in command.',
    whatToDo: 'Enter short at the close of the third candle. Ideal for swing traders looking to catch the start of a drop.',
    image: 'https://images.unsplash.com/photo-1642790103517-18129f1ef3ca?auto=format&fit=crop&q=80&w=1200'
  },
  { 
    id: 'shooting-star',
    name: 'Shooting Star',      
    signal: 'bearish', 
    reliability: 'High',   
    candles: 1, 
    description: 'Long upper wick, small body at the bottom after an uptrend.',
    howItWorks: 'Buyers pushed the price to a new high, but sellers rejected it sharply, pushing it back down. This indicates that buyers are exhausted.',
    whatToDo: 'Look for a bearish confirmation candle. This is a classic "Sell the Top" signal.',
    image: 'https://images.unsplash.com/photo-1642790103517-18129f1ef3ca?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'inverted-hammer',
    name: 'Inverted Hammer',    
    signal: 'bullish', 
    reliability: 'Medium', 
    candles: 1, 
    description: 'Long upper wick after a downtrend. Potential reversal up.',
    howItWorks: 'Buyers tried to rally during the session but were pushed back. Unlike the shooting star, this happens at a bottom, signaling that buyers are starting to test the waters.',
    whatToDo: 'Buy only after a bullish confirmation candle follows the inverted hammer.',
    image: 'https://images.unsplash.com/photo-1611974717482-4824d673893c?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'hanging-man',
    name: 'Hanging Man',        
    signal: 'bearish', 
    reliability: 'Medium', 
    candles: 1, 
    description: 'Long lower wick appearing at the top of an uptrend.',
    howItWorks: 'It looks like a hammer, but at the top. The long lower wick shows that sellers started to overwhelm buyers at some point in the session, even if buyers pushed it back.',
    whatToDo: 'Proceed with caution. A bearish close on the next candle is required to confirm the downtrend.',
    image: 'https://images.unsplash.com/photo-1642790103517-18129f1ef3ca?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'piercing-line',
    name: 'Piercing Line',      
    signal: 'bullish', 
    reliability: 'Medium', 
    candles: 2, 
    description: 'Bullish candle closes above the midpoint of the prior bearish candle.',
    howItWorks: 'Following a downtrend, the second candle gaps down but rallies aggressively to pierce halfway into the previous red candle. Bulls are reclaiming ground.',
    whatToDo: 'Entry at the close of the piercing candle. Moderate risk, high reward potential.',
    image: 'https://images.unsplash.com/photo-1611974717482-4824d673893c?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'dark-cloud-cover',
    name: 'Dark Cloud Cover',   
    signal: 'bearish', 
    reliability: 'Medium', 
    candles: 2, 
    description: 'Red candle closes deep into the prior bullish candle.',
    howItWorks: 'Opens above the high of the green candle but closes deep within its body. It’s the bearish equivalent of the piercing line.',
    whatToDo: 'Exit long positions or enter short after the red candle closes. Indicates a storm coming.',
    image: 'https://images.unsplash.com/photo-1642790103517-18129f1ef3ca?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'three-white-soldiers',
    name: 'Three White Soldiers', 
    signal: 'bullish', 
    reliability: 'High', 
    candles: 3, 
    description: 'Three consecutive long bullish candles after a downtrend.',
    howItWorks: 'Each candle opens within the previous body and closes at a new high. It shows steady, relentless buying pressure and the start of a strong uptrend.',
    whatToDo: 'Wait for a small pullback to enter long. This is a very strong confirmation of trend change.',
    image: 'https://images.unsplash.com/photo-1611974717482-4824d673893c?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'three-black-crows',
    name: 'Three Black Crows',  
    signal: 'bearish', 
    reliability: 'High',   
    candles: 3, 
    description: 'Three strong bearish candles in a row signaling a crash.',
    howItWorks: 'The polar opposite of Three White Soldiers. Sellers are liquidating aggressively, with each candle closing lower than the previous.',
    whatToDo: 'Avoid buying. Look for short entries on retracements. The trend is decisively bearish.',
    image: 'https://images.unsplash.com/photo-1642790103517-18129f1ef3ca?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'spinning-top',
    name: 'Spinning Top',       
    signal: 'neutral', 
    reliability: 'Low',    
    candles: 1, 
    description: 'Small body with long wicks on both sides. Consolidation likely.',
    howItWorks: 'High volatility but little movement in the actual closing price. It represents a state of equilibrium between buyers and sellers.',
    whatToDo: 'Wait and watch. A breakout from the spinning top’s range will determine the next trend.',
    image: 'https://images.unsplash.com/photo-1642790103517-18129f1ef3ca?auto=format&fit=crop&q=80&w=800'
  },
  { 
    id: 'marubozu',
    name: 'Marubozu',          
    signal: 'bullish', 
    reliability: 'High',   
    candles: 1, 
    description: 'Full body with no wicks. Pure momentum signal.',
    howItWorks: 'The price opened at one extreme and closed at the other, without any price rejection in between. Complete dominance by one side.',
    whatToDo: 'In a bullish Marubozu, enter long. In a bearish Marubozu, exit or short. Momentum is on your side.',
    image: 'https://images.unsplash.com/photo-1611974717482-4824d673893c?auto=format&fit=crop&q=80&w=800'
  },
]
