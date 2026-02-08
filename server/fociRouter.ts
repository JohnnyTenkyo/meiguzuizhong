import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

const FOCI_MCP_URL = "https://gbmrzpnasfxsewvxclun.supabase.co/functions/v1/mcp/mcp";
const FOCI_API_KEY = "mm_VSinPRmcMAoo1jCK2ToBQhoAi0g8ZCKLCnVrD7YkTBE";

// In-memory cache for FOCI data
const fociCache: Map<string, { data: any; expires: number }> = new Map();

function getFociCached<T>(key: string): T | null {
  const entry = fociCache.get(key);
  if (entry && Date.now() < entry.expires) return entry.data as T;
  fociCache.delete(key);
  return null;
}

function setFociCache(key: string, data: any, ttlMs: number) {
  fociCache.set(key, { data, expires: Date.now() + ttlMs });
}

async function callMcpTool(toolName: string, args: Record<string, any>): Promise<any> {
  const response = await fetch(FOCI_MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${FOCI_API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: {
        name: toolName,
        arguments: args,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`FOCI MCP call failed: ${response.status} ${response.statusText}`);
  }

  const result = await response.json();
  if (result.error) {
    throw new Error(`FOCI MCP error: ${result.error.message || JSON.stringify(result.error)}`);
  }

  // Parse the text content from MCP response
  const content = result.result?.content;
  if (content && content.length > 0 && content[0].type === "text") {
    try {
      return JSON.parse(content[0].text);
    } catch {
      return content[0].text;
    }
  }
  return result.result;
}

export const fociRouter = router({
  // Get daily market summary
  getDailySummary: publicProcedure
    .input(z.object({
      date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      console.log("[FOCI] getDailySummary called with:", input);
      const date = input.date || new Date().toISOString().split("T")[0];
      const cacheKey = `foci:daily:${date}`;
      const cached = getFociCached<any>(cacheKey);
      if (cached) return cached;

      try {
        const data = await callMcpTool("get_daily_summary", { date });
        console.log("[FOCI] getDailySummary SUCCESS for", date);
        setFociCache(cacheKey, data, 5 * 60 * 1000); // 5 min cache
        return data;
      } catch (err) {
        console.error("[FOCI] getDailySummary FAILED:", err);
        throw err;
      }
    }),

  // Get ticker sentiment
  getTickerSentiment: publicProcedure
    .input(z.object({
      ticker: z.string(),
      date: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const cacheKey = `foci:sentiment:${input.ticker}:${input.date || ""}:${input.start_date || ""}:${input.end_date || ""}`;
      const cached = getFociCached<any>(cacheKey);
      if (cached) return cached;

      const args: Record<string, any> = { ticker: input.ticker };
      if (input.date) args.date = input.date;
      if (input.start_date) args.start_date = input.start_date;
      if (input.end_date) args.end_date = input.end_date;

      const data = await callMcpTool("get_ticker_sentiment", args);
      setFociCache(cacheKey, data, 5 * 60 * 1000);
      return data;
    }),

  // Get blogger positions
  getBloggerPositions: publicProcedure
    .input(z.object({
      blogger_name: z.string(),
      days: z.number().optional(),
      sentiment: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const cacheKey = `foci:blogger:${input.blogger_name}:${input.days || 30}:${input.sentiment || ""}`;
      const cached = getFociCached<any>(cacheKey);
      if (cached) return cached;

      const args: Record<string, any> = { blogger_name: input.blogger_name };
      if (input.days) args.days = input.days;
      if (input.sentiment) args.sentiment = input.sentiment;

      const data = await callMcpTool("get_blogger_positions", args);
      setFociCache(cacheKey, data, 5 * 60 * 1000);
      return data;
    }),

  // List bloggers
  listBloggers: publicProcedure.query(async () => {
    const cacheKey = "foci:bloggers";
    const cached = getFociCached<any>(cacheKey);
    if (cached) return cached;

    const data = await callMcpTool("list_bloggers", {});
    setFociCache(cacheKey, data, 30 * 60 * 1000); // 30 min cache
    return data;
  }),

  // Search viewpoints
  searchViewpoints: publicProcedure
    .input(z.object({
      keywords: z.string(),
      ticker: z.string().optional(),
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      limit: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const cacheKey = `foci:search:${input.keywords}:${input.ticker || ""}:${input.limit || 50}`;
      const cached = getFociCached<any>(cacheKey);
      if (cached) return cached;

      const args: Record<string, any> = { keywords: input.keywords };
      if (input.ticker) args.ticker = input.ticker;
      if (input.start_date) args.start_date = input.start_date;
      if (input.end_date) args.end_date = input.end_date;
      if (input.limit) args.limit = input.limit;

      const data = await callMcpTool("search_viewpoints", args);
      setFociCache(cacheKey, data, 3 * 60 * 1000); // 3 min cache
      return data;
    }),

  // List tickers
  listTickers: publicProcedure.query(async () => {
    const cacheKey = "foci:tickers";
    const cached = getFociCached<any>(cacheKey);
    if (cached) return cached;

    const data = await callMcpTool("list_tickers", {});
    setFociCache(cacheKey, data, 10 * 60 * 1000); // 10 min cache
    return data;
  }),

  // AI Chat - uses LLM with FOCI data context
  chat: publicProcedure
    .input(z.object({
      message: z.string(),
      context: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // First, determine what FOCI tools to call based on the user message
      const message = input.message.toLowerCase();
      let fociData: any[] = [];

      // Auto-detect tickers mentioned
      const tickerMatch = input.message.match(/\b[A-Z]{1,5}\b/g);
      const tickers = tickerMatch ? Array.from(new Set(tickerMatch)).filter(t => t.length >= 2 && t.length <= 5) : [];

      // Get daily summary
      try {
        const today = new Date().toISOString().split("T")[0];
        const summary = await callMcpTool("get_daily_summary", { date: today });
        fociData.push({ type: "daily_summary", data: summary });
      } catch (e) {
        // Skip if fails
      }

      // Get sentiment for mentioned tickers
      for (const ticker of tickers.slice(0, 3)) {
        try {
          const sentiment = await callMcpTool("get_ticker_sentiment", { ticker });
          fociData.push({ type: "ticker_sentiment", ticker, data: sentiment });
        } catch (e) {
          // Skip if fails
        }
      }

      // Search viewpoints if keywords present
      if (message.includes("观点") || message.includes("看法") || message.includes("分析")) {
        try {
          const keywords = tickers.length > 0 ? tickers[0] : input.message.slice(0, 20);
          const viewpoints = await callMcpTool("search_viewpoints", { keywords, limit: 10 });
          fociData.push({ type: "viewpoints", data: viewpoints });
        } catch (e) {
          // Skip
        }
      }

      // Build response using LLM
      const { invokeLLM } = await import("./_core/llm");
      
      const systemPrompt = `你是 FOCI 智能助手（Focus On Core Ideas），一个专业的美股财经AI助手。
你的数据来源于 AlphaMoe 平台，追踪 60+ 中文财经博主的实时观点和持仓。

你的能力包括：
- 分析股票情绪（看涨/看跌/中性/观望）
- 提供每日市场摘要
- 追踪博主持仓和分析逻辑
- 搜索特定话题的观点

回答时请：
1. 使用中文回答
2. 基于实际数据给出分析
3. 标注数据来源（博主名称）
4. 给出简洁但有深度的分析
5. 适当使用 emoji 增加可读性

以下是从 FOCI 系统获取的实时数据：
${JSON.stringify(fociData, null, 2)}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...(input.context ? [{ role: "assistant" as const, content: input.context }] : []),
          { role: "user", content: input.message },
        ],
      });

      const aiResponse = result.choices[0]?.message?.content;
      return {
        response: typeof aiResponse === "string" ? aiResponse : JSON.stringify(aiResponse),
        fociData,
      };
    }),
});
