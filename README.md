# TradeWise 🕯️

TradeWise is a real-time candlestick pattern recognition, analysis, and simulated trading platform. It helps traders master technical analysis by identifying market trends and patterns dynamically on live and simulated financial charts, coupled with simulated trading capabilities and an interactive learning academy.

---

## 🛠️ Tech Stack

### Frontend (Client)
* **Framework**: [React 18](https://react.dev/)
* **Build Tool**: [Vite 5](https://vitejs.dev/)
* **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
* **Animations**: [Framer Motion 11](https://www.framer.com/motion/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Charting**: [TradingView Lightweight Charts 4](https://tradingview.github.io/lightweight-charts/)

### Backend (Server)
* **Runtime**: [Node.js](https://nodejs.org/)
* **Framework**: [Express.js 4](https://expressjs.com/)

### External APIs & Data
* **Binance WebSockets (WSS)**: Streams real-time cryptocurrency candlestick data.
* **Binance REST API**: Fetches historical candlestick data.
* **Serper Google News API**: Fetches live symbol-specific news updates.

---

## ✨ Main Features

* **Live & Historical Interactive Charting**: Integration of TradingView's Lightweight Charts to plot high-performance candle movements.
* **Pattern Detection Engine**: Automatic real-time detection of candlestick patterns:
  * Doji, Hammer, Inverted Hammer, Hanging Man, Marubozu, Spinning Top.
  * Bullish/Bearish Engulfing, Piercing Line, Dark Cloud Cover.
  * Morning Star, Evening Star, Three White Soldiers, Three Black Crows.
* **Simulated Trading Portfolio**: A mockup portfolio with a starting balance of $10,000 to practice buy/sell triggers.
* **Global Market News & Sentiment Analysis**: Real-time ticker and news listing showing bullish, bearish, or neutral sentiment impact on specific assets.
* **Interactive Learning Hub**: Features structured learning tracks (Beginner, Intermediate, Advanced) with module completion indicators.

---

## 🚀 Installation & Local Setup

Clone the repository and follow the instructions below:

### 1. Backend Server Setup
```bash
cd server
npm install
npm run dev
```
Runs the Express API server on `http://localhost:5000` (supports hot-reloading with native `--watch`).

### 2. Frontend Client Setup
```bash
cd client
npm install
npm run dev
```
Runs the Vite development server on `http://localhost:3000`.

---
