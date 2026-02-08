import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  MessageCircle, X, Send, Loader2, TrendingUp, TrendingDown, 
  BarChart3, Users, Search, Newspaper, ChevronDown, ChevronUp,
  Sparkles, Bot, Minus, ArrowUpRight, ArrowDownRight, Eye,
  Flame, Sun, Hash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

const FOCI_MCP_URL = "https://gbmrzpnasfxsewvxclun.supabase.co/functions/v1/mcp/mcp";
const FOCI_API_KEY = "mm_VSinPRmcMAoo1jCK2ToBQhoAi0g8ZCKLCnVrD7YkTBE";

async function callFociTool(toolName: string, args: Record<string, any>): Promise<any> {
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
      params: { name: toolName, arguments: args },
    }),
  });
  if (!response.ok) throw new Error(`FOCI API error: ${response.status}`);
  const result = await response.json();
  if (result.error) throw new Error(result.error.message || 'FOCI API error');
  const content = result.result?.content;
  if (content && content.length > 0 && content[0].type === "text") {
    try { return JSON.parse(content[0].text); } catch { return content[0].text; }
  }
  throw new Error('Invalid FOCI response');
}

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  toolUsed?: string;
};

function getLatestDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// Extract ticker from user message
function extractTicker(msg: string): string | null {
  // Match uppercase tickers like NVDA, TSLA, AAPL, ^DJI, BTC-USD
  const match = msg.match(/\b([A-Z]{1,5}(?:-[A-Z]{1,4})?)\b/);
  return match ? match[1] : null;
}

// Detect user intent
function detectIntent(msg: string): { tool: string; args: Record<string, any>; description: string } {
  const lower = msg.toLowerCase();
  const ticker = extractTicker(msg);
  const date = getLatestDate();

  // Stock-specific queries
  if (ticker && (lower.includes('情绪') || lower.includes('分析') || lower.includes('怎么样') || 
      lower.includes('怎样') || lower.includes('如何') || lower.includes('看法') || 
      lower.includes('观点') || lower.includes('多空') || lower.includes('详情') ||
      lower.includes('sentiment') || lower.includes('analysis'))) {
    return { tool: 'get_ticker_sentiment', args: { ticker }, description: `正在分析 ${ticker} 的市场情绪...` };
  }

  // Direct ticker query (just a ticker symbol)
  if (/^[A-Z]{1,5}$/.test(msg.trim())) {
    return { tool: 'get_ticker_sentiment', args: { ticker: msg.trim() }, description: `正在查询 ${msg.trim()} 的详细信息...` };
  }

  // Blogger positions
  if (lower.includes('博主') && (lower.includes('持仓') || lower.includes('仓位'))) {
    const bloggerName = msg.replace(/博主|持仓|仓位|查看|请|帮我|的/g, '').trim();
    if (bloggerName && bloggerName.length > 1) {
      return { tool: 'get_blogger_positions', args: { blogger_name: bloggerName, days: 7 }, description: `正在查询 ${bloggerName} 的持仓...` };
    }
    return { tool: 'list_bloggers', args: {}, description: '正在获取博主列表...' };
  }

  // Blogger list
  if (lower.includes('博主') && (lower.includes('列表') || lower.includes('有哪些') || lower.includes('名单'))) {
    return { tool: 'list_bloggers', args: {}, description: '正在获取博主列表...' };
  }

  // Market summary
  if (lower.includes('摘要') || lower.includes('概览') || lower.includes('总结') || lower.includes('summary')) {
    return { tool: 'get_daily_summary', args: { date }, description: '正在获取今日市场摘要...' };
  }

  // Bullish/bearish queries
  if (lower.includes('看涨') || lower.includes('看好') || lower.includes('买什么') || lower.includes('bullish')) {
    return { tool: 'get_daily_summary', args: { date }, description: '正在查询今日看涨共识...' };
  }
  if (lower.includes('看跌') || lower.includes('风险') || lower.includes('避开') || lower.includes('bearish')) {
    return { tool: 'get_daily_summary', args: { date }, description: '正在查询今日风险预警...' };
  }

  // Today / market
  if (lower.includes('今天') || lower.includes('今日') || lower.includes('市场') || lower.includes('早报')) {
    return { tool: 'get_daily_summary', args: { date }, description: '正在生成今日市场早报...' };
  }

  // Search
  if (lower.includes('搜索') || lower.includes('search') || lower.includes('查找')) {
    const keyword = msg.replace(/搜索|search|请|帮我|查找|关于|的|观点|分析/gi, '').trim();
    return { tool: 'search_viewpoints', args: { keyword: keyword || msg }, description: `正在搜索 "${keyword || msg}" 相关观点...` };
  }

  // Ticker list
  if (lower.includes('热门') || lower.includes('排行') || lower.includes('top') || lower.includes('排名')) {
    return { tool: 'list_tickers', args: {}, description: '正在获取热门标的排行...' };
  }

  // If message contains a ticker, default to sentiment analysis
  if (ticker) {
    return { tool: 'get_ticker_sentiment', args: { ticker }, description: `正在分析 ${ticker}...` };
  }

  // Default: try search
  return { tool: 'search_viewpoints', args: { keyword: msg }, description: `正在搜索相关观点...` };
}

