import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import axios from "axios";
import { calculateMomentum, formatMomentumForChart } from "./tradingMomentum";
import { fetchFinnhubCandles, fetchFinnhubQuote } from "./finnhubAdapter";
import { fetchAlphaVantageCandles, fetchAlphaVantageQuote } from "./alphaVantageAdapter";

// In-memory cache
const cache: Map<string, { data: any; expires: number }> = new Map();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Get ET (Eastern Time) hour from UTC timestamp
function getETHour(timestamp: number): { etH: number; etM: number; dateStr: string } {
  const d = new Date(timestamp);
  const month = d.getUTCMonth();
  // Simplified DST check: March-November = DST (UTC-4), else EST (UTC-5)
  const isDST = month >= 2 && month <= 10;
  const etOffset = isDST ? 4 : 5;
  
  let etH = d.getUTCHours() - etOffset;
  let etDay = d.getUTCDate();
  let etMonth = d.getUTCMonth();
  let etYear = d.getUTCFullYear();
  
  if (etH < 0) {
    etH += 24;
    etDay -= 1;
    if (etDay < 1) {
      etMonth -= 1;
      if (etMonth < 0) {
        etMonth = 11;
        etYear -= 1;
      }
      etDay = new Date(etYear, etMonth + 1, 0).getDate();
    }
  }
  
  const etM = d.getUTCMinutes();
  const dateStr = `${etYear}-${String(etMonth + 1).padStart(2, '0')}-${String(etDay).padStart(2, '0')}`;
  
  return { etH, etM, dateStr };
}

// Generic aggregation: aggregate smaller candles into larger time blocks
function aggregateCandles(candles: Candle[], targetMinutes: number): Candle[] {
  if (!candles.length) return [];

  const groups = new Map<string, Candle[]>();

  for (const c of candles) {
    const { etH, etM, dateStr } = getETHour(c.time);
    
    // Calculate total minutes from market open (9:30)
    // 09:30 is minute 0. 09:31 is minute 1.
    const totalMinutes = (etH - 9) * 60 + (etM - 30);
    
    // Filter for regular market hours (9:30 AM - 4:00 PM ET)
    if (totalMinutes < 0 || totalMinutes >= 390) continue; 
    
    // Group by block
    // If targetMinutes = 30, then 0-29 is block 0 (9:30-9:59), 30-59 is block 1 (10:00-10:29)
    const blockIndex = Math.floor(totalMinutes / targetMinutes);
    const key = `${dateStr}-${blockIndex}`;
    
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const result: Candle[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length === 0) continue;
    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c: Candle) => c.high)),
      low: Math.min(...group.map((c: Candle) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum: number, c: Candle) => sum + c.volume, 0),
    });
  }

  return result.sort((a, b) => a.time - b.time);
}

// Aggregate daily to monthly
function aggregateDailyToMonthly(candles: Candle[]): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const c of candles) {
    const d = new Date(c.time);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const result: Candle[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length === 0) continue;
    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c: Candle) => c.high)),
      low: Math.min(...group.map((c: Candle) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum: number, c: Candle) => sum + c.volume, 0),
    });
  }
  return result.sort((a, b) => a.time - b.time);
}

// Aggregate daily candles to weekly (Mon-Fri)
function aggregateDailyToWeekly(candles: Candle[]): Candle[] {
  const groups = new Map<string, Candle[]>();
  for (const c of candles) {
    const d = new Date(c.time);
    // Get ISO week start (Monday)
    const day = d.getUTCDay();
    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), diff));
    const key = `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }

  const result: Candle[] = [];
  for (const group of Array.from(groups.values())) {
    if (group.length === 0) continue;
    result.push({
      time: group[0].time,
      open: group[0].open,
      high: Math.max(...group.map((c: Candle) => c.high)),
      low: Math.min(...group.map((c: Candle) => c.low)),
      close: group[group.length - 1].close,
      volume: group.reduce((sum: number, c: Candle) => sum + c.volume, 0),
    });
  }
  return result.sort((a, b) => a.time - b.time);
}

// Interval to Yahoo params mapping
function getYahooParams(interval: string): { yahooInterval: string; range: string; aggregateMinutes?: number; aggregateWeekly?: boolean } {
  const map: Record<string, { yahooInterval: string; range: string; aggregateMinutes?: number; aggregateWeekly?: boolean }> = {
    '1m': { yahooInterval: '1m', range: '7d' },
    '3m': { yahooInterval: '1m', range: '7d', aggregateMinutes: 3 },
    '5m': { yahooInterval: '5m', range: '60d' },
    '15m': { yahooInterval: '15m', range: '60d' },
    '30m': { yahooInterval: '30m', range: '60d' },
    '1h': { yahooInterval: '60m', range: '730d' },
    '2h': { yahooInterval: '60m', range: '730d', aggregateMinutes: 120 },
    '3h': { yahooInterval: '60m', range: '730d', aggregateMinutes: 180 },
    '4h': { yahooInterval: '60m', range: '730d', aggregateMinutes: 240 },
    '1d': { yahooInterval: '1d', range: '5y' },
    '1w': { yahooInterval: '1d', range: '10y', aggregateWeekly: true },
    '1mo': { yahooInterval: '1mo', range: 'max' },
  };
  return map[interval] || { yahooInterval: '1d', range: 'max' };
}

async function fetchYahooChart(symbol: string, interval: string, range: string): Promise<Candle[]> {
  const cacheKey = `yahoo:${symbol}:${interval}:${range}`;
  const cached = getCached<Candle[]>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includeAdjustedClose=true`;

  const res = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    timeout: 30000,
  });

  const data = res.data;
  if (!data?.chart?.result?.[0]) throw new Error('No data from Yahoo Finance');

  const result = data.chart.result[0];
  const timestamps = result.timestamp || [];
  const quotes = result.indicators.quote[0];

  const candles: Candle[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (quotes.open[i] != null && quotes.close[i] != null && quotes.volume[i] != null) {
      candles.push({
        time: timestamps[i] * 1000,
        open: quotes.open[i],
        high: quotes.high[i],
        low: quotes.low[i],
        close: quotes.close[i],
        volume: quotes.volume[i],
      });
    }
  }

  const ttl = ['1d', '1wk', '1mo'].includes(interval) ? 600000 : 120000;
  setCache(cacheKey, candles, ttl);
  return candles;
}

