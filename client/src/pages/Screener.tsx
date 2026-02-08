import { useState, useMemo } from 'react';
import { useLocation, useSearch } from 'wouter';
import { ArrowLeft, Filter, Loader2, Zap, TrendingUp, Activity, X, SlidersHorizontal, Clock, Play, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STOCK_POOL } from '@/lib/stockApi';
import { TimeInterval } from '@/lib/types';
import { useScreener } from '@/contexts/ScreenerContext';

// Time levels
const TIME_LEVELS: { value: TimeInterval; label: string }[] = [
  { value: '5m', label: '5分钟' },
  { value: '15m', label: '15分钟' },
  { value: '30m', label: '30分钟' },
  { value: '1h', label: '1小时' },
  { value: '2h', label: '2小时' },
  { value: '3h', label: '3小时' },
  { value: '4h', label: '4小时' },
  { value: '1d', label: '日线' },
  { value: '1w', label: '周线' },
];

// Sector options
const SECTOR_OPTIONS = [
  { value: 'all', label: '全部板块' },
  { value: 'AI', label: 'AI概念' },
  { value: 'Semiconductor', label: '半导体' },
  { value: 'Bitcoin', label: '加密货币' },
  { value: 'EV', label: '电动车' },
  { value: 'Cloud', label: '云计算' },
  { value: 'Fintech', label: '金融科技' },
  { value: 'Energy', label: '能源' },
  { value: 'Healthcare', label: '医疗健康' },
  { value: 'Retail', label: '零售' },
  { value: 'Tech', label: '科技' },
  { value: 'ETF', label: 'ETF基金' },
  { value: 'Other', label: '其他' },
];

