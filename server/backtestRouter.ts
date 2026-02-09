import { Router } from "express";
import { getDb } from "./db";
import { backtestSessions, backtestTrades, backtestPositions, localUsers } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { verifyToken } from "./authRouter";
import { fetchFinnhubCandles } from "./finnhubAdapter";

export const backtestApiRouter = Router();

// Middleware to verify auth
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "未登录" });
  }
  const decoded = verifyToken(authHeader.substring(7));
  if (!decoded) {
    return res.status(401).json({ success: false, error: "登录已过期" });
  }
  req.userId = decoded.userId;
  next();
}

backtestApiRouter.use(authMiddleware);

// List all sessions for current user
backtestApiRouter.get("/sessions", async (req: any, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    
    const sessions = await db.select().from(backtestSessions)
      .where(eq(backtestSessions.localUserId, req.userId))
      .orderBy(desc(backtestSessions.updatedAt));
    
    // 为每个 session 附带持仓股票数量
    // 注意：不在后端计算 totalMarketValue，因为价格计算可能与前端不一致
    // 前端应该根据需要调用回测模拟器 API 获取实时市值
    const sessionsWithPositions = await Promise.all(
      sessions.map(async (session) => {
        const positions = await db.select().from(backtestPositions)
          .where(eq(backtestPositions.sessionId, session.id));
        const activePositions = positions.filter(p => Number(p.quantity) > 0);
        
        return {
          ...session,
          positionCount: activePositions.length,
        };
      })
    );
    
    return res.json({ success: true, sessions: sessionsWithPositions });
  } catch (err) {
    console.error("List sessions error:", err);
    return res.json({ success: false, error: "获取存档失败" });
  }
});

// Create a new session
backtestApiRouter.post("/sessions", async (req: any, res) => {
  try {
    const { name, initialBalance, startDate } = req.body;
    if (!name || !initialBalance || !startDate) {
      return res.json({ success: false, error: "请填写所有必填项" });
    }
    
    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    
    const result = await db.insert(backtestSessions).values({
      localUserId: req.userId,
      name,
      initialBalance: String(initialBalance),
      currentBalance: String(initialBalance),
      startDate: Number(startDate),
      currentDate: Number(startDate),
      currentInterval: "1d",
      status: "active",
    });
    
    const sessionId = result[0].insertId;
    const sessions = await db.select().from(backtestSessions).where(eq(backtestSessions.id, sessionId));
    
    return res.json({ success: true, session: sessions[0] });
  } catch (err) {
    console.error("Create session error:", err);
    return res.json({ success: false, error: "创建存档失败" });
  }
});

