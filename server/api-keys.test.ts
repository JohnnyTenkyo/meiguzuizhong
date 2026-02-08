import { describe, expect, it } from "vitest";

describe("API Keys Configuration", () => {
  it("ALPHA_VANTAGE_API_KEY should be set", () => {
    expect(process.env.ALPHA_VANTAGE_API_KEY).toBeDefined();
    expect(process.env.ALPHA_VANTAGE_API_KEY!.length).toBeGreaterThan(0);
  });

  it("MASSIVE_API_KEY should be set", () => {
    expect(process.env.MASSIVE_API_KEY).toBeDefined();
    expect(process.env.MASSIVE_API_KEY!.length).toBeGreaterThan(0);
  });

  it("FINNHUB_API_KEY should be set", () => {
    expect(process.env.FINNHUB_API_KEY).toBeDefined();
    expect(process.env.FINNHUB_API_KEY!.length).toBeGreaterThan(0);
  });

  it("Alpha Vantage API key should be valid", async () => {
    const key = process.env.ALPHA_VANTAGE_API_KEY;
    const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${key}`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data["Error Message"]).toBeUndefined();
  }, 15000);

  it("Finnhub API key should be valid", async () => {
    const key = process.env.FINNHUB_API_KEY;
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${key}`);
    expect(res.ok).toBe(true);
  }, 15000);
});
