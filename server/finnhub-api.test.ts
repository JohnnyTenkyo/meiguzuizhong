import { describe, expect, it } from "vitest";
import axios from "axios";

describe("Finnhub API Key Validation", () => {
  it("should successfully fetch stock quote with Finnhub API key", async () => {
    const apiKey = process.env.FINNHUB_API_KEY;
    
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    
    // Test API key by fetching a simple stock quote (AAPL)
    const response = await axios.get(
      `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${apiKey}`,
      { timeout: 10000 }
    );
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.c).toBeDefined(); // current price
    expect(typeof response.data.c).toBe("number");
  }, 15000); // 15 second timeout
});
