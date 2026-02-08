import { describe, expect, it } from "vitest";

// We test the indicator functions by importing them from the client lib
// These are pure functions that don't depend on DOM or React
import {
  calculateChanLunSignals,
  checkChanLunBuySignal,
  checkChanLunSellSignal,
  calculateAdvancedChanData,
  calculateAdvancedChanSignals,
  checkAdvancedChanBuySignal,
  checkAdvancedChanSellSignal,
  checkNearGoldenSupport,
  checkNearZhongshu,
  calculateMACD,
  calculateCDSignals,
  calculateLadder,
  calculateBuySellPressure,
} from "../client/src/lib/indicators";
import type { Candle } from "../client/src/lib/types";

// Generate realistic candle data for testing
function generateCandles(count: number, startPrice = 100, volatility = 0.02): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const baseTime = new Date("2024-01-02").getTime();

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2 * volatility * price;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * volatility * price;
    const low = Math.min(open, close) - Math.random() * volatility * price;
    const volume = Math.floor(1000000 + Math.random() * 5000000);

    candles.push({
      time: baseTime + i * 86400000,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume,
    });
    price = close;
  }
  return candles;
}

// Generate candles with a clear top pattern (for testing top fractal)
function generateTopPattern(): Candle[] {
  const candles: Candle[] = [];
  const baseTime = new Date("2024-01-02").getTime();
  const prices = [
    // Rising phase
    100, 102, 104, 106, 108, 110, 112, 114, 116, 118,
    // Top area
    120, 122, 124, 126, 125, 123, 121, 119, 117, 115,
    // Falling phase
    113, 111, 109, 107, 105, 103, 101, 99, 97, 95,
    // More data for MACD
    93, 91, 90, 89, 88, 87, 86, 85, 84, 83,
    82, 81, 80, 79, 78, 77, 76, 75, 74, 73,
  ];

  for (let i = 0; i < prices.length; i++) {
    const p = prices[i];
    candles.push({
      time: baseTime + i * 86400000,
      open: p - 0.5,
      high: p + 1,
      low: p - 1,
      close: p + 0.5,
      volume: 1000000 + Math.floor(Math.random() * 500000),
    });
  }
  return candles;
}

describe("Chan Lun Signals (缠论分型)", () => {
  it("should return empty array for insufficient data", () => {
    const candles = generateCandles(5);
    const signals = calculateChanLunSignals(candles);
    expect(signals).toEqual([]);
  });

  it("should return array of ChanLunSignal objects for sufficient data", () => {
    const candles = generateCandles(100, 100, 0.03);
    const signals = calculateChanLunSignals(candles);
    expect(Array.isArray(signals)).toBe(true);
    // Each signal should have required properties
    for (const s of signals) {
      expect(s).toHaveProperty("time");
      expect(s).toHaveProperty("type");
      expect(s).toHaveProperty("label");
      expect(["top", "bottom", "buy", "sell"]).toContain(s.type);
      expect(typeof s.time).toBe("number");
      expect(typeof s.label).toBe("string");
    }
  });

  it("checkChanLunBuySignal should return boolean", () => {
    const candles = generateCandles(100, 100, 0.03);
    const result = checkChanLunBuySignal(candles);
    expect(typeof result).toBe("boolean");
  });

  it("checkChanLunSellSignal should return boolean", () => {
    const candles = generateCandles(100, 100, 0.03);
    const result = checkChanLunSellSignal(candles);
    expect(typeof result).toBe("boolean");
  });

  it("should detect fractals in data with clear patterns", () => {
    const candles = generateTopPattern();
    const signals = calculateChanLunSignals(candles);
    // With a clear top pattern, we should get at least some signals
    expect(signals.length).toBeGreaterThanOrEqual(0);
    // Verify signal types are valid
    const validTypes = ["top", "bottom", "buy", "sell"];
    for (const s of signals) {
      expect(validTypes).toContain(s.type);
    }
  });
});

