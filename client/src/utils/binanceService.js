/**
 * Binance WebSocket Service for Real-Time OHLC Data
 */

const BINANCE_WS_BASE = 'wss://stream.binance.com:9443/ws';
const BINANCE_API_KEY = import.meta.env.VITE_BINANCE_API_KEY || '';

export class BinanceService {
  constructor(symbol, timeframe, onUpdate) {
    this.symbol = symbol.toLowerCase().replace('/', '');
    this.timeframe = this.mapTimeframe(timeframe);
    this.onUpdate = onUpdate;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.isDisconnected = false;
    this.reconnectTimeout = null;
  }

  mapTimeframe(tf) {
    const maps = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w'
    };
    return maps[tf] || '1d';
  }

  connect() {
    if (this.isDisconnected) return;
    if (this.ws) this.ws.close();

    const streamName = `${this.symbol}@kline_${this.timeframe}`;
    this.ws = new WebSocket(`${BINANCE_WS_BASE}/${streamName}`);

    this.ws.onopen = () => {
      console.log(`Connected to Binance: ${streamName}`);
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.e === 'kline') {
        const k = data.k;
        const candle = {
          time: k.t / 1000, // Convert to seconds
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          isFinal: k.x
        };
        this.onUpdate(candle);
      }
    };

    this.ws.onclose = () => {
      console.log('Binance WS closed');
      if (!this.isDisconnected && this.reconnectAttempts < 5) {
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectAttempts++;
          this.connect();
        }, 3000);
      }
    };

    this.ws.onerror = (err) => {
      console.error('Binance WS Error:', err);
    };
  }

  disconnect() {
    this.isDisconnected = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  static async getHistoricalData(symbol, timeframe, limit = 100) {
    const s = symbol.toUpperCase().replace('/', '');
    const tf = timeframe || '1d';
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${s}&interval=${tf}&limit=${limit}`);
      const data = await response.json();
      return data.map(d => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));
    } catch (err) {
      console.error('Error fetching Binance historical data:', err);
      return [];
    }
  }
}
