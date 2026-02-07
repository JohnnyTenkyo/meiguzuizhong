import axios from "axios";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Finnhub 数据源适配器
 * 当 Yahoo Finance 请求失败时，自动切换到 Finnhub
 */

// Interval to Finnhub resolution mapping
function getFinnhubResolution(interval: string): { resolution: string; days: number } {
  const map: Record<string, { resolution: string; days: number }> = {
    '1m': { resolution: '1', days: 7 },
    '3m': { resolution: '3', days: 7 },
    '5m': { resolution: '5', days: 30 },
    '15m': { resolution: '15', days: 60 },
    '30m': { resolution: '30', days: 60 },
    '1h': { resolution: '60', days: 365 },
    '2h': { resolution: '120', days: 365 },
    '3h': { resolution: '180', days: 365 },
    '4h': { resolution: '240', days: 365 },
    '1d': { resolution: 'D', days: 1825 }, // 5 years
    '1w': { resolution: 'W', days: 3650 }, // 10 years
    '1mo': { resolution: 'M', days: 7300 }, // 20 years
  };
  return map[interval] || { resolution: 'D', days: 1825 };
}

export async function fetchFinnhubCandles(symbol: string, interval: string): Promise<Candle[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY not configured');
  }

  const { resolution, days } = getFinnhubResolution(interval);
  const now = Math.floor(Date.now() / 1000);
  const from = now - (days * 24 * 60 * 60);
  
  const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${now}&token=${apiKey}`;

  try {
    const res = await axios.get(url, { timeout: 30000 });
    const data = res.data;

    if (data.s !== 'ok' || !data.t || data.t.length === 0) {
      throw new Error('No data from Finnhub');
    }

    const candles: Candle[] = [];
    for (let i = 0; i < data.t.length; i++) {
      candles.push({
        time: data.t[i] * 1000, // Convert to milliseconds
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: data.v[i],
      });
    }

    return candles;
  } catch (error) {
    console.error(`[Finnhub] Error fetching data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 获取股票实时报价
 */
export async function fetchFinnhubQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    throw new Error('FINNHUB_API_KEY not configured');
  }

  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`;

  try {
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;

    return {
      price: data.c, // current price
      change: data.d, // change
      changePercent: data.dp, // percent change
      volume: 0, // Finnhub quote doesn't include volume
    };
  } catch (error) {
    console.error(`[Finnhub] Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}
