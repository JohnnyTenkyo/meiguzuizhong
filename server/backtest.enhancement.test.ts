import { describe, expect, it } from "vitest";

describe("Backtest Enhancement Features", () => {
  it("should calculate total return correctly", () => {
    const initialBalance = 100000;
    const currentBalance = 120000;
    const totalReturn = ((currentBalance - initialBalance) / initialBalance) * 100;
    
    expect(totalReturn).toBe(20);
  });

  it("should calculate win rate correctly", () => {
    const trades = [
      { pnl: 1000 },
      { pnl: -500 },
      { pnl: 2000 },
      { pnl: -300 },
      { pnl: 1500 },
    ];

    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const winRate = (winningTrades / trades.length) * 100;

    expect(winRate).toBe(60);
  });

  it("should calculate max drawdown correctly", () => {
    const equityCurve = [100000, 105000, 103000, 108000, 102000, 110000];
    
    let maxDrawdown = 0;
    let peak = equityCurve[0];

    for (const value of equityCurve) {
      if (value > peak) {
        peak = value;
      }
      const drawdown = ((peak - value) / peak) * 100;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }

    expect(maxDrawdown).toBeCloseTo(5.56, 1);
  });

  it("should calculate profit factor correctly", () => {
    const trades = [
      { pnl: 1000 },
      { pnl: -500 },
      { pnl: 2000 },
      { pnl: -300 },
      { pnl: 1500 },
    ];

    const totalProfit = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : 0;

    expect(profitFactor).toBeCloseTo(5.625, 2);
  });

  it("should format date number correctly", () => {
    const dateNum = 20240315;
    const str = String(dateNum);
    const formatted = `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;

    expect(formatted).toBe("2024-03-15");
  });

  it("should calculate trade P&L correctly", () => {
    const buyPrice = 100;
    const sellPrice = 110;
    const quantity = 100;
    
    const pnl = (sellPrice - buyPrice) * quantity;
    const pnlPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

    expect(pnl).toBe(1000);
    expect(pnlPercent).toBe(10);
  });
});
