import { getCachedOrderBook, OrderBookData } from "./orderBook";

/**
 * 买卖动能数据点
 */
export interface MomentumDataPoint {
  timestamp: number;
  buyPressure: number; // 黄线：买盘挂单累计
  sellPressure: number; // 绿线：卖盘挂单累计
  bidAskDiff: number; // 委差：买盘 - 卖盘
  momentum: "buy" | "sell" | "neutral"; // 动能方向
}

/**
 * 买卖动能指标数据
 */
export interface MomentumIndicator {
  symbol: string;
  data: MomentumDataPoint[];
  latestBuyPressure: number;
  latestSellPressure: number;
  latestDiff: number;
  trend: "强买" | "弱买" | "中立" | "弱卖" | "强卖";
}

/**
 * 计算买卖动能指标
 * 基于五档盘口数据的累计买卖力量
 */
export async function calculateMomentum(
  symbol: string,
  historicalData?: OrderBookData[]
): Promise<MomentumIndicator | null> {
  try {
    // 获取当前盘口数据
    const currentOrderBook = await getCachedOrderBook(symbol);
    if (!currentOrderBook) {
      console.warn(`[Momentum] Failed to get order book for ${symbol}`);
      return null;
    }

    // 构建动能数据点
    const dataPoints: MomentumDataPoint[] = [];

    // 当前数据点
    const buyPressure = currentOrderBook.totalBidVolume;
    const sellPressure = currentOrderBook.totalAskVolume;
    const bidAskDiff = currentOrderBook.bidAskDiff;

    // 判断动能方向
    let momentum: "buy" | "sell" | "neutral" = "neutral";
    if (bidAskDiff > 0) {
      momentum = "buy";
    } else if (bidAskDiff < 0) {
      momentum = "sell";
    }

    dataPoints.push({
      timestamp: currentOrderBook.timestamp,
      buyPressure,
      sellPressure,
      bidAskDiff,
      momentum,
    });

    // 判断趋势强度
    let trend: "强买" | "弱买" | "中立" | "弱卖" | "强卖" = "中立";
    const diffRatio = Math.abs(bidAskDiff) / (buyPressure + sellPressure || 1);

    if (bidAskDiff > 0) {
      if (diffRatio > 0.3) {
        trend = "强买";
      } else if (diffRatio > 0.1) {
        trend = "弱买";
      }
    } else if (bidAskDiff < 0) {
      if (diffRatio > 0.3) {
        trend = "强卖";
      } else if (diffRatio > 0.1) {
        trend = "弱卖";
      }
    }

    return {
      symbol,
      data: dataPoints,
      latestBuyPressure: buyPressure,
      latestSellPressure: sellPressure,
      latestDiff: bidAskDiff,
      trend,
    };
  } catch (error) {
    console.error("[Momentum] Calculation error:", error);
    return null;
  }
}

/**
 * 格式化买卖动能数据用于前端显示
 */
export function formatMomentumForChart(momentum: MomentumIndicator) {
  return {
    symbol: momentum.symbol,
    buyLine: momentum.latestBuyPressure, // 黄线
    sellLine: momentum.latestSellPressure, // 绿线
    diffBar: momentum.latestDiff, // 红柱/绿柱
    trend: momentum.trend,
    timestamp: momentum.data[0]?.timestamp || Date.now(),
  };
}
