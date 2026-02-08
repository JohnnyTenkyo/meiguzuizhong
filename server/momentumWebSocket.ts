import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { calculateMomentum, formatMomentumForChart } from "./tradingMomentum";

interface MomentumSubscription {
  symbol: string;
  ws: WebSocket;
}

const subscriptions = new Map<string, Set<WebSocket>>();

/**
 * 初始化WebSocket服务器用于买卖动能实时推送
 */
export function initMomentumWebSocket(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws/momentum"
  });

  wss.on("connection", (ws: WebSocket) => {
    console.log("[MomentumWS] Client connected");

    ws.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "subscribe" && message.symbol) {
          const symbol = message.symbol.toUpperCase();
          
          // 添加订阅
          if (!subscriptions.has(symbol)) {
            subscriptions.set(symbol, new Set());
          }
          subscriptions.get(symbol)!.add(ws);
          
          console.log(`[MomentumWS] Client subscribed to ${symbol}`);
          
          // 立即发送一次数据
          await sendMomentumUpdate(symbol, ws);
        } else if (message.type === "unsubscribe" && message.symbol) {
          const symbol = message.symbol.toUpperCase();
          
          // 移除订阅
          if (subscriptions.has(symbol)) {
            subscriptions.get(symbol)!.delete(ws);
            if (subscriptions.get(symbol)!.size === 0) {
              subscriptions.delete(symbol);
            }
          }
          
          console.log(`[MomentumWS] Client unsubscribed from ${symbol}`);
        } else if (message.type === "refresh" && message.symbol) {
          const symbol = message.symbol.toUpperCase();
          
          // 手动刷新数据
          console.log(`[MomentumWS] Manual refresh requested for ${symbol}`);
          await sendMomentumUpdate(symbol, ws);
        }
      } catch (error) {
        console.error("[MomentumWS] Error processing message:", error);
      }
    });

    ws.on("close", () => {
      // 清理所有订阅
      subscriptions.forEach((clients, symbol) => {
        clients.delete(ws);
        if (clients.size === 0) {
          subscriptions.delete(symbol);
        }
      });
      console.log("[MomentumWS] Client disconnected");
    });

    ws.on("error", (error) => {
      console.error("[MomentumWS] WebSocket error:", error);
    });
  });

  // 定期推送更新（可选，用于自动刷新）
  // setInterval(() => {
  //   subscriptions.forEach(async (clients, symbol) => {
  //     if (clients.size > 0) {
  //       await broadcastMomentumUpdate(symbol);
  //     }
  //   });
  // }, 60000); // 每60秒推送一次

  console.log("[MomentumWS] WebSocket server initialized on /ws/momentum");
  
  return wss;
}

/**
 * 向单个客户端发送买卖动能更新
 */
async function sendMomentumUpdate(symbol: string, ws: WebSocket) {
  try {
    const momentum = await calculateMomentum(symbol);
    
    if (!momentum) {
      ws.send(JSON.stringify({
        type: "momentum",
        symbol,
        error: `Failed to calculate momentum for ${symbol}`,
        data: {
          buyLine: 0,
          sellLine: 0,
          diffBar: 0,
          trend: "中立",
          timestamp: Date.now(),
        }
      }));
      return;
    }

    const formatted = formatMomentumForChart(momentum);
    
    ws.send(JSON.stringify({
      type: "momentum",
      symbol,
      data: formatted,
    }));
  } catch (error) {
    console.error(`[MomentumWS] Error sending update for ${symbol}:`, error);
  }
}

/**
 * 向所有订阅者广播买卖动能更新
 */
async function broadcastMomentumUpdate(symbol: string) {
  const clients = subscriptions.get(symbol);
  if (!clients || clients.size === 0) return;

  try {
    const momentum = await calculateMomentum(symbol);
    
    if (!momentum) {
      const errorMessage = JSON.stringify({
        type: "momentum",
        symbol,
        error: `Failed to calculate momentum for ${symbol}`,
        data: {
          buyLine: 0,
          sellLine: 0,
          diffBar: 0,
          trend: "中立",
          timestamp: Date.now(),
        }
      });
      
      clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(errorMessage);
        }
      });
      return;
    }

    const formatted = formatMomentumForChart(momentum);
    const message = JSON.stringify({
      type: "momentum",
      symbol,
      data: formatted,
    });

    clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  } catch (error) {
    console.error(`[MomentumWS] Error broadcasting update for ${symbol}:`, error);
  }
}