export default function Screener() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const backtestSessionId = params.get('backtest');
  const backtestDate = params.get('date') ? parseInt(params.get('date')!) : null;
  const isBacktestMode = !!backtestSessionId && !!backtestDate;

  const { currentJob, startScreening, cancelScreening } = useScreener();

  const [showPreFilter, setShowPreFilter] = useState(false);

  // Pre-filter states
  const [sectorFilter, setSectorFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  // Logic Mode
  const [logicMode, setLogicMode] = useState<'AND' | 'OR'>('AND');

  // Conditions
  const [bspEnabled, setBspEnabled] = useState(false);
  const [bspLevels, setBspLevels] = useState<TimeInterval[]>(['1d']);
  const [cdEnabled, setCdEnabled] = useState(true);
  const [cdLevels, setCdLevels] = useState<TimeInterval[]>(['4h']);
  const [ladderEnabled, setLadderEnabled] = useState(false);
  const [ladderLevels, setLadderLevels] = useState<TimeInterval[]>(['4h']);
  const [momentumEnabled, setMomentumEnabled] = useState(false);
  const [momentumTypes, setMomentumTypes] = useState<Array<'double_digit_up' | 'yellow_cross_green' | 'green_to_red' | 'strong_buy'>>(['double_digit_up']);
  // 缠论条件
  const [chanLunEnabled, setChanLunEnabled] = useState(false);
  const [chanLunLevels, setChanLunLevels] = useState<TimeInterval[]>(['1d']);
  const [chanLunType, setChanLunType] = useState<'buy' | 'sell'>('buy');
  // 高级禅动条件
  const [advChanEnabled, setAdvChanEnabled] = useState(false);
  const [advChanLevels, setAdvChanLevels] = useState<TimeInterval[]>(['1d']);
  const [advChanType, setAdvChanType] = useState<'buy' | 'sell' | 'near_support' | 'near_zhongshu'>('buy');

  const toggleMomentumType = (type: 'double_digit_up' | 'yellow_cross_green' | 'green_to_red' | 'strong_buy') => {
    setMomentumTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleLevel = (setter: React.Dispatch<React.SetStateAction<TimeInterval[]>>, level: TimeInterval) => {
    setter(prev =>
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const hasCondition = (bspEnabled && bspLevels.length > 0) || (cdEnabled && cdLevels.length > 0) || (ladderEnabled && ladderLevels.length > 0) || momentumEnabled || (chanLunEnabled && chanLunLevels.length > 0) || (advChanEnabled && advChanLevels.length > 0);

  // Pre-filtered stock count
  const filteredStockCount = useMemo(() => {
    if (sectorFilter === 'all') return STOCK_POOL.length;
    return STOCK_POOL.filter(s => s.sectors.includes(sectorFilter as any)).length;
  }, [sectorFilter]);

  const isRunning = currentJob?.status === 'running';
  const isCompleted = currentJob?.status === 'completed';

  const handleStartScreening = () => {
    if (!hasCondition) return;

    // Build conditions array
    const conditions: { indicator: string; intervals: TimeInterval[] }[] = [];
    if (bspEnabled && bspLevels.length > 0) {
      conditions.push({ indicator: 'pressure_strong_up', intervals: bspLevels });
    }
    if (cdEnabled && cdLevels.length > 0) {
      conditions.push({ indicator: 'cd_buy', intervals: cdLevels });
    }
    if (ladderEnabled && ladderLevels.length > 0) {
      conditions.push({ indicator: 'blue_ladder_strong', intervals: ladderLevels });
    }
    if (momentumEnabled && momentumTypes.length > 0) {
      for (const type of momentumTypes) {
        const indicatorMap: Record<string, string> = {
          'double_digit_up': 'momentum_double_digit_up',
          'yellow_cross_green': 'momentum_yellow_cross_green',
          'green_to_red': 'momentum_green_to_red',
          'strong_buy': 'momentum_strong_buy',
        };
        conditions.push({ indicator: indicatorMap[type] || type, intervals: ['1d'] });
      }
    }
    if (chanLunEnabled && chanLunLevels.length > 0) {
      conditions.push({ indicator: chanLunType === 'buy' ? 'chanlun_buy' : 'chanlun_sell', intervals: chanLunLevels });
    }
    if (advChanEnabled && advChanLevels.length > 0) {
      const advIndicatorMap: Record<string, string> = {
        'buy': 'advanced_chan_buy',
        'sell': 'advanced_chan_sell',
        'near_support': 'near_golden_support',
        'near_zhongshu': 'near_zhongshu',
      };
      conditions.push({ indicator: advIndicatorMap[advChanType] || 'advanced_chan_buy', intervals: advChanLevels });
    }

    const minPrice = priceMin ? parseFloat(priceMin) : 0;
    const maxPrice = priceMax ? parseFloat(priceMax) : 99999;

    startScreening({
      conditions,
      logic: logicMode,
      sectorFilter,
      priceRange: [minPrice, maxPrice],
      backtestDate: backtestDate || undefined,
    });
  };

  // Level selector component
  const LevelSelector = ({ levels, setLevels, activeColor }: {
    levels: TimeInterval[];
    setLevels: React.Dispatch<React.SetStateAction<TimeInterval[]>>;
    activeColor: string;
  }) => (
    <div className="mt-3 ml-8 flex flex-wrap gap-2">
      {TIME_LEVELS.map(level => (
        <button
          key={level.value}
          onClick={() => toggleLevel(setLevels, level.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            levels.includes(level.value)
              ? activeColor
              : 'bg-secondary text-secondary-foreground hover:bg-accent'
          }`}
        >
          {level.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => isBacktestMode ? navigate(`/backtest/${backtestSessionId}`) : navigate('/')}>
              <ArrowLeft size={16} className="mr-1" /> 返回
            </Button>
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-primary" />
              <h1 className="text-lg font-bold tracking-tight">条件选股</h1>
              {isBacktestMode && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-xs font-medium">
                  <Clock size={12} />
                  回测模式 - {String(backtestDate).replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6 max-w-4xl">
        {/* Running/Completed status banner */}
        {isRunning && currentJob && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 size={16} className="animate-spin text-primary" />
              <span className="text-sm font-medium">后台筛选进行中...</span>
              <span className="text-xs text-muted-foreground ml-auto">
                你可以离开此页面，筛选完成后会在顶部通知你
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(currentJob.progress / currentJob.total) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium">{currentJob.progress}/{currentJob.total}</span>
              <Button size="sm" variant="outline" onClick={cancelScreening}>
                <X size={14} className="mr-1" /> 取消
              </Button>
            </div>
            {currentJob.results.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                已找到 {currentJob.results.length} 只符合条件的股票
              </p>
            )}
          </div>
        )}

        {isCompleted && currentJob && (
          <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              <span className="text-sm font-medium">筛选完成！找到 {currentJob.results.length} 只符合条件的股票</span>
              <span className="text-xs text-muted-foreground ml-auto">
                耗时 {currentJob.endTime ? ((currentJob.endTime - currentJob.startTime) / 1000).toFixed(1) : '?'}秒
              </span>
            </div>
          </div>
        )}

        {/* Pre-filter */}
        <div className="rounded-lg border border-border bg-card p-4">
          <button
            onClick={() => setShowPreFilter(!showPreFilter)}
            className="flex items-center gap-2 w-full text-left"
          >
            <SlidersHorizontal size={16} className="text-primary" />
            <span className="text-sm font-medium">预筛选器</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {sectorFilter !== 'all' || priceMin || priceMax ? '已设置筛选条件' : '点击展开'}
            </span>
          </button>
          {showPreFilter && (
            <div className="mt-4 space-y-4">
              {/* Sector filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">板块筛选</label>
                <div className="flex flex-wrap gap-2">
                  {SECTOR_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSectorFilter(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        sectorFilter === opt.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground hover:bg-accent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Price filter */}
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">价格区间 (USD)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="最低价"
                    value={priceMin}
                    onChange={e => setPriceMin(e.target.value)}
                    className="w-28 px-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span className="text-muted-foreground text-sm">—</span>
                  <input
                    type="number"
                    placeholder="最高价"
                    value={priceMax}
                    onChange={e => setPriceMax(e.target.value)}
                    className="w-28 px-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                当前筛选范围：{filteredStockCount} 只股票
              </p>
            </div>
          )}
        </div>

        {/* Logic Mode */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">筛选逻辑</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setLogicMode('AND')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                logicMode === 'AND'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              AND（同时满足所有条件和级别）
            </button>
            <button
              onClick={() => setLogicMode('OR')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                logicMode === 'OR'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              OR（任意满足）
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {logicMode === 'AND'
              ? '示例：选择CD抄底的4h、3h、2h、1h级别，将筛选出所有4个级别都出现抄底信号的股票'
              : '示例：选择CD抄底的4h、3h、2h、1h级别，将筛选出至少一个级别出现抄底信号的股票'}
          </p>
        </div>

        {/* Conditions */}
        <div className="space-y-4">
          {/* Buy/Sell Pressure */}
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={bspEnabled} onChange={e => setBspEnabled(e.target.checked)} className="w-4 h-4 rounded border-border" />
              <Activity size={16} className="text-purple-500" />
              <span className="text-sm font-medium">买卖力道信号</span>
            </label>
            {bspEnabled && <LevelSelector levels={bspLevels} setLevels={setBspLevels} activeColor="bg-purple-500 text-white" />}
          </div>

          {/* CD Signal */}
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cdEnabled} onChange={e => setCdEnabled(e.target.checked)} className="w-4 h-4 rounded border-border" />
              <TrendingUp size={16} className="text-green-500" />
              <span className="text-sm font-medium">CD抄底信号</span>
            </label>
            {cdEnabled && <LevelSelector levels={cdLevels} setLevels={setCdLevels} activeColor="bg-green-500 text-white" />}
          </div>

          {/* Blue Ladder */}
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={ladderEnabled} onChange={e => setLadderEnabled(e.target.checked)} className="w-4 h-4 rounded border-border" />
              <span className="text-blue-500">🔵</span>
              <span className="text-sm font-medium">蓝梯走强</span>
            </label>
            {ladderEnabled && <LevelSelector levels={ladderLevels} setLevels={setLadderLevels} activeColor="bg-blue-500 text-white" />}
          </div>

          {/* Momentum */}
          <div className="rounded-lg border border-border bg-card p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={momentumEnabled} onChange={e => setMomentumEnabled(e.target.checked)} className="w-4 h-4 rounded border-border" />
              <Zap size={16} className="text-yellow-500" />
              <span className="text-sm font-medium">买卖动能信号</span>
            </label>
            {momentumEnabled && (
              <div className="mt-3 ml-8 space-y-2">
                {[
                  { value: 'double_digit_up' as const, label: '⚡ 动能双位数上涨' },
                  { value: 'yellow_cross_green' as const, label: '↑ 黄线穿绿线' },
                  { value: 'green_to_red' as const, label: '▲ 绿柱转红柱' },
                  { value: 'strong_buy' as const, label: '🔥 强买' },
                ].map(type => (
                  <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={momentumTypes.includes(type.value)} onChange={() => toggleMomentumType(type.value)} className="w-4 h-4 rounded border-border" />
                    <span className="text-sm">{type.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Advanced Chan - 高级禅动 */}
          <div className="rounded-lg border border-emerald-500/30 bg-card p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={advChanEnabled} onChange={e => setAdvChanEnabled(e.target.checked)} className="w-4 h-4 rounded border-border" />
              <span className="text-emerald-500 font-bold text-sm">禅</span>
              <span className="text-sm font-medium">高级禅动指标</span>
            </label>
            {advChanEnabled && (
              <div className="mt-3 ml-8 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 'buy' as const, label: '买入信号', color: 'bg-emerald-500 text-white' },
                    { value: 'sell' as const, label: '卖出信号', color: 'bg-rose-500 text-white' },
                    { value: 'near_support' as const, label: '近黄金支撑线', color: 'bg-green-500 text-white' },
                    { value: 'near_zhongshu' as const, label: '近主力中枢', color: 'bg-yellow-500 text-white' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAdvChanType(opt.value)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        advChanType === opt.value
                          ? opt.color
                          : 'bg-secondary text-secondary-foreground hover:bg-accent'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <LevelSelector levels={advChanLevels} setLevels={setAdvChanLevels} activeColor="bg-emerald-500 text-white" />
                <p className="text-xs text-muted-foreground">
                  基于高级缠论分析，包含趋势线买卖点、主力中枢、D90支撑压力线等指标
                </p>
              </div>
            )}
          </div>

          {/* ChanLun - 缠论分型 */}
          <div className="rounded-lg border border-orange-500/30 bg-card p-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={chanLunEnabled} onChange={e => setChanLunEnabled(e.target.checked)} className="w-4 h-4 rounded border-border" />
              <span className="text-orange-500 font-bold text-sm">缠</span>
              <span className="text-sm font-medium">缠论分型 + MACD背离</span>
            </label>
            {chanLunEnabled && (
              <div className="mt-3 ml-8 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setChanLunType('buy')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      chanLunType === 'buy'
                        ? 'bg-orange-500 text-white'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent'
                    }`}
                  >
                    底分型 + 底背离（买入）
                  </button>
                  <button
                    onClick={() => setChanLunType('sell')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      chanLunType === 'sell'
                        ? 'bg-purple-500 text-white'
                        : 'bg-secondary text-secondary-foreground hover:bg-accent'
                    }`}
                  >
                    顶分型 + 顶背离（卖出）
                  </button>
                </div>
                <LevelSelector levels={chanLunLevels} setLevels={setChanLunLevels} activeColor="bg-orange-500 text-white" />
                <p className="text-xs text-muted-foreground">
                  基于缠论顶底分型识别，配合MACD背离给出买卖点信号
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Run Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleStartScreening}
            disabled={!hasCondition || isRunning}
            className="flex-1"
            size="lg"
          >
            {isRunning ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                后台筛选中... ({currentJob?.progress || 0}/{currentJob?.total || 0})
              </>
            ) : (
              <>
                <Play size={16} className="mr-2" />
                开始筛选 ({filteredStockCount} 只股票)
              </>
            )}
          </Button>
          {isRunning && (
            <Button onClick={cancelScreening} variant="outline" size="lg">
              <X size={16} className="mr-2" /> 取消
            </Button>
          )}
        </div>

        {isRunning && (
          <p className="text-xs text-center text-muted-foreground">
            筛选在后台运行，你可以返回查看其他股票或进入回测系统，筛选完成后会在顶部通知你
          </p>
        )}

        {/* Results */}
        {currentJob && currentJob.results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              {isRunning ? `已找到 ${currentJob.results.length} 只（筛选中...）` : `找到 ${currentJob.results.length} 只符合条件的股票`}
            </h3>
            {currentJob.results.map(result => (
              <div
                key={result.symbol}
                onClick={() => {
                  if (isBacktestMode) {
                    navigate(`/backtest/${backtestSessionId}`);
                  } else {
                    navigate(`/stock/${result.symbol}`);
                  }
                }}
                className="rounded-lg border border-border bg-card p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-lg">{result.symbol}</span>
                  <span className="text-xs text-muted-foreground">{result.matchedConditions.length} 个条件匹配</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.matchedConditions.map((cond, idx) => (
                    <div key={idx} className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-xs font-medium">
                      {cond}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isRunning && currentJob?.status === 'completed' && currentJob.results.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Filter size={48} className="mx-auto mb-3 opacity-50" />
            <p>未找到符合条件的股票</p>
          </div>
        )}

        {!currentJob && (
          <div className="text-center py-12 text-muted-foreground">
            <Filter size={48} className="mx-auto mb-3 opacity-50" />
            <p>设置条件后点击开始筛选</p>
          </div>
        )}
      </main>
    </div>
  );
}