export default function FociAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHint, setLoadingHint] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      const viewport = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
      if (viewport) {
        requestAnimationFrame(() => {
          viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        });
      }
    }
  }, [messages, isLoading]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const intent = detectIntent(msg);
      setLoadingHint(intent.description);

      let response = '';
      const data = await callFociTool(intent.tool, intent.args);

      switch (intent.tool) {
        case 'get_ticker_sentiment':
          response = formatTickerSentiment(intent.args.ticker, data);
          break;
        case 'get_daily_summary':
          response = formatDailySummary(data, msg);
          break;
        case 'get_blogger_positions':
          response = formatBloggerPositions(intent.args.blogger_name, data);
          break;
        case 'list_bloggers':
          response = formatBloggerList(data);
          break;
        case 'list_tickers':
          response = formatTickerList(data);
          break;
        case 'search_viewpoints':
          response = formatSearchResults(intent.args.keyword, data);
          break;
        default:
          response = '暂时无法处理该请求，请尝试其他问题。';
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response,
        timestamp: Date.now(),
        toolUsed: intent.tool,
      }]);
    } catch (error: any) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `抱歉，请求出错了：${error.message || '未知错误'}。请稍后再试。`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setLoadingHint('');
    }
  }, [input, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    { label: '今日市场摘要', icon: <Newspaper size={12} /> },
    { label: 'NVDA 情绪分析', icon: <TrendingUp size={12} /> },
    { label: 'TSLA 怎么样', icon: <Search size={12} /> },
    { label: '今天看涨什么', icon: <ArrowUpRight size={12} /> },
    { label: '风险预警', icon: <TrendingDown size={12} /> },
    { label: '热门标的排行', icon: <Flame size={12} /> },
    { label: '博主列表', icon: <Users size={12} /> },
    { label: 'NaNa说美股 博主持仓', icon: <Eye size={12} /> },
  ];

  // Floating button
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 active:scale-95"
      >
        <Bot size={20} />
        <span className="text-sm font-medium">FOCI 助手</span>
        <span className="flex h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
      </button>
    );
  }

  return (
    <div className={cn(
      "fixed z-50 bg-background border border-border rounded-xl shadow-2xl shadow-black/20 flex flex-col transition-all duration-200",
      isMinimized
        ? "bottom-5 right-5 w-[320px] h-[48px]"
        : "bottom-5 right-5 w-[400px] h-[600px] max-h-[85vh]"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border bg-card/50 rounded-t-xl shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <Bot className="size-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-semibold">FOCI 智能助手</h3>
            <p className="text-[10px] text-muted-foreground">输入股票代码或问题，获取实时分析</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 rounded hover:bg-accent transition-colors">
            {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 rounded hover:bg-accent transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 overflow-hidden">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-4 gap-4">
                <div className="size-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                  <Bot className="size-6 text-emerald-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium mb-1">FOCI 智能助手</p>
                  <p className="text-xs text-muted-foreground">
                    输入股票代码查看详情，或问我任何关于美股的问题
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center max-w-[340px]">
                  {quickPrompts.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => handleSend(p.label)}
                      className="flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-full border border-border bg-background/50 hover:bg-accent/50 transition-colors text-muted-foreground hover:text-foreground"
                    >
                      {p.icon}
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="flex flex-col gap-3 p-3">
                  {messages.map((msg, i) => (
                    <div key={i} className={cn('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {msg.role === 'assistant' && (
                        <div className="size-6 shrink-0 mt-0.5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                          <Bot className="size-3 text-emerald-400" />
                        </div>
                      )}
                      <div className={cn(
                        'max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed',
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-xs dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-foreground" 
                            dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }} 
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-start gap-2">
                      <div className="size-6 shrink-0 mt-0.5 rounded-full bg-emerald-500/15 flex items-center justify-center">
                        <Bot className="size-3 text-emerald-400" />
                      </div>
                      <div className="rounded-lg bg-muted px-3 py-2 flex items-center gap-2">
                        <Loader2 className="size-3 animate-spin text-emerald-400" />
                        <span className="text-[11px] text-muted-foreground">{loadingHint || '思考中...'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Quick prompts after conversation started */}
          {messages.length > 0 && !isLoading && (
            <div className="px-2 py-1.5 border-t border-border/50 flex gap-1 overflow-x-auto shrink-0">
              {['NVDA', 'TSLA', 'AAPL', 'AMZN', 'META', 'GOOG'].map(t => (
                <button key={t} onClick={() => handleSend(t)}
                  className="text-[10px] px-2 py-1 rounded-full border border-border bg-background/50 hover:bg-accent/50 transition-colors text-muted-foreground whitespace-nowrap shrink-0">
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t border-border p-2 bg-background/50 shrink-0">
            <div className="flex gap-1.5 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入股票代码 (如 NVDA) 或问题..."
                className="flex-1 resize-none bg-secondary rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/50 min-h-[34px] max-h-[80px]"
                rows={1}
              />
              <Button
                size="icon"
                className="shrink-0 h-[34px] w-[34px] bg-emerald-600 hover:bg-emerald-500"
                disabled={!input.trim() || isLoading}
                onClick={() => handleSend()}
              >
                {isLoading ? <Loader2 className="size-3 animate-spin" /> : <Send className="size-3" />}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// === Format Helpers ===

function formatDailySummary(data: any, query: string): string {
  const lower = query.toLowerCase();
  let result = `## 📊 今日市场摘要 (${data.date})\n\n`;
  
  const total = Object.values(data.sentiment_distribution || {}).reduce((a: number, b: any) => a + Number(b), 0);
  result += `**情绪分布** (共 ${total} 条观点)：\n`;
  for (const [key, val] of Object.entries(data.sentiment_distribution || {})) {
    const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(0) : '0';
    result += `- ${key}: **${val}** (${pct}%)\n`;
  }

  if (!lower.includes('看跌') && !lower.includes('风险')) {
    result += `\n### 🔴 看涨共识 TOP 5\n`;
    (data.top_bullish_tickers || []).slice(0, 5).forEach((t: any, i: number) => {
      result += `${i + 1}. **${t.ticker}** — ${t.mention_count} 位博主看涨\n`;
      if (t.bloggers) result += `   _${t.bloggers}_\n`;
    });
  }

  if (!lower.includes('看涨') && !lower.includes('看好')) {
    result += `\n### 🟢 看跌预警 TOP 5\n`;
    (data.top_bearish_tickers || []).slice(0, 5).forEach((t: any, i: number) => {
      result += `${i + 1}. **${t.ticker}** — ${t.mention_count} 位博主看跌\n`;
      if (t.bloggers) result += `   _${t.bloggers}_\n`;
    });
  }

  result += `\n---\n_${data.statistics?.blogger_count || 0} 位博主 · ${data.statistics?.ticker_count || 0} 只标的 · ${data.statistics?.total_viewpoints || 0} 条观点_`;
  return result;
}

function formatTickerSentiment(ticker: string, data: any): string {
  if (typeof data === 'string') return data;
  let result = `## 📈 ${ticker} 深度分析\n\n`;
  
  // Sentiment distribution
  if (data.sentiment_distribution) {
    const total = data.total_viewpoints || 0;
    result += `**情绪分布** (${total} 条观点)：\n`;
    for (const [key, val] of Object.entries(data.sentiment_distribution)) {
      const pct = total > 0 ? ((Number(val) / total) * 100).toFixed(0) : '0';
      const emoji = key === '看涨' ? '🔴' : key === '看跌' ? '🟢' : key === '震荡' ? '🔵' : '🟡';
      result += `- ${emoji} ${key}: **${val}** (${pct}%)\n`;
    }
  }

  // Latest viewpoints with reasoning
  if (data.viewpoints && data.viewpoints.length > 0) {
    result += `\n### 最新博主观点\n`;
    const shown = new Set<string>();
    data.viewpoints.slice(0, 8).forEach((v: any) => {
      const key = v.channel_name + v.sentiment;
      if (shown.has(key)) return;
      shown.add(key);
      const emoji = v.sentiment === '看涨' ? '🔴' : v.sentiment === '看跌' ? '🟢' : v.sentiment === '震荡' ? '🔵' : '🟡';
      result += `\n**${v.channel_name}** ${emoji} ${v.sentiment}`;
      if (v.slot) result += ` · ${v.slot}`;
      if (v.date) result += ` · ${v.date}`;
      result += '\n';
      if (v.reasoning) {
        result += `> ${v.reasoning}\n`;
      }
    });
  }

  return result || `暂无 ${ticker} 的情绪数据`;
}

function formatBloggerPositions(name: string, data: any): string {
  if (typeof data === 'string') return data;
  let result = `## 👤 ${name} 持仓追踪\n\n`;
  result += `**统计**: ${data.total_viewpoints} 条观点 · ${data.unique_tickers} 只标的\n\n`;

  // Top tickers
  const tickers = Object.entries(data.tickers_summary || {}).slice(0, 10);
  if (tickers.length > 0) {
    result += `### 关注标的\n`;
    tickers.forEach(([ticker, info]: [string, any]) => {
      const latest = info.sentiments?.[info.sentiments.length - 1] || '观望';
      const emoji = latest === '看涨' ? '🔴' : latest === '看跌' ? '🟢' : latest === '震荡' ? '🔵' : '🟡';
      result += `- **${ticker}** ${emoji} ${latest} (${info.count}次提及)\n`;
    });
  }

  // Latest viewpoints
  if (data.viewpoints && data.viewpoints.length > 0) {
    result += `\n### 最新观点\n`;
    data.viewpoints.slice(0, 5).forEach((v: any) => {
      result += `\n**${v.ticker}** · ${v.sentiment} · ${v.date}\n`;
      if (v.reasoning) result += `> ${v.reasoning}\n`;
    });
  }

  return result;
}

function formatBloggerList(data: any): string {
  if (typeof data === 'string') return data;
  let result = `## 👥 财经博主列表\n\n`;
  result += `共 **${data.total_bloggers || 0}** 位博主\n\n`;
  const bloggers = data.bloggers || [];
  bloggers.forEach((name: string, i: number) => {
    result += `${i + 1}. ${name}\n`;
  });
  result += `\n---\n_输入 "XXX 博主持仓" 查看具体博主的持仓详情_`;
  return result;
}

function formatTickerList(data: any): string {
  if (typeof data === 'string') return data;
  let result = `## 🔥 热门标的排行\n\n`;
  result += `共 **${data.total_tickers || 0}** 只标的\n\n`;
  
  const topMentioned = data.top_mentioned || [];
  if (topMentioned.length > 0) {
    result += `### 提及次数 TOP 10\n`;
    topMentioned.slice(0, 10).forEach((t: any, i: number) => {
      result += `${i + 1}. **${t.ticker}** — ${t.mention_count} 次提及\n`;
    });
  }

  result += `\n---\n_输入股票代码查看详细情绪分析_`;
  return result;
}

function formatSearchResults(keyword: string, data: any): string {
  if (typeof data === 'string') return data;
  let result = `## 🔍 搜索结果：${keyword}\n\n`;
  const items = data.results || [];
  if (items.length === 0) {
    return `未找到与 "${keyword}" 相关的观点。\n\n_提示：尝试搜索股票代码（如 NVDA）或关键词（如 AI、半导体）_`;
  }
  result += `找到 **${data.total_results || items.length}** 条相关观点\n\n`;
  items.slice(0, 8).forEach((item: any, i: number) => {
    const emoji = item.sentiment === '看涨' ? '🔴' : item.sentiment === '看跌' ? '🟢' : '🟡';
    result += `**${i + 1}. ${item.channel_name || '匿名'}** ${emoji} ${item.sentiment || ''}`;
    if (item.ticker) result += ` [${item.ticker}]`;
    result += '\n';
    if (item.reasoning) result += `> ${item.reasoning}\n`;
    result += '\n';
  });
  return result;
}

// Simple markdown to HTML converter
function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em class="text-muted-foreground">$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-muted px-1 py-0.5 rounded text-[11px]">$1</code>')
    .replace(/^### (.*$)/gm, '<h3 class="font-semibold mt-2 mb-1 text-xs">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="font-semibold mt-2 mb-1 text-sm">$1</h2>')
    .replace(/^> (.*$)/gm, '<blockquote class="border-l-2 border-emerald-500/30 pl-2 my-1 text-muted-foreground italic">$1</blockquote>')
    .replace(/^---$/gm, '<hr class="border-border my-2" />')
    .replace(/^- (.*$)/gm, '<li class="ml-3 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-3 list-decimal">$2</li>')
    .replace(/\n\n/g, '</p><p class="my-1">')
    .replace(/\n/g, '<br/>');
}
