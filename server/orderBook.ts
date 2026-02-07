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
 * 获取五档盘口数据（当前版本返回 null，未来可集成实时数据源）
 */
export async function getOrderBook(symbol: string): Promise<OrderBookData | null> {
  console.warn(`[OrderBook] Order book data not available for ${symbol} in current version`);
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
