import { ENV } from "./_core/env";

/**
 * 五档盘口数据结构
 */
export interface OrderBookData {
  symbol: string;
  timestamp: number;
  bids: Array<{ price: number; size: number }>; // 买盘 [价格, 数量]
  asks: Array<{ price: number; size: number }>; // 卖盘 [价格, 数量]
  totalBidVolume: number; // 总买量
  totalAskVolume: number; // 总卖量
  bidAskDiff: number; // 委差 (买量 - 卖量)
}

/**
 * 从Alpha Vantage获取五档盘口数据
 */
async function getOrderBookFromAlphaVantage(
  symbol: string
): Promise<OrderBookData | null> {
  try {
    const apiKey = ENV.alphaVantageApiKey;
    if (!apiKey) {
      console.warn("[OrderBook] Alpha Vantage API key not configured");
      return null;
    }

    // Alpha Vantage QUOTE_ENDPOINT 返回实时报价，包含bid/ask信息
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data["Global Quote"] || data["Global Quote"]["01. symbol"] !== symbol) {
      console.warn(`[OrderBook] No data from Alpha Vantage for ${symbol}`);
      return null;
    }

    const quote = data["Global Quote"];
    const bidPrice = parseFloat(quote["07. bid"] || quote["05. price"] || 0);
    const askPrice = parseFloat(quote["08. ask"] || quote["05. price"] || 0);
    const bidSize = parseFloat(quote["06. bid size"] || 0);
    const askSize = parseFloat(quote["07. ask size"] || 0);

    // 构造五档数据（Alpha Vantage 免费版只提供1档）
    const bids = bidPrice > 0 ? [{ price: bidPrice, size: bidSize }] : [];
    const asks = askPrice > 0 ? [{ price: askPrice, size: askSize }] : [];

    const totalBidVolume = bids.reduce((sum, b) => sum + b.size, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.size, 0);

    return {
      symbol,
      timestamp: Date.now(),
      bids,
      asks,
      totalBidVolume,
      totalAskVolume,
      bidAskDiff: totalBidVolume - totalAskVolume,
    };
  } catch (error) {
    console.error("[OrderBook] Alpha Vantage error:", error);
    return null;
  }
}

/**
 * 从Polygon.io获取五档盘口数据
 */
async function getOrderBookFromPolygon(
  symbol: string
): Promise<OrderBookData | null> {
  try {
    const apiKey = ENV.polygonIoApiKey;
    if (!apiKey) {
      console.warn("[OrderBook] Polygon.io API key not configured");
      return null;
    }

    // Polygon.io 提供实时报价和盘口数据
    const url = `https://api.polygon.io/v3/quotes/${symbol}?apiKey=${apiKey}`;
    const response = await fetch(url);

    if (response.status === 401 || response.status === 403) {
      console.warn(`[OrderBook] Polygon.io authentication failed`);
      return null;
    }

    if (response.status !== 200) {
      console.warn(`[OrderBook] Polygon.io returned status ${response.status}`);
      return null;
    }

    const data = await response.json();
    const quote = data.results?.[0];

    if (!quote) {
      console.warn(`[OrderBook] No quote data from Polygon.io for ${symbol}`);
      return null;
    }

    const bidPrice = quote.bid || 0;
    const askPrice = quote.ask || 0;
    const bidSize = quote.bid_size || 0;
    const askSize = quote.ask_size || 0;

    const bids = bidPrice > 0 ? [{ price: bidPrice, size: bidSize }] : [];
    const asks = askPrice > 0 ? [{ price: askPrice, size: askSize }] : [];

    const totalBidVolume = bids.reduce((sum, b) => sum + b.size, 0);
    const totalAskVolume = asks.reduce((sum, a) => sum + a.size, 0);

    return {
      symbol,
      timestamp: Date.now(),
      bids,
      asks,
      totalBidVolume,
      totalAskVolume,
      bidAskDiff: totalBidVolume - totalAskVolume,
    };
  } catch (error) {
    console.error("[OrderBook] Polygon.io error:", error);
    return null;
  }
}

/**
 * 获取五档盘口数据（优先使用Polygon.io，备用Alpha Vantage）
 */
export async function getOrderBook(symbol: string): Promise<OrderBookData | null> {
  // 尝试Polygon.io
  let orderBook = await getOrderBookFromPolygon(symbol);
  if (orderBook) {
    return orderBook;
  }

  // 备用Alpha Vantage
  orderBook = await getOrderBookFromAlphaVantage(symbol);
  if (orderBook) {
    return orderBook;
  }

  console.warn(`[OrderBook] Failed to fetch order book for ${symbol} from any source`);
  return null;
}

/**
 * 缓存的盘口数据（用于计算买卖动能趋势）
 */
const orderBookCache = new Map<
  string,
  {
    data: OrderBookData;
    timestamp: number;
  }
>();

const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

/**
 * 获取缓存的盘口数据
 */
export async function getCachedOrderBook(symbol: string): Promise<OrderBookData | null> {
  const cached = orderBookCache.get(symbol);

  // 如果缓存存在且未过期，返回缓存
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  // 获取新数据
  const orderBook = await getOrderBook(symbol);
  if (orderBook) {
    orderBookCache.set(symbol, {
      data: orderBook,
      timestamp: Date.now(),
    });
  }

  return orderBook;
}