// Get a specific session with positions and calculate market value
backtestApiRouter.get("/sessions/:id", async (req: any, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    
    const sessionId = parseInt(req.params.id);
    const sessions = await db.select().from(backtestSessions)
      .where(and(eq(backtestSessions.id, sessionId), eq(backtestSessions.localUserId, req.userId)));
    
    if (sessions.length === 0) {
      return res.json({ success: false, error: "存档不存在" });
    }
    
    const session = sessions[0];
    const positions = await db.select().from(backtestPositions)
      .where(eq(backtestPositions.sessionId, sessionId));
    
    const trades = await db.select().from(backtestTrades)
      .where(eq(backtestTrades.sessionId, sessionId))
      .orderBy(desc(backtestTrades.createdAt));
    
    // 计算持仓总市值
    let totalMarketValue: number | null = 0;
    const activePositions = positions.filter(p => Number(p.quantity) > 0);
    
    const cutoffTimestamp = new Date(
      Math.floor(session.currentDate / 10000),
      Math.floor((session.currentDate % 10000) / 100) - 1,
      session.currentDate % 100
    ).getTime();
    
    console.log(`[Backtest] Calculating totalMarketValue for session ${sessionId}, currentDate: ${session.currentDate}, cutoffTimestamp: ${cutoffTimestamp}`);
    
    let hasError = false;
    for (const pos of activePositions) {
      try {
        const candles = await fetchFinnhubCandles(pos.symbol, '1d');
        if (!candles || candles.length === 0) {
          console.error(`[Backtest] ${pos.symbol}: No candles returned from API`);
          hasError = true;
          break;
        }
        
        let priceAtDate = Number(pos.avgCost);
        let closestCandle = null;
        let minDiff = Infinity;
        
        // 找到最接近 cutoffTimestamp 的 K 线
        for (const candle of candles) {
          const diff = Math.abs(candle.time - cutoffTimestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestCandle = candle;
          }
        }
        
        if (closestCandle) {
          priceAtDate = closestCandle.close;
          console.log(`[Backtest] ${pos.symbol}: closestCandle.time=${new Date(closestCandle.time).toISOString()}, close=${closestCandle.close}, quantity=${pos.quantity}`);
        } else {
          console.log(`[Backtest] ${pos.symbol}: No candle found`);
          hasError = true;
          break;
        }
        
        totalMarketValue += priceAtDate * Number(pos.quantity);
      } catch (err) {
        console.error(`Failed to fetch historical price for ${pos.symbol}:`, err);
        hasError = true;
        break;
      }
    }
    
    // 如果有错误，返回 null 而不是使用成本价
    if (hasError) {
      totalMarketValue = null;
    }
    
    return res.json({
      success: true,
      session: {
        ...session,
        totalMarketValue: totalMarketValue !== null ? totalMarketValue.toFixed(2) : null,
      },
      positions: activePositions,
      trades,
    });
  } catch (err) {
    console.error("Get session error:", err);
    return res.json({ success: false, error: "获取存档失败" });
  }
});

// Update session (advance date, change interval, update total assets)
backtestApiRouter.patch("/sessions/:id", async (req: any, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    
    const sessionId = parseInt(req.params.id);
    const { currentDate, currentInterval, totalAssets, totalPnL, totalPnLPercent } = req.body;
    
    const updateData: any = {};
    if (currentDate !== undefined) updateData.currentDate = Number(currentDate);
    if (currentInterval !== undefined) updateData.currentInterval = currentInterval;
    if (totalAssets !== undefined) updateData.totalAssets = String(totalAssets);
    if (totalPnL !== undefined) updateData.totalPnL = String(totalPnL);
    if (totalPnLPercent !== undefined) updateData.totalPnLPercent = String(totalPnLPercent);
    
    await db.update(backtestSessions)
      .set(updateData)
      .where(and(eq(backtestSessions.id, sessionId), eq(backtestSessions.localUserId, req.userId)));
    
    const sessions = await db.select().from(backtestSessions).where(eq(backtestSessions.id, sessionId));
    return res.json({ success: true, session: sessions[0] });
  } catch (err) {
    console.error("Update session error:", err);
    return res.json({ success: false, error: "更新存档失败" });
  }
});

// Delete session
backtestApiRouter.delete("/sessions/:id", async (req: any, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    
    const sessionId = parseInt(req.params.id);
    await db.delete(backtestSessions)
      .where(and(eq(backtestSessions.id, sessionId), eq(backtestSessions.localUserId, req.userId)));
    
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete session error:", err);
    return res.json({ success: false, error: "删除存档失败" });
  }
});

