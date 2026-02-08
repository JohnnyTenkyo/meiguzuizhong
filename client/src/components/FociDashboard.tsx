import { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, BarChart3, Sparkles, 
  Bot, ArrowUpRight, ArrowDownRight, Minus, ExternalLink,
  Newspaper, Eye, Flame, Sun, Users, ChevronRight, Loader2, Hash
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';

const FOCI_MCP_URL = "https://gbmrzpnasfxsewvxclun.supabase.co/functions/v1/mcp/mcp";
const FOCI_API_KEY = "mm_VSinPRmcMAoo1jCK2ToBQhoAi0g8ZCKLCnVrD7YkTBE";

async function callFoci(toolName: string, args: Record<string, any>): Promise<any> {
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
    return JSON.parse(content[0].text);
  }
  throw new Error('Invalid FOCI response');
}

function getLatestTradingDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

type TabId = 'summary' | 'hot-topics' | 'briefing';

export default function FociDashboard() {
  const [, navigate] = useLocation();
  const today = getLatestTradingDate();
  const [activeTab, setActiveTab] = useState<TabId>('summary');
  
  // Data states
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [hotTickers, setHotTickers] = useState<any>(null);
  const [hotTickerSentiments, setHotTickerSentiments] = useState<Record<string, any>>({});
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingHot, setLoadingHot] = useState(false);
  const [loadingBriefing, setLoadingBriefing] = useState(false);
  const [briefingData, setBriefingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Load daily summary on mount
  useEffect(() => {
    let cancelled = false;
    setLoadingSummary(true);
    callFoci("get_daily_summary", { date: today })
      .then(data => {
        if (!cancelled) { setDailySummary(data); setLoadingSummary(false); }
      })
      .catch(err => {
        if (!cancelled) { setError(err.message); setLoadingSummary(false); }
      });
    return () => { cancelled = true; };
  }, [today]);

  // Load hot topics when tab is selected
  useEffect(() => {
    if (activeTab === 'hot-topics' && !hotTickers && !loadingHot) {
      setLoadingHot(true);
      callFoci("list_tickers", {})
        .then(data => {
          setHotTickers(data);
          setLoadingHot(false);
          // Load sentiment for top 5
          const top5 = (data.top_mentioned || []).slice(0, 6);
          top5.forEach((t: any) => {
            callFoci("get_ticker_sentiment", { ticker: t.ticker })
              .then(s => setHotTickerSentiments(prev => ({ ...prev, [t.ticker]: s })))
              .catch(() => {});
          });
        })
        .catch(() => setLoadingHot(false));
    }
  }, [activeTab, hotTickers, loadingHot]);

  // Load briefing when tab is selected
  useEffect(() => {
    if (activeTab === 'briefing' && !briefingData && !loadingBriefing && dailySummary) {
      setLoadingBriefing(true);
      // Briefing = summary + top bullish/bearish details
      const topTickers = [
        ...(dailySummary.top_bullish_tickers || []).slice(0, 3).map((t: any) => t.ticker),
        ...(dailySummary.top_bearish_tickers || []).slice(0, 3).map((t: any) => t.ticker),
      ];
      const uniqueTickers = [...new Set(topTickers)];
      
      Promise.all(
        uniqueTickers.map(ticker =>
          callFoci("get_ticker_sentiment", { ticker })
            .then(data => ({ ticker, data }))
            .catch(() => null)
        )
      ).then(results => {
        const tickerDetails: Record<string, any> = {};
        results.filter(Boolean).forEach((r: any) => { tickerDetails[r.ticker] = r.data; });
        setBriefingData({ summary: dailySummary, tickerDetails });
        setLoadingBriefing(false);
      });
    }
  }, [activeTab, briefingData, loadingBriefing, dailySummary]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'summary', label: '每日摘要', icon: <Newspaper size={13} /> },
    { id: 'hot-topics', label: '热门话题', icon: <Flame size={13} /> },
    { id: 'briefing', label: '每日早报', icon: <Sun size={13} /> },
  ];

  const SentimentBadge = ({ sentiment, count, total }: { sentiment: string; count: number; total: number }) => {
    const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      '看涨': { bg: 'bg-red-500/15 border-red-500/20', text: 'text-red-400', icon: <ArrowUpRight size={12} /> },
      '看跌': { bg: 'bg-green-500/15 border-green-500/20', text: 'text-green-400', icon: <ArrowDownRight size={12} /> },
      '观望': { bg: 'bg-yellow-500/15 border-yellow-500/20', text: 'text-yellow-400', icon: <Eye size={12} /> },
      '震荡': { bg: 'bg-blue-500/15 border-blue-500/20', text: 'text-blue-400', icon: <BarChart3 size={12} /> },
    };
    const c = config[sentiment] || config['观望'];
    const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
    return (
      <div className={cn('flex flex-col items-center gap-1 px-3 py-2 rounded-lg border', c.bg)}>
        <div className={cn('flex items-center gap-1 text-sm font-bold', c.text)}>
          {c.icon} {count}
        </div>
        <div className="text-[10px] text-muted-foreground">{sentiment} ({pct}%)</div>
      </div>
    );
  };

  // Loading skeleton
  if (loadingSummary) {
    return (
      <section className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Bot size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold">FOCI 智能助手</h2>
            <p className="text-[10px] text-muted-foreground">AlphaMoe · 正在加载实时财经 KOL 情绪数据...</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-secondary animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-32 rounded-lg bg-secondary animate-pulse" />
          <div className="h-32 rounded-lg bg-secondary animate-pulse" />
        </div>
      </section>
    );
  }

  if (error || !dailySummary) {
    return (
      <section className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Bot size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold">FOCI 智能助手</h2>
            <p className="text-[10px] text-muted-foreground">数据加载失败，请稍后再试</p>
          </div>
        </div>
      </section>
    );
  }

  const totalSentiment = Object.values(dailySummary.sentiment_distribution || {}).reduce((a: number, b: any) => a + Number(b), 0);

  // === Tab Content Renderers ===
  
  const renderSummary = () => (
    <div className="space-y-4">
      {/* Sentiment Distribution */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={12} className="text-emerald-400" />
          <span className="text-xs font-medium text-muted-foreground">
            今日情绪分布 · {dailySummary.statistics?.total_viewpoints || 0} 条观点
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(dailySummary.sentiment_distribution || {}).map(([key, val]: [string, any]) => (
            <SentimentBadge key={key} sentiment={key} count={val} total={totalSentiment} />
          ))}
        </div>
      </div>

      {/* Bullish & Bearish */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3">
          <h3 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
            <TrendingUp size={12} /> 看涨共识 TOP 5
          </h3>
          <div className="space-y-1.5">
            {(dailySummary.top_bullish_tickers || []).slice(0, 5).map((item: any, i: number) => (
              <div key={item.ticker} onClick={() => navigate(`/stock/${item.ticker}`)}
                className="flex items-center justify-between text-xs cursor-pointer hover:bg-red-500/10 rounded px-1.5 py-1 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/50 w-3 text-[10px]">{i + 1}</span>
                  <span className="font-bold text-red-400">{item.ticker}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{item.mention_count} 位博主</span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-lg border border-green-500/10 bg-green-500/5 p-3">
          <h3 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
            <TrendingDown size={12} /> 看跌预警 TOP 5
          </h3>
          <div className="space-y-1.5">
            {(dailySummary.top_bearish_tickers || []).slice(0, 5).map((item: any, i: number) => (
              <div key={item.ticker} onClick={() => navigate(`/stock/${item.ticker}`)}
                className="flex items-center justify-between text-xs cursor-pointer hover:bg-green-500/10 rounded px-1.5 py-1 transition-colors">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground/50 w-3 text-[10px]">{i + 1}</span>
                  <span className="font-bold text-green-400">{item.ticker}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{item.mention_count} 位博主</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Users size={10} /> {dailySummary.statistics?.blogger_count || 0} 位博主</span>
        <span className="flex items-center gap-1"><Hash size={10} /> {dailySummary.statistics?.ticker_count || 0} 只标的</span>
        <span className="flex items-center gap-1"><Newspaper size={10} /> {dailySummary.statistics?.total_viewpoints || 0} 条观点</span>
      </div>
    </div>
  );

  const renderHotTopics = () => {
    if (loadingHot) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground mr-2" size={16} />
          <span className="text-xs text-muted-foreground">加载热门话题...</span>
        </div>
      );
    }

    const topMentioned = (hotTickers?.top_mentioned || []).slice(0, 6);
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Flame size={12} className="text-orange-400" />
          <span className="text-xs font-medium text-muted-foreground">
            全平台热门标的 · 累计提及排名
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {topMentioned.map((item: any, i: number) => {
            const sentiment = hotTickerSentiments[item.ticker];
            const bullish = sentiment?.sentiment_distribution?.['看涨'] || 0;
            const bearish = sentiment?.sentiment_distribution?.['看跌'] || 0;
            const total = sentiment?.total_viewpoints || 0;
            const bullPct = total > 0 ? Math.round((bullish / total) * 100) : 0;
            const bearPct = total > 0 ? Math.round((bearish / total) * 100) : 0;
            
            return (
              <div key={item.ticker}
                onClick={() => navigate(`/stock/${item.ticker}`)}
                className="rounded-lg border border-border bg-card/50 p-3 cursor-pointer hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground/50 font-mono">#{i + 1}</span>
                    <span className="font-bold text-sm">{item.ticker}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{item.mention_count} 次提及</span>
                </div>
                {sentiment ? (
                  <div className="space-y-1.5">
                    <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-secondary">
                      {bullPct > 0 && <div className="bg-red-500/70 rounded-full" style={{ width: `${bullPct}%` }} />}
                      {bearPct > 0 && <div className="bg-green-500/70 rounded-full" style={{ width: `${bearPct}%` }} />}
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-red-400">看涨 {bullPct}%</span>
                      <span className="text-green-400">看跌 {bearPct}%</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-5 bg-secondary/50 rounded animate-pulse" />
                )}
              </div>
            );
          })}
        </div>

        {/* Hot topics from daily summary */}
        {dailySummary && (
          <div className="rounded-lg border border-orange-500/10 bg-orange-500/5 p-3">
            <h4 className="text-xs font-semibold text-orange-400 mb-2 flex items-center gap-1">
              <Sparkles size={11} /> 今日焦点
            </h4>
            <div className="space-y-1.5">
              {(dailySummary.top_bullish_tickers || []).slice(0, 3).map((t: any) => (
                <div key={t.ticker} className="text-xs text-muted-foreground">
                  <span className="text-red-400 font-semibold">{t.ticker}</span>
                  <span className="mx-1">·</span>
                  <span>{t.mention_count} 位博主看涨</span>
                  <span className="mx-1">·</span>
                  <span className="text-muted-foreground/70">{t.bloggers}</span>
                </div>
              ))}
              {(dailySummary.top_bearish_tickers || []).slice(0, 2).map((t: any) => (
                <div key={t.ticker} className="text-xs text-muted-foreground">
                  <span className="text-green-400 font-semibold">{t.ticker}</span>
                  <span className="mx-1">·</span>
                  <span>{t.mention_count} 位博主看跌</span>
                  <span className="mx-1">·</span>
                  <span className="text-muted-foreground/70">{t.bloggers}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderBriefing = () => {
    if (loadingBriefing || !briefingData) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-muted-foreground mr-2" size={16} />
          <span className="text-xs text-muted-foreground">生成每日早报...</span>
        </div>
      );
    }

    const { summary, tickerDetails } = briefingData;
    const bullishPct = totalSentiment > 0 ? Math.round(((summary.sentiment_distribution?.['看涨'] || 0) / totalSentiment) * 100) : 0;
    const bearishPct = totalSentiment > 0 ? Math.round(((summary.sentiment_distribution?.['看跌'] || 0) / totalSentiment) * 100) : 0;

    // Determine overall mood
    let mood = '中性';
    let moodColor = 'text-yellow-400';
    if (bullishPct > bearishPct + 10) { mood = '偏多'; moodColor = 'text-red-400'; }
    else if (bearishPct > bullishPct + 10) { mood = '偏空'; moodColor = 'text-green-400'; }

    return (
      <div className="space-y-3">
        {/* Briefing Header */}
        <div className="rounded-lg border border-amber-500/15 bg-gradient-to-r from-amber-500/5 to-orange-500/5 p-3">
          <div className="flex items-center gap-2 mb-2">
            <Sun size={14} className="text-amber-400" />
            <span className="text-xs font-bold">FOCI 每日早报</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{today}</span>
          </div>
          <div className="text-xs leading-relaxed text-muted-foreground space-y-1.5">
            <p>
              今日 <span className="text-foreground font-medium">{summary.statistics?.blogger_count || 0}</span> 位博主发布了 
              <span className="text-foreground font-medium"> {summary.statistics?.total_viewpoints || 0}</span> 条观点，
              覆盖 <span className="text-foreground font-medium">{summary.statistics?.ticker_count || 0}</span> 只标的。
              市场整体情绪<span className={cn('font-semibold', moodColor)}>{mood}</span>，
              看涨占比 <span className="text-red-400 font-medium">{bullishPct}%</span>，
              看跌占比 <span className="text-green-400 font-medium">{bearishPct}%</span>。
            </p>
          </div>
        </div>

        {/* Key Bullish Picks */}
        <div className="rounded-lg border border-red-500/10 bg-red-500/5 p-3">
          <h4 className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
            <TrendingUp size={11} /> 博主看好
          </h4>
          <div className="space-y-2">
            {(summary.top_bullish_tickers || []).slice(0, 3).map((t: any) => {
              const detail = tickerDetails[t.ticker];
              const latestVp = detail?.viewpoints?.find((v: any) => v.sentiment === '看涨');
              return (
                <div key={t.ticker} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-red-400 cursor-pointer hover:underline" 
                      onClick={() => navigate(`/stock/${t.ticker}`)}>{t.ticker}</span>
                    <span className="text-muted-foreground">· {t.mention_count} 位博主看涨</span>
                  </div>
                  {latestVp?.reasoning && (
                    <p className="text-muted-foreground/80 pl-3 border-l border-red-500/20 leading-relaxed">
                      {latestVp.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Key Bearish Picks */}
        <div className="rounded-lg border border-green-500/10 bg-green-500/5 p-3">
          <h4 className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
            <TrendingDown size={11} /> 风险提示
          </h4>
          <div className="space-y-2">
            {(summary.top_bearish_tickers || []).slice(0, 3).map((t: any) => {
              const detail = tickerDetails[t.ticker];
              const latestVp = detail?.viewpoints?.find((v: any) => v.sentiment === '看跌');
              return (
                <div key={t.ticker} className="text-xs">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="font-bold text-green-400 cursor-pointer hover:underline"
                      onClick={() => navigate(`/stock/${t.ticker}`)}>{t.ticker}</span>
                    <span className="text-muted-foreground">· {t.mention_count} 位博主看跌</span>
                  </div>
                  {latestVp?.reasoning && (
                    <p className="text-muted-foreground/80 pl-3 border-l border-green-500/20 leading-relaxed">
                      {latestVp.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-background to-teal-500/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Bot size={18} className="text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              FOCI 智能助手
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </h2>
            <p className="text-[10px] text-muted-foreground">
              AlphaMoe · 追踪 {dailySummary.statistics?.blogger_count || 60}+ 财经博主实时观点
            </p>
          </div>
        </div>
        <a href="https://www.alphamoe.moe/foci" target="_blank" rel="noopener noreferrer"
          className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 transition-colors">
          了解更多 <ExternalLink size={10} />
        </a>
      </div>

      {/* Tabs */}
      <div className="px-4 flex gap-1 border-b border-emerald-500/10">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border-b-2 -mb-px',
              activeTab === tab.id
                ? 'text-emerald-400 border-emerald-400'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 py-3">
        {activeTab === 'summary' && renderSummary()}
        {activeTab === 'hot-topics' && renderHotTopics()}
        {activeTab === 'briefing' && renderBriefing()}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-emerald-500/10 bg-emerald-500/5 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          Powered by <a href="https://www.alphamoe.moe/foci" target="_blank" rel="noopener noreferrer" 
            className="text-emerald-400 hover:underline">AlphaMoe FOCI</a> · MCP Protocol
        </span>
        <span className="text-[10px] text-muted-foreground">{today}</span>
      </div>
    </section>
  );
}
