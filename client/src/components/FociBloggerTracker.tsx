import { useState, useEffect } from 'react';
import { 
  Users, ChevronDown, ChevronUp, TrendingUp, TrendingDown, 
  Minus, BarChart3, Loader2, Search, Eye, ArrowUpRight, ArrowDownRight, User
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

const sentimentConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  '看涨': { color: 'text-red-400', bg: 'bg-red-500/15', icon: <ArrowUpRight size={10} /> },
  '看跌': { color: 'text-green-400', bg: 'bg-green-500/15', icon: <ArrowDownRight size={10} /> },
  '观望': { color: 'text-yellow-400', bg: 'bg-yellow-500/15', icon: <Eye size={10} /> },
  '震荡': { color: 'text-blue-400', bg: 'bg-blue-500/15', icon: <BarChart3 size={10} /> },
};

export default function FociBloggerTracker() {
  const [, navigate] = useLocation();
  const [bloggers, setBloggers] = useState<string[]>([]);
  const [loadingBloggers, setLoadingBloggers] = useState(true);
  const [selectedBlogger, setSelectedBlogger] = useState<string | null>(null);
  const [bloggerData, setBloggerData] = useState<Record<string, any>>({});
  const [loadingPositions, setLoadingPositions] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedBlogger, setExpandedBlogger] = useState<string | null>(null);
  const [daysFilter, setDaysFilter] = useState(7);

  // Load blogger list
  useEffect(() => {
    callFoci("list_bloggers", {})
      .then(data => {
        setBloggers(data.bloggers || []);
        setLoadingBloggers(false);
      })
      .catch(() => setLoadingBloggers(false));
  }, []);

  const loadBloggerPositions = async (name: string) => {
    if (bloggerData[name + '_' + daysFilter]) {
      setExpandedBlogger(expandedBlogger === name ? null : name);
      return;
    }
    setLoadingPositions(name);
    setExpandedBlogger(name);
    try {
      const data = await callFoci("get_blogger_positions", { blogger_name: name, days: daysFilter });
      setBloggerData(prev => ({ ...prev, [name + '_' + daysFilter]: data }));
    } catch (err) {
      console.error('Failed to load blogger positions:', err);
    }
    setLoadingPositions(null);
  };

  const filteredBloggers = searchQuery.trim()
    ? bloggers.filter(b => b.toLowerCase().includes(searchQuery.toLowerCase()))
    : bloggers;

  const SentimentTag = ({ sentiment }: { sentiment: string }) => {
    const c = sentimentConfig[sentiment] || sentimentConfig['观望'];
    return (
      <span className={cn('inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium', c.bg, c.color)}>
        {c.icon} {sentiment}
      </span>
    );
  };

  return (
    <section className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-indigo-500/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Users size={18} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold flex items-center gap-1.5">
              博主持仓追踪
              <span className="text-[10px] font-normal text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                {bloggers.length} 位博主
              </span>
            </h2>
            <p className="text-[10px] text-muted-foreground">FOCI · 追踪知名财经博主的持仓变化和投资逻辑</p>
          </div>
        </div>
        {/* Days filter */}
        <div className="flex items-center gap-1">
          {[7, 14, 30].map(d => (
            <button key={d}
              onClick={() => { setDaysFilter(d); setBloggerData({}); }}
              className={cn(
                'text-[10px] px-2 py-1 rounded transition-colors',
                daysFilter === d
                  ? 'bg-purple-500/20 text-purple-400 font-medium'
                  : 'text-muted-foreground hover:bg-secondary'
              )}>
              {d}天
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索博主名称..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-secondary/50 border border-border text-xs focus:outline-none focus:ring-1 focus:ring-purple-500/50"
          />
        </div>
      </div>

      {/* Blogger List */}
      <div className="px-4 pb-3 max-h-[500px] overflow-y-auto space-y-1.5">
        {loadingBloggers ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="animate-spin text-muted-foreground mr-2" size={16} />
            <span className="text-xs text-muted-foreground">加载博主列表...</span>
          </div>
        ) : filteredBloggers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">未找到匹配的博主</p>
        ) : (
          filteredBloggers.map(name => {
            const isExpanded = expandedBlogger === name;
            const data = bloggerData[name + '_' + daysFilter];
            const isLoading = loadingPositions === name;

            return (
              <div key={name} className="rounded-lg border border-border bg-card/50 overflow-hidden">
                {/* Blogger Row */}
                <button
                  onClick={() => loadBloggerPositions(name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <div className="size-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                      <User size={12} className="text-purple-400" />
                    </div>
                    <span className="text-xs font-medium truncate max-w-[200px]">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {data && (
                      <span className="text-[10px] text-muted-foreground">
                        {data.unique_tickers} 只标的
                      </span>
                    )}
                    {isLoading ? (
                      <Loader2 size={12} className="animate-spin text-muted-foreground" />
                    ) : isExpanded ? (
                      <ChevronUp size={12} className="text-muted-foreground" />
                    ) : (
                      <ChevronDown size={12} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Expanded Content */}
                {isExpanded && data && (
                  <div className="px-3 pb-3 border-t border-border bg-background/50">
                    {/* Stats */}
                    <div className="flex items-center gap-3 py-2 text-[10px] text-muted-foreground">
                      <span>{data.total_viewpoints} 条观点</span>
                      <span>{data.unique_tickers} 只标的</span>
                      <span>近 {daysFilter} 天</span>
                    </div>

                    {/* Ticker Summary */}
                    <div className="space-y-1">
                      {Object.entries(data.tickers_summary || {}).slice(0, 10).map(([ticker, info]: [string, any]) => {
                        const sentiments = info.sentiments || [];
                        const latest = sentiments[sentiments.length - 1] || '观望';
                        return (
                          <div key={ticker}
                            onClick={() => navigate(`/stock/${ticker}`)}
                            className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent/50 cursor-pointer transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold w-12">{ticker}</span>
                              <SentimentTag sentiment={latest} />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-muted-foreground">{info.count}次</span>
                              {/* Mini sentiment history */}
                              <div className="flex gap-px">
                                {sentiments.slice(-5).map((s: string, i: number) => {
                                  const c = sentimentConfig[s] || sentimentConfig['观望'];
                                  return (
                                    <div key={i} className={cn('w-1.5 h-1.5 rounded-full', 
                                      s === '看涨' ? 'bg-red-400' : 
                                      s === '看跌' ? 'bg-green-400' : 
                                      s === '震荡' ? 'bg-blue-400' : 'bg-yellow-400'
                                    )} title={s} />
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Recent Viewpoints */}
                    {data.viewpoints && data.viewpoints.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <h4 className="text-[10px] font-medium text-muted-foreground mb-1.5">最新观点</h4>
                        <div className="space-y-1.5">
                          {data.viewpoints.slice(0, 3).map((vp: any, i: number) => (
                            <div key={i} className="text-[11px] leading-relaxed">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="font-semibold cursor-pointer hover:underline"
                                  onClick={() => navigate(`/stock/${vp.ticker}`)}>{vp.ticker}</span>
                                <SentimentTag sentiment={vp.sentiment} />
                                <span className="text-muted-foreground/50 text-[10px]">{vp.date} {vp.slot || ''}</span>
                              </div>
                              {vp.reasoning && (
                                <p className="text-muted-foreground/80 pl-2 border-l-2 border-purple-500/20">
                                  {vp.reasoning}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-purple-500/10 bg-purple-500/5">
        <span className="text-[10px] text-muted-foreground">
          Powered by <a href="https://www.alphamoe.moe/foci" target="_blank" rel="noopener noreferrer" 
            className="text-purple-400 hover:underline">AlphaMoe FOCI</a> · 博主持仓数据
        </span>
      </div>
    </section>
  );
}