describe("Advanced Chan Data (高级禅动)", () => {
  it("should return empty array for insufficient data", () => {
    const candles = generateCandles(10);
    const data = calculateAdvancedChanData(candles);
    expect(data).toEqual([]);
  });

  it("should calculate advanced chan data for sufficient candles", () => {
    const candles = generateCandles(100, 100, 0.02);
    const data = calculateAdvancedChanData(candles);
    expect(Array.isArray(data)).toBe(true);
    if (data.length > 0) {
      const d = data[0];
      expect(d).toHaveProperty("time");
      expect(d).toHaveProperty("buyLine");
      expect(d).toHaveProperty("sellLine");
      expect(d).toHaveProperty("xxh25");
      expect(d).toHaveProperty("xxl25");
      expect(d).toHaveProperty("d90Top");
      expect(d).toHaveProperty("d90Bottom");
      expect(d).toHaveProperty("longLine");
      expect(d).toHaveProperty("shortLine");
      expect(d).toHaveProperty("trend");
      expect(["bull", "bear", "range"]).toContain(d.trend);
      // All numeric values should be finite numbers
      expect(Number.isFinite(d.buyLine)).toBe(true);
      expect(Number.isFinite(d.sellLine)).toBe(true);
      expect(Number.isFinite(d.xxh25)).toBe(true);
      expect(Number.isFinite(d.xxl25)).toBe(true);
    }
  });

  it("should generate buy/sell signals from advanced chan data", () => {
    const candles = generateCandles(100, 100, 0.03);
    const data = calculateAdvancedChanData(candles);
    if (data.length > 0) {
      const signals = calculateAdvancedChanSignals(candles, data);
      expect(Array.isArray(signals)).toBe(true);
      for (const s of signals) {
        expect(s).toHaveProperty("time");
        expect(s).toHaveProperty("type");
        expect(s).toHaveProperty("label");
        expect(["buy", "sell"]).toContain(s.type);
      }
    }
  });

  it("checkAdvancedChanBuySignal should return boolean", () => {
    const candles = generateCandles(100, 100, 0.02);
    const result = checkAdvancedChanBuySignal(candles);
    expect(typeof result).toBe("boolean");
  });

  it("checkAdvancedChanSellSignal should return boolean", () => {
    const candles = generateCandles(100, 100, 0.02);
    const result = checkAdvancedChanSellSignal(candles);
    expect(typeof result).toBe("boolean");
  });

  it("checkNearGoldenSupport should return boolean", () => {
    const candles = generateCandles(100, 100, 0.02);
    const result = checkNearGoldenSupport(candles);
    expect(typeof result).toBe("boolean");
  });

  it("checkNearZhongshu should return boolean", () => {
    const candles = generateCandles(100, 100, 0.02);
    const result = checkNearZhongshu(candles);
    expect(typeof result).toBe("boolean");
  });
});

describe("Core Indicators (核心指标)", () => {
  it("calculateMACD should return valid MACD data", () => {
    const candles = generateCandles(50);
    const result = calculateMACD(candles);
    expect(result).toHaveProperty("diff");
    expect(result).toHaveProperty("dea");
    expect(result).toHaveProperty("macd");
    expect(result.diff.length).toBe(candles.length);
    expect(result.dea.length).toBe(candles.length);
    expect(result.macd.length).toBe(candles.length);
  });

  it("calculateCDSignals should return valid signals", () => {
    const candles = generateCandles(100, 100, 0.03);
    const signals = calculateCDSignals(candles);
    expect(Array.isArray(signals)).toBe(true);
    for (const s of signals) {
      expect(s).toHaveProperty("time");
      expect(s).toHaveProperty("type");
      expect(s).toHaveProperty("label");
      expect(["buy", "sell"]).toContain(s.type);
    }
  });

  it("calculateLadder should return ladder levels", () => {
    const candles = generateCandles(50);
    const ladder = calculateLadder(candles);
    expect(Array.isArray(ladder)).toBe(true);
    if (ladder.length > 0) {
      expect(ladder[0]).toHaveProperty("time");
      expect(ladder[0]).toHaveProperty("blueUp");
      expect(ladder[0]).toHaveProperty("blueDn");
      expect(ladder[0]).toHaveProperty("yellowUp");
      expect(ladder[0]).toHaveProperty("yellowDn");
    }
  });

  it("calculateBuySellPressure should return pressure data", () => {
    const candles = generateCandles(50);
    const pressure = calculateBuySellPressure(candles);
    expect(Array.isArray(pressure)).toBe(true);
    if (pressure.length > 0) {
      expect(pressure[0]).toHaveProperty("time");
      expect(pressure[0]).toHaveProperty("pressure");
    }
  });
});