export const stockRouter = router({
  getChart: publicProcedure
    .input(z.object({
      symbol: z.string(),
      interval: z.string(),
    }))
    .query(async ({ input }) => {
      const { symbol, interval } = input;
      const params = getYahooParams(interval);
      const { yahooInterval, range, aggregateMinutes } = params;

      let candles: Candle[];
      
      try {
        // 尝试从 Yahoo Finance 获取数据
        candles = await fetchYahooChart(symbol, yahooInterval, range);
        console.log(`[DataSource] Yahoo Finance success for ${symbol} ${interval}`);
      } catch (yahooError) {
        console.warn(`[DataSource] Yahoo Finance failed for ${symbol} ${interval}, switching to Finnhub...`, yahooError);
        
        try {
          // 自动切换到 Finnhub 备用数据源
          candles = await fetchFinnhubCandles(symbol, interval);
          console.log(`[DataSource] Finnhub success for ${symbol} ${interval}`);
        } catch (finnhubError) {
          console.warn(`[DataSource] Finnhub failed for ${symbol} ${interval}, switching to Alpha Vantage...`, finnhubError);
          
          try {
            // 自动切换到 Alpha Vantage 第三个备用数据源
            candles = await fetchAlphaVantageCandles(symbol, interval);
            console.log(`[DataSource] Alpha Vantage success for ${symbol} ${interval}`);
          } catch (alphaError) {
            console.error(`[DataSource] All three data sources failed for ${symbol} ${interval}`);
            throw new Error('Failed to fetch data from all available sources (Yahoo, Finnhub, Alpha Vantage)');
          }
        }
      }

      // Filter and aggregate for intraday intervals
      if (['1m', '3m', '5m', '15m', '30m', '1h', '2h', '3h', '4h'].includes(interval)) {
        // For 1m, 5m, 15m, 30m, 1h, we still pass through aggregateCandles to filter hours and align time
        const aggMin = aggregateMinutes || (
          interval === '1m' ? 1 :
          interval === '5m' ? 5 :
          interval === '15m' ? 15 :
          interval === '30m' ? 30 :
          interval === '1h' ? 60 : 1
        );
        candles = aggregateCandles(candles, aggMin);
      }

      // Aggregate daily to weekly
      if (params.aggregateWeekly) {
        candles = aggregateDailyToWeekly(candles);
      }

      return candles;
    }),

  getQuote: publicProcedure
    .input(z.object({
      symbol: z.string(),
    }))
    .query(async ({ input }) => {
      const cacheKey = `quote:${input.symbol}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      let quote: any;
      
      try {
        // 尝试从 Yahoo Finance 获取报价
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(input.symbol)}?interval=1d&range=1d`;
        const res = await axios.get(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
          timeout: 15000,
        });

        const data = res.data;
        if (!data?.chart?.result?.[0]) throw new Error('No quote data');

        const meta = data.chart.result[0].meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.previousClose || meta.chartPreviousClose;

        quote = {
          symbol: meta.symbol,
          name: meta.longName || meta.shortName || input.symbol,
          price,
          change: price - prevClose,
          changePercent: ((price - prevClose) / prevClose) * 100,
          volume: meta.regularMarketVolume || 0,
        };
        
        console.log(`[DataSource] Yahoo Finance quote success for ${input.symbol}`);
      } catch (yahooError) {
        console.warn(`[DataSource] Yahoo Finance quote failed for ${input.symbol}, switching to Finnhub...`);
        
        try {
          // 自动切换到 Finnhub 备用数据源
          const finnhubQuote = await fetchFinnhubQuote(input.symbol);
          quote = {
            symbol: input.symbol,
            name: input.symbol,
            ...finnhubQuote,
          };
          console.log(`[DataSource] Finnhub quote success for ${input.symbol}`);
        } catch (finnhubError) {
          console.warn(`[DataSource] Finnhub quote failed for ${input.symbol}, switching to Alpha Vantage...`);
          
          try {
            // 自动切换到 Alpha Vantage 第三个备用数据源
            const alphaQuote = await fetchAlphaVantageQuote(input.symbol);
            quote = {
              symbol: input.symbol,
              name: input.symbol,
              ...alphaQuote,
            };
            console.log(`[DataSource] Alpha Vantage quote success for ${input.symbol}`);
          } catch (alphaError) {
            console.error(`[DataSource] All three data sources failed for quote ${input.symbol}`);
            throw new Error('Failed to fetch quote from all available sources (Yahoo, Finnhub, Alpha Vantage)');
          }
        }
      }

      setCache(cacheKey, quote, 120000);
      return quote;
    }),

  batchQuotes: publicProcedure
    .input(z.object({
      symbols: z.array(z.string()),
    }))
    .query(async ({ input }) => {
      const results: Record<string, any> = {};
      
      for (const symbol of input.symbols) {
        try {
          const cacheKey = `quote:${symbol}`;
          const cached = getCached<any>(cacheKey);
          if (cached) {
            results[symbol] = cached;
            continue;
          }

          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
          const res = await axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            timeout: 10000,
          });

          const data = res.data;
          if (data?.chart?.result?.[0]) {
            const meta = data.chart.result[0].meta;
            const price = meta.regularMarketPrice;
            const prevClose = meta.previousClose || meta.chartPreviousClose;

            const quote = {
              symbol: meta.symbol,
              name: meta.longName || meta.shortName || symbol,
              price,
              change: price - prevClose,
              changePercent: ((price - prevClose) / prevClose) * 100,
              volume: meta.regularMarketVolume || 0,
            };

            setCache(cacheKey, quote, 120000);
            results[symbol] = quote;
          }
        } catch {
          // Skip failed quotes
        }
      }

      return results;
    }),

  getMomentum: publicProcedure
    .input(z.object({
      symbol: z.string(),
    }))
    .query(async ({ input }) => {
      const cacheKey = `momentum:${input.symbol}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      const momentum = await calculateMomentum(input.symbol);
      if (!momentum) {
        return {
          error: `Failed to calculate momentum for ${input.symbol}`,
          symbol: input.symbol,
          buyLine: 0,
          sellLine: 0,
          diffBar: 0,
          trend: "中立",
        };
      }

      const formatted = formatMomentumForChart(momentum);
      setCache(cacheKey, formatted, 1800000);
      return formatted;
    }),

  // Get company profile (market cap, description, sector)
  getCompanyProfile: publicProcedure
    .input(z.object({
      symbol: z.string(),
    }))
    .query(async ({ input }) => {
      const cacheKey = `profile:${input.symbol}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      try {
        // Use Finnhub API to get company profile
        const apiKey = process.env.FINNHUB_API_KEY;
        if (!apiKey) {
          throw new Error('Finnhub API key not configured');
        }

        const response = await axios.get(`https://finnhub.io/api/v1/stock/profile2`, {
          params: {
            symbol: input.symbol,
            token: apiKey,
          },
          timeout: 10000,
        });

        const data = response.data;
        
        // Format the result
        const result = {
          symbol: input.symbol,
          name: data.name || input.symbol,
          marketCap: data.marketCapitalization || 0, // in millions
          description: data.description || '',
          industry: data.finnhubIndustry || '',
          sector: data.sector || '',
          country: data.country || 'US',
          logo: data.logo || '',
          weburl: data.weburl || '',
          exchange: data.exchange || '',
          ipo: data.ipo || '',
        };

        setCache(cacheKey, result, 24 * 60 * 60 * 1000); // 24 hours
        return result;
      } catch (error: any) {
        console.error(`Failed to fetch company profile for ${input.symbol}:`, error.message);
        // Return minimal data on error
        return {
          symbol: input.symbol,
          name: input.symbol,
          marketCap: 0,
          description: '',
          industry: '',
          sector: '',
          country: 'US',
          logo: '',
          weburl: '',
          exchange: '',
          ipo: '',
        };
      }
    }),

  // Get top gainers (today's top 10 by change percent)
  getTopGainers: publicProcedure
    .input(z.object({
      limit: z.number().optional().default(10),
    }))
    .query(async ({ input }) => {
      const cacheKey = `topGainers:${input.limit}`;
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      try {
        // Import stock pool
        const { US_STOCKS } = await import('../shared/stockPool');
        
        // Fetch quotes for all stocks
        const quotes: Array<{ symbol: string; price: number; changePercent: number }> = [];
        
        for (const symbol of US_STOCKS) {
          try {
            const quoteKey = `quote:${symbol}`;
            let quote = getCached<any>(quoteKey);
            
            if (!quote) {
              // Fetch from Yahoo Finance
              const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
                params: { interval: '1d', range: '1d' },
                timeout: 5000,
              });

              const result = response.data?.chart?.result?.[0];
              if (!result) continue;

              const meta = result.meta;
              quote = {
                price: meta.regularMarketPrice || 0,
                changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
              };
              
              setCache(quoteKey, quote, 60000); // 1 minute cache
            }

            if (quote.price > 0) {
              quotes.push({
                symbol,
                price: quote.price,
                changePercent: quote.changePercent,
              });
            }
          } catch (err) {
            // Skip failed quotes
          }
        }

        // Sort by change percent and take top N
        const topGainers = quotes
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, input.limit);

        setCache(cacheKey, topGainers, 300000); // 5 minutes
        return topGainers;
      } catch (error: any) {
        console.error('Failed to fetch top gainers:', error.message);
        return [];
      }
    }),

  // Get recommended momentum stocks
  // Simplified version: returns top gainers with high volume
  getRecommendedStocks: publicProcedure
    .query(async () => {
      const cacheKey = 'recommendedStocks';
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      try {
        const { US_STOCKS } = await import('../shared/stockPool');
        
        const recommended: Array<{ 
          symbol: string; 
          price: number; 
          changePercent: number;
          reason: string;
        }> = [];

        // Check top 30 stocks by popularity
        const stocksToCheck = US_STOCKS.slice(0, 30);

        for (const symbol of stocksToCheck) {
          try {
            const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
              params: { interval: '1d', range: '5d' },
              timeout: 5000,
            });

            const result = response.data?.chart?.result?.[0];
            if (!result) continue;

            const meta = result.meta;
            const changePercent = ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100;

            // Recommend stocks with positive momentum (>2% gain)
            if (changePercent > 2) {
              recommended.push({
                symbol,
                price: meta.regularMarketPrice || 0,
                changePercent,
                reason: '强势上涨，动能良好',
              });
            }
          } catch (err) {
            // Skip failed stocks
          }
        }

        // Sort by change percent and take top 10
        const topRecommended = recommended
          .sort((a, b) => b.changePercent - a.changePercent)
          .slice(0, 10);

        setCache(cacheKey, topRecommended, 600000); // 10 minutes
        return topRecommended;
      } catch (error: any) {
        console.error('Failed to fetch recommended stocks:', error.message);
        return [];
      }
    }),

  // Get sector rankings (top stocks by sector)
  getSectorRankings: publicProcedure
    .query(async () => {
      const cacheKey = 'sectorRankings';
      const cached = getCached<any>(cacheKey);
      if (cached) return cached;

      try {
        // Import stock pool
        const { STOCK_POOL, SECTOR_NAMES, getStocksBySector } = await import('../shared/stockPool');
        
        const sectors = ['AI', 'Semiconductor', 'Bitcoin', 'EV', 'Cloud', 'Energy'];
        const rankings: Record<string, any[]> = {};

        for (const sector of sectors) {
          const stocks = getStocksBySector(sector as any);
          const sectorStocks: Array<{ symbol: string; price: number; changePercent: number }> = [];

          for (const symbol of stocks.slice(0, 10)) { // Top 10 per sector
            try {
              const quoteKey = `quote:${symbol}`;
              let quote = getCached<any>(quoteKey);
              
              if (!quote) {
                const response = await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, {
                  params: { interval: '1d', range: '1d' },
                  timeout: 5000,
                });

                const result = response.data?.chart?.result?.[0];
                if (!result) continue;

                const meta = result.meta;
                quote = {
                  price: meta.regularMarketPrice || 0,
                  changePercent: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) * 100,
                };
                
                setCache(quoteKey, quote, 60000);
              }

              if (quote.price > 0) {
                sectorStocks.push({
                  symbol,
                  price: quote.price,
                  changePercent: quote.changePercent,
                });
              }
            } catch (err) {
              // Skip
            }
          }

          // Sort by change percent
          rankings[sector] = sectorStocks
            .sort((a, b) => b.changePercent - a.changePercent)
            .slice(0, 5);
        }

        setCache(cacheKey, rankings, 300000); // 5 minutes
        return rankings;
      } catch (error: any) {
        console.error('Failed to fetch sector rankings:', error.message);
        return {};
      }
    }),
});
