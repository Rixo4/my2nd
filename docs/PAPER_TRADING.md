# Paper Trading API — Documentation

> A full paper trading simulation engine built into the TradeWise server.  
> Allows users to practice trading with virtual money using real candlestick data patterns.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Request / Response Examples](#request--response-examples)
- [Running Tests](#running-tests)
- [Configuration](#configuration)
- [Database Schema](#database-schema)

---

## Getting Started

### Prerequisites

```bash
cd server
npm install better-sqlite3 uuid
npm install --save-dev vitest @vitest/coverage-v8
```

### Start the Server

```bash
npm run dev
```

The SQLite database is **auto-created** at `server/data/paper_trading.db` on first startup.

You will see:

```
📊 Paper trading database initialized at: .../server/data/paper_trading.db
🕯️  TradeWise API running on http://localhost:5000
📊  Paper Trading API: http://localhost:5000/api/v1/paper
```

---

## Architecture

```
Request
  │
  ▼
routes/paper_trading.js          ← Input validation + HTTP layer
  │
  ▼
src/services/paper_trading_service.js  ← Business logic orchestration
  │
  ├─► src/trading/paper_trading/engine.js     ← Order lifecycle coordination
  │     ├─► validators.js                     ← Pre-trade checks
  │     ├─► executors.js                      ← Market price fetch + fill
  │     └─► models.js                         ← SQLite queries (CRUD)
  │
  ├─► src/trading/paper_trading/portfolio.js  ← Mark-to-market calculations
  ├─► src/trading/paper_trading/analytics.js  ← Performance metrics
  └─► src/database/init.js                    ← Schema bootstrap
```

---

## API Reference

**Base URL:** `http://localhost:5000/api/v1/paper`

All responses follow this envelope:

```json
{ "success": true/false, ...data }
```

---

### Portfolios

#### `POST /api/v1/paper/portfolio`
Create a new paper trading portfolio.

**Request Body:**
```json
{
  "name": "My First Portfolio",
  "startingBalance": 10000
}
```

| Field | Type | Required | Default |
| :--- | :--- | :--- | :--- |
| `name` | string | No | `"My Portfolio"` |
| `startingBalance` | number | No | `10000` |

**Response `201`:**
```json
{
  "success": true,
  "portfolio": {
    "id": "a1b2c3d4-...",
    "name": "My First Portfolio",
    "starting_balance": 10000,
    "cash_balance": 10000,
    "status": "ACTIVE",
    "created_at": 1700000000
  }
}
```

---

#### `GET /api/v1/paper/portfolio/:id`
Get full portfolio summary with live position values.

**Response `200`:**
```json
{
  "success": true,
  "portfolio": {
    "id": "a1b2c3d4-...",
    "cash_balance": 6680.00,
    "positions_value": 3360.00,
    "total_value": 10040.00,
    "total_return": 40.00,
    "total_return_percent": 0.4,
    "realized_pnl": 0,
    "open_positions": 1,
    "positions": [
      {
        "id": "pos-uuid",
        "symbol": "BTC",
        "side": "BUY",
        "quantity": 0.05,
        "entry_price": 66800,
        "current_price": 67200,
        "market_value": 3360,
        "unrealized_pnl": 20,
        "unrealized_pnl_percent": 0.5988
      }
    ]
  }
}
```

---

### Positions

#### `POST /api/v1/paper/positions`
Open a new BUY position (market order).

**Request Body:**
```json
{
  "portfolioId": "a1b2c3d4-...",
  "symbol": "BTC",
  "quantity": 0.1
}
```

**Supported Symbols:** `AAPL`, `MSFT`, `GOOGL`, `BTC`, `ETH`, `EURUSD`, `GBPUSD`

**Response `201`:**
```json
{
  "success": true,
  "position": {
    "id": "pos-uuid",
    "symbol": "BTC",
    "side": "BUY",
    "quantity": 0.1,
    "entry_price": 64100,
    "status": "OPEN"
  },
  "trade": { "id": "trade-uuid", "total_value": 6410, ... },
  "fill": { "fillPrice": 64100, "totalCost": 6410 }
}
```

---

#### `GET /api/v1/paper/positions/:portfolioId`
Get all open positions.

---

#### `DELETE /api/v1/paper/positions/:positionId?portfolioId=<id>`
Close (SELL) an open position at current market price.

**Response `200`:**
```json
{
  "success": true,
  "position": { "status": "CLOSED", ... },
  "trade": { "side": "SELL", "pnl": 120, "pnl_percent": 1.796 },
  "fill": { "fillPrice": 65200, "totalProceeds": 6520, "pnl": 120 }
}
```

---

### Trades

#### `GET /api/v1/paper/trades/:portfolioId`
Get trade history. Optional filters: `?symbol=BTC&limit=20&offset=0`

**Response `200`:**
```json
{
  "success": true,
  "trades": [
    {
      "id": "trade-uuid",
      "symbol": "BTC",
      "side": "SELL",
      "quantity": 0.1,
      "price": 65200,
      "total_value": 6520,
      "pnl": 120,
      "pnl_percent": 1.796,
      "executed_at": 1700086400
    }
  ],
  "count": 1
}
```

---

### Metrics

#### `GET /api/v1/paper/metrics/:portfolioId`
Get detailed performance analytics.

**Response `200`:**
```json
{
  "success": true,
  "metrics": {
    "total_trades": 10,
    "closed_trades": 5,
    "win_rate": 60,
    "winning_trades": 3,
    "losing_trades": 2,
    "average_win": 85.50,
    "average_loss": -32.20,
    "profit_factor": 2.65,
    "best_trade": { "symbol": "BTC", "pnl": 210, "pnl_percent": 3.15 },
    "worst_trade": { "symbol": "AAPL", "pnl": -45, "pnl_percent": -2.1 },
    "total_realized_pnl": 198.50,
    "max_drawdown": 320,
    "max_drawdown_percent": 3.1,
    "current_streak": { "type": "WIN", "count": 2 },
    "sharpe_ratio": 1.42,
    "equity_curve": [
      { "date": "2023-11-14", "total_value": 10000 },
      { "date": "2023-11-15", "total_value": 10200 }
    ]
  }
}
```

---

### Reset

#### `POST /api/v1/paper/reset/:portfolioId`
Wipe all trades and positions and reset to starting balance.

**Request Body (optional):**
```json
{ "newBalance": 25000 }
```

---

## Running Tests

```bash
# All tests
npm test

# Unit tests only (no DB required)
npm run test:unit

# Integration tests (uses a live SQLite DB)
npm run test:integration

# With coverage report
npm run test:coverage
```

---

## Configuration

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `5000` | Server port |

The database path is hardcoded to `server/data/paper_trading.db`. To change it, modify `server/src/database/init.js`.

---

## Database Schema

```sql
paper_portfolios       -- Portfolio accounts (id, name, cash_balance, ...)
paper_positions        -- Open/closed positions per portfolio
paper_trades           -- All executed trade records with P&L
paper_portfolio_snapshots -- Daily equity snapshots for charting
```

All tables use UUIDs as primary keys and Unix timestamps for time fields.