// Execute a trade (buy or sell)
backtestApiRouter.post("/sessions/:id/trade", async (req: any, res) => {
  try {
    const db = await getDb();
    if (!db) return res.json({ success: false, error: "数据库不可用" });
    
    const sessionId = parseInt(req.params.id);
    const { symbol, type, quantity, price } = req.body;
    
    if (!symbol || !type || !quantity || !price) {
      return res.json({ success: false, error: "请填写所有交易信息" });
    }
    
    // Get session
    const sessions = await db.select().from(backtestSessions)
      .where(and(eq(backtestSessions.id, sessionId), eq(backtestSessions.localUserId, req.userId)));
    
    if (sessions.length === 0) {
      return res.json({ success: false, error: "存档不存在" });
    }
    
    const session = sessions[0];
    const amount = Number(quantity) * Number(price);
    
    if (type === "buy") {
      // Check balance
      if (amount > Number(session.currentBalance)) {
        return res.json({ success: false, error: `余额不足，当前余额: $${Number(session.currentBalance).toFixed(2)}` });
      }
      
      // Deduct balance
      const newBalance = Number(session.currentBalance) - amount;
      await db.update(backtestSessions)
        .set({ currentBalance: String(newBalance.toFixed(2)) })
        .where(eq(backtestSessions.id, sessionId));
      
      // Update or create position
      const existingPositions = await db.select().from(backtestPositions)
        .where(and(eq(backtestPositions.sessionId, sessionId), eq(backtestPositions.symbol, symbol)));
      
      if (existingPositions.length > 0) {
        const pos = existingPositions[0];
        const newQty = Number(pos.quantity) + Number(quantity);
        const newTotalCost = Number(pos.totalCost) + amount;
        const newAvgCost = newTotalCost / newQty;
        
        await db.update(backtestPositions)
          .set({
            quantity: newQty,
            avgCost: String(newAvgCost.toFixed(4)),
            totalCost: String(newTotalCost.toFixed(2)),
          })
          .where(eq(backtestPositions.id, pos.id));
      } else {
        await db.insert(backtestPositions).values({
          sessionId,
          symbol,
          quantity: Number(quantity),
          avgCost: String(Number(price).toFixed(4)),
          totalCost: String(amount.toFixed(2)),
        });
      }
    } else if (type === "sell") {
      // Check position
      const existingPositions = await db.select().from(backtestPositions)
        .where(and(eq(backtestPositions.sessionId, sessionId), eq(backtestPositions.symbol, symbol)));
      
      if (existingPositions.length === 0 || Number(existingPositions[0].quantity) < Number(quantity)) {
        return res.json({ success: false, error: "持仓不足" });
      }
      
      const pos = existingPositions[0];
      const newQty = Number(pos.quantity) - Number(quantity);
      
      // Add balance
      const newBalance = Number(session.currentBalance) + amount;
      await db.update(backtestSessions)
        .set({ currentBalance: String(newBalance.toFixed(2)) })
        .where(eq(backtestSessions.id, sessionId));
      
      if (newQty === 0) {
        // Remove position
        await db.delete(backtestPositions).where(eq(backtestPositions.id, pos.id));
      } else {
        // Reduce position, keep avg cost
        const newTotalCost = Number(pos.avgCost) * newQty;
        await db.update(backtestPositions)
          .set({
            quantity: newQty,
            totalCost: String(newTotalCost.toFixed(2)),
          })
          .where(eq(backtestPositions.id, pos.id));
      }
    }
    
    // Record trade
    await db.insert(backtestTrades).values({
      sessionId,
      symbol,
      type,
      quantity: Number(quantity),
      price: String(Number(price).toFixed(4)),
      amount: String(amount.toFixed(2)),
      tradeDate: Number(session.currentDate),
    });
    
    // Return updated session data
    const updatedSessions = await db.select().from(backtestSessions).where(eq(backtestSessions.id, sessionId));
    const updatedPositions = await db.select().from(backtestPositions)
      .where(eq(backtestPositions.sessionId, sessionId));
    const updatedTrades = await db.select().from(backtestTrades)
      .where(eq(backtestTrades.sessionId, sessionId))
      .orderBy(desc(backtestTrades.createdAt));
    
    return res.json({
      success: true,
      session: updatedSessions[0],
      positions: updatedPositions.filter(p => Number(p.quantity) > 0),
      trades: updatedTrades,
    });
  } catch (err) {
    console.error("Trade error:", err);
    return res.json({ success: false, error: "交易失败" });
  }
});
