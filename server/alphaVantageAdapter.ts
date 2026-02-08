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
 * Alpha Vantage 数据源适配器
 * 作为第三个备用数据源（Yahoo Finance → Finnhub → Alpha Vantage）
 */

function getAlphaVantageFunction(interval: string): { function: string; interval?: string } {
  // Alpha Vantage 支持的时间周期
  const map: Record<string, { function: string; interval?: string }> = {
    '1m': { function: 'TIME_SERIES_INTRADAY', interval: '1min' },
    '5m': { function: 'TIME_SERIES_INTRADAY', interval: '5min' },
    '15m': { function: 'TIME_SERIES_INTRADAY', interval: '15min' },
    '30m': { function: 'TIME_SERIES_INTRADAY', interval: '30min' },
    '1h': { function: 'TIME_SERIES_INTRADAY', interval: '60min' },
    '1d': { function: 'TIME_SERIES_DAILY' },
    '1w': { function: 'TIME_SERIES_WEEKLY' },
    '1mo': { function: 'TIME_SERIES_MONTHLY' },
  };
  return map[interval] || { function: 'TIME_SERIES_DAILY' };
}

export async function fetchAlphaVantageCandles(symbol: string, interval: string): Promise<Candle[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const { function: func, interval: avInterval } = getAlphaVantageFunction(interval);
  
  let url = `https://www.alphavantage.co/query?function=${func}&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
  
  // 分钟级数据需要指定 interval 参数
  if (avInterval) {
    url += `&interval=${avInterval}&outputsize=full`;
  } else {
    url += `&outputsize=full`;
  }

  try {
    const res = await axios.get(url, { timeout: 30000 });
    const data = res.data;

    // 检查错误响应
    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || data['Note']);
    }

    // 根据不同的 function 解析数据
    let timeSeries: any;
    if (func === 'TIME_SERIES_INTRADAY') {
      timeSeries = data[`Time Series (${avInterval})`];
    } else if (func === 'TIME_SERIES_DAILY') {
      timeSeries = data['Time Series (Daily)'];
    } else if (func === 'TIME_SERIES_WEEKLY') {
      timeSeries = data['Weekly Time Series'];
    } else if (func === 'TIME_SERIES_MONTHLY') {
      timeSeries = data['Monthly Time Series'];
    }

    if (!timeSeries) {
      throw new Error('No data from Alpha Vantage');
    }

    const candles: Candle[] = [];
    for (const [timestamp, values] of Object.entries(timeSeries)) {
      const v = values as any;
      candles.push({
        time: new Date(timestamp).getTime(),
        open: parseFloat(v['1. open']),
        high: parseFloat(v['2. high']),
        low: parseFloat(v['3. low']),
        close: parseFloat(v['4. close']),
        volume: parseInt(v['5. volume'] || '0', 10),
      });
    }

    // Alpha Vantage 返回的数据是倒序的，需要排序
    return candles.sort((a, b) => a.time - b.time);
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching data for ${symbol}:`, error);
    throw error;
  }
}

/**
 * 获取股票实时报价
 */
export async function fetchAlphaVantageQuote(symbol: string): Promise<{
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY not configured');
  }

  const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;

  try {
    const res = await axios.get(url, { timeout: 10000 });
    const data = res.data;

    if (data['Error Message'] || data['Note']) {
      throw new Error(data['Error Message'] || data['Note']);
    }

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error('No quote data from Alpha Vantage');
    }

    return {
      price: parseFloat(quote['05. price']),
      change: parseFloat(quote['09. change']),
      changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
      volume: parseInt(quote['06. volume'], 10),
    };
  } catch (error) {
    console.error(`[AlphaVantage] Error fetching quote for ${symbol}:`, error);
    throw error;
  }
}
