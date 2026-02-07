import { describe, expect, it } from "vitest";

describe("API Keys Validation", () => {
  it("should have ALPHAVANTAGE_API_KEY configured", () => {
    expect(process.env.ALPHAVANTAGE_API_KEY).toBeDefined();
    expect(process.env.ALPHAVANTAGE_API_KEY).not.toBe("");
  });

  it("should have FINNHUB_API_KEY configured", () => {
    expect(process.env.FINNHUB_API_KEY).toBeDefined();
    expect(process.env.FINNHUB_API_KEY).not.toBe("");
  });

  it("should have MASSIVE_API_KEY configured", () => {
    expect(process.env.MASSIVE_API_KEY).toBeDefined();
    expect(process.env.MASSIVE_API_KEY).not.toBe("");
  });

  it("should be able to call Alpha Vantage API", async () => {
    const apiKey = process.env.ALPHAVANTAGE_API_KEY;
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    // If API key is invalid, Alpha Vantage returns an error message
    expect(data["Error Message"]).toBeUndefined();
  }, 10000); // 10 second timeout for API call

  it("should be able to call Finnhub API", async () => {
    const apiKey = process.env.FINNHUB_API_KEY;
    const url = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toBeDefined();
    // If API key is invalid, Finnhub returns { error: "..." }
    expect(data.error).toBeUndefined();
    expect(data.c).toBeDefined(); // current price
  }, 10000);
});
