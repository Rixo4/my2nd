export const LEARNING_TOPICS = [
  {
    id: 1,
    title: "Bullish Engulfing Pattern",
    category: "Candlesticks",
    indicator: "Bullish Reversal",
    description: "A two-candle reversal pattern. The first candle is bearish, and the second is a larger bullish candle that completely 'engulfs' the body of the first candle. It indicates buyers have taken control.",
    tip: "Look for this pattern at the bottom of a downtrend to signal a buy entry.",
    reliability: "High"
  },
  {
    id: 2,
    title: "Bearish Engulfing Pattern",
    category: "Candlesticks",
    indicator: "Bearish Reversal",
    description: "A two-candle reversal pattern. The first candle is bullish, and the second is a larger bearish candle that completely 'engulfs' the body of the first candle. It indicates sellers have taken control.",
    tip: "Look for this pattern at the top of an uptrend to signal a sell or exit entry.",
    reliability: "High"
  },
  {
    id: 3,
    title: "Doji Candle",
    category: "Candlesticks",
    indicator: "Indecision",
    description: "A candle with an extremely small body where the open and close are nearly identical. It shows absolute equilibrium between buyers and sellers, often preceding a breakout or trend reversal.",
    tip: "Never trade a Doji in isolation. Wait for the next candle to confirm the breakout direction.",
    reliability: "Medium"
  },
  {
    id: 4,
    title: "Hammer & Inverted Hammer",
    category: "Candlesticks",
    indicator: "Bullish Reversal",
    description: "A single candle pattern with a small body at the top and a long lower shadow (at least 2x the body size). An Inverted Hammer has a long upper shadow. Both signify that sellers pushed price low but buyers rallied back strongly.",
    tip: "The longer the shadow/wick, the stronger the rejection of lower prices.",
    reliability: "Medium-High"
  },
  {
    id: 5,
    title: "Support and Resistance Levels",
    category: "Chart Patterns",
    indicator: "Key Levels",
    description: "Support is the price level where a downtrend tends to pause due to a concentration of demand (buying power). Resistance is the level where an uptrend tends to pause due to a concentration of supply (selling power).",
    tip: "Draw key levels on higher timeframes (like 1d or 4h) for maximum reliability.",
    reliability: "Very High"
  },
  {
    id: 6,
    title: "Double Top & Double Bottom",
    category: "Chart Patterns",
    indicator: "Trend Reversal",
    description: "A Double Top resembles the letter 'M' and signifies a failed attempt to break resistance twice, indicating a bearish reversal. A Double Bottom resembles a 'W' and signifies a failed attempt to break support twice, indicating a bullish reversal.",
    tip: "Only enter the trade when price breaks the 'neckline' connecting the peaks/troughs.",
    reliability: "High"
  },
  {
    id: 7,
    title: "The 2% Risk Management Rule",
    category: "Risk Management",
    indicator: "Capital Preservation",
    description: "A gold standard rule where a trader never risks more than 2% of their total trading capital on any single trade. This is calculated using the distance from entry to stop-loss multiplied by position size.",
    tip: "Proper position sizing ensures that a string of losses won't wipe out your account.",
    reliability: "Essential"
  },
  {
    id: 8,
    title: "Risk-to-Reward Ratio (R:R)",
    category: "Risk Management",
    indicator: "Profitability",
    description: "The ratio of potential loss to potential gain. For example, a 1:2 R:R means you risk $100 to gain $200. This ensures that even if you win only 40% of your trades, you remain profitable.",
    tip: "Always target a minimum of 1:2 or 1:3 R:R for high-probability setups.",
    reliability: "Essential"
  }
]
