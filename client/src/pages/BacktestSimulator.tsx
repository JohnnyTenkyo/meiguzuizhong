import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useRoute } from 'wouter';
import {
  ArrowLeft, ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown,
  ShoppingCart, Loader2, Search, BarChart3, Wallet, History, X, Zap, Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StockChart from '@/components/StockChart';
import SignalPanel from '@/components/SignalPanel';
import { fetchStockData, US_STOCKS } from '@/lib/stockApi';
import { Candle, TimeInterval, CDSignal, BuySellPressure, NXSignal, MomentumSignal } from '@/lib/types';
import { calculateCDSignals, calculateBuySellPressure, calculateNXSignals, calculateMomentum } from '@/lib/indicators';

interface BacktestSession {
  id: number;
  name: string;
  initialBalance: string;
  currentBalance: string;
  startDate: number;
  currentDate: number;
  currentInterval: string;
  status: string;
}

interface Position {
  id: number;
  symbol: string;
  quantity: number;
  avgCost: string;
  totalCost: string;
}

interface Trade {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: string;
  amount: string;
  tradeDate: number;
  createdAt: string;
}

function getAuthHeaders() {
  const token = localStorage.getItem('auth_token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

function formatDateNum(dateNum: number): string {
  const str = String(dateNum);
  if (str.length === 8) return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  return str;
}

function dateNumToTimestamp(dateNum: number): number {
  const str = String(dateNum);
  const y = parseInt(str.slice(0, 4));
  const m = parseInt(str.slice(4, 6)) - 1;
  const d = parseInt(str.slice(6, 8));
  return new Date(y, m, d).getTime();
}

const TIME_LEVELS: { value: TimeInterval; label: string }[] = [
  { value: '1m', label: '1分' },
  { value: '5m', label: '5分' },
  { value: '15m', label: '15分' },
  { value: '30m', label: '30分' },
  { value: '1h', label: '1时' },
  { value: '2h', label: '2时' },
  { value: '3h', label: '3时' },
  { value: '4h', label: '4时' },
  { value: '1d', label: '日' },
  { value: '1w', label: '周' },
];

export default function BacktestSimulator() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/backtest/:id');
  const sessionId = params?.id ? parseInt(params.id) : 0;

  const [session, setSession] = useState<BacktestSession | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Current stock being viewed
  const [currentSymbol, setCurrentSymbol] = useState('AAPL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Chart data
  const [interval, setInterval] = useState<TimeInterval>('1d');
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [visibleIndex, setVisibleIndex] = useState(0);
  const [chartLoading, setChartLoading] = useState(false);

  // Trade dialog
  const [showTrade, setShowTrade] = useState(false);
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy');
  const [tradeQuantity, setTradeQuantity] = useState('100');
  const [tradePrice, setTradePrice] = useState('');
  const [trading, setTrading] = useState(false);

  // Panel state
  const [activePanel, setActivePanel] = useState<'positions' | 'trades'>('positions');

  // Fetch session data
  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch(`/api/backtest/sessions/${sessionId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        setPositions(data.positions || []);
        setTrades(data.trades || []);
      }
    } catch (err) {
      console.error('Failed to fetch session:', err);
    }
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    if (sessionId) fetchSession();
  }, [sessionId, fetchSession]);

  // Fetch chart data for current symbol and interval
  const fetchChartData = useCallback(async () => {
    if (!session) return;
    setChartLoading(true);
    try {
      const candles = await fetchStockData(currentSymbol, interval);
      setAllCandles(candles);

      // Find the index that corresponds to the session's current date
      const cutoffTimestamp = dateNumToTimestamp(session.currentDate);
      let idx = candles.length;
      for (let i = 0; i < candles.length; i++) {
        if (candles[i].time > cutoffTimestamp) {
          idx = i;
          break;
        }
      }
      setVisibleIndex(Math.max(idx, 1));
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    }
    setChartLoading(false);
  }, [currentSymbol, interval, session]);

  useEffect(() => {
    if (session) fetchChartData();
  }, [fetchChartData, session]);

  // Get visible candles (only up to current simulation point)
  const visibleCandles = useMemo(() => allCandles.slice(0, visibleIndex), [allCandles, visibleIndex]);
  const currentCandle = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1] : null;

  // Calculate mid price for default trade price
  const midPrice = currentCandle ? ((currentCandle.high + currentCandle.low) / 2) : 0;

  // Calculate all indicators on visible candles
  const cdSignals = useMemo<CDSignal[]>(() => {
    if (visibleCandles.length < 30) return [];
    try { return calculateCDSignals(visibleCandles); } catch { return []; }
  }, [visibleCandles]);

  const buySellPressure = useMemo<BuySellPressure[]>(() => {
    if (visibleCandles.length < 10) return [];
    try { return calculateBuySellPressure(visibleCandles); } catch { return []; }
  }, [visibleCandles]);

  const nxSignals = useMemo<NXSignal[]>(() => {
    if (visibleCandles.length < 30) return [];
    try { return calculateNXSignals(visibleCandles); } catch { return []; }
  }, [visibleCandles]);

  const momentumSignals = useMemo<MomentumSignal[]>(() => {
    if (visibleCandles.length < 30) return [];
    try { return calculateMomentum(visibleCandles); } catch { return []; }
  }, [visibleCandles]);

  // Get cost price for current symbol
  const currentPosition = positions.find(p => p.symbol === currentSymbol);
  const costPrice = currentPosition ? Number(currentPosition.avgCost) : undefined;

  // Advance one candle
  const advanceCandle = useCallback(() => {
    if (visibleIndex < allCandles.length) {
      const newIdx = visibleIndex + 1;
      setVisibleIndex(newIdx);

      const newCandle = allCandles[newIdx - 1];
      if (newCandle && session) {
        const newDate = new Date(newCandle.time);
        const dateNum = newDate.getFullYear() * 10000 + (newDate.getMonth() + 1) * 100 + newDate.getDate();
        if (dateNum !== session.currentDate) {
          fetch(`/api/backtest/sessions/${sessionId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ currentDate: dateNum }),
          }).then(r => r.json()).then(data => {
            if (data.success) setSession(data.session);
          });
        }
      }
    }
  }, [visibleIndex, allCandles, session, sessionId]);

  // Go back one candle
  const retreatCandle = useCallback(() => {
    if (visibleIndex > 1) {
      setVisibleIndex(visibleIndex - 1);
    }
  }, [visibleIndex]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showTrade || showSearch) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        advanceCandle();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        retreatCandle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceCandle, retreatCandle, showTrade, showSearch]);

  // Execute trade
  const executeTrade = async () => {
    if (!tradeQuantity || !tradePrice) return;
    setTrading(true);
    try {
      const res = await fetch(`/api/backtest/sessions/${sessionId}/trade`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          symbol: currentSymbol,
          type: tradeType,
          quantity: parseInt(tradeQuantity),
          price: parseFloat(tradePrice),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSession(data.session);
        setPositions(data.positions || []);
        setTrades(data.trades || []);
        setShowTrade(false);
      } else {
        alert(data.error || '交易失败');
      }
    } catch (err) {
      alert('交易失败');
    }
    setTrading(false);
  };

  // Search filtered stocks
  const filteredStocks = searchQuery.trim()
    ? US_STOCKS.filter(s => s.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 20)
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">存档不存在</p>
      </div>
    );
  }

  const totalPnl = Number(session.currentBalance) - Number(session.initialBalance);
  let unrealizedPnl = 0;
  let totalMarketValue = 0;
  for (const pos of positions) {
    if (currentCandle && pos.symbol === currentSymbol) {
      unrealizedPnl += (currentCandle.close - Number(pos.avgCost)) * pos.quantity;
      totalMarketValue += currentCandle.close * pos.quantity;
    } else {
      totalMarketValue += Number(pos.totalCost);
    }
  }
  const totalAssets = Number(session.currentBalance) + totalMarketValue;
  const totalReturn = ((totalAssets - Number(session.initialBalance)) / Number(session.initialBalance)) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-12">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/backtest')}>
              <ArrowLeft size={14} />
            </Button>
            <span className="text-sm font-bold">{session.name}</span>
            <span className="text-xs text-muted-foreground px-2 py-0.5 rounded bg-secondary">
              {formatDateNum(session.currentDate)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1">
              <Wallet size={12} className="text-muted-foreground" />
              <span className="font-medium">${Number(session.currentBalance).toLocaleString()}</span>
            </div>
            <div className={`font-bold ${totalReturn >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </div>
          </div>
        </div>
      </header>

      {/* Stock selector & interval & controls */}
      <div className="border-b border-border bg-background">
        <div className="container flex items-center justify-between h-10 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-accent text-sm font-bold"
            >
              <Search size={12} /> {currentSymbol}
            </button>
            {currentCandle && (
              <span className={`text-xs font-medium ${currentCandle.close >= currentCandle.open ? 'text-red-500' : 'text-green-500'}`}>
                ${currentCandle.close.toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 overflow-x-auto">
            {TIME_LEVELS.map(t => (
              <button
                key={t.value}
                onClick={() => setInterval(t.value)}
                className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors ${
                  interval === t.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content area - scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* K-line controls bar */}
        <div className="border-b border-border bg-card/50 px-4 py-2 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={retreatCandle} disabled={visibleIndex <= 1}>
              <ChevronLeft size={14} /> 上一根
            </Button>
            <Button variant="outline" size="sm" onClick={advanceCandle} disabled={visibleIndex >= allCandles.length}>
              下一根 <ChevronRight size={14} />
            </Button>
            <span className="text-xs text-muted-foreground">
              {visibleIndex}/{allCandles.length} | ← →
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => { setTradeType('buy'); setTradePrice(midPrice.toFixed(2)); setShowTrade(true); }}
            >
              <ShoppingCart size={14} className="mr-1" /> 买入
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={() => { setTradeType('sell'); setTradePrice(midPrice.toFixed(2)); setShowTrade(true); }}
            >
              <TrendingDown size={14} className="mr-1" /> 卖出
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/screener?backtest=${sessionId}&date=${session.currentDate}`)}
            >
              <Filter size={14} className="mr-1" /> 条件选股
            </Button>
          </div>
        </div>

        {/* Chart with full indicators */}
        <div className="px-4 py-2">
          {chartLoading ? (
            <div className="flex items-center justify-center h-96">
              <Loader2 className="animate-spin text-primary" size={24} />
              <span className="ml-2 text-muted-foreground">加载K线数据...</span>
            </div>
          ) : visibleCandles.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">暂无K线数据</p>
            </div>
          ) : (
            <>
              <StockChart
                candles={visibleCandles}
                interval={interval}
                cdSignals={cdSignals}
                buySellPressure={buySellPressure}
                momentumSignals={momentumSignals}
                height={350}
                costPrice={costPrice}
              />

              {/* Signal Panel - full indicator analysis */}
              <div className="pt-3">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">信号分析</h3>
                <SignalPanel
                  cdSignals={cdSignals}
                  buySellPressure={buySellPressure}
                  nxSignals={nxSignals}
                  momentumSignals={momentumSignals}
                />
              </div>
            </>
          )}
        </div>

        {/* Account summary bar */}
        <div className="border-t border-border bg-card/50 px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">初始资金: <span className="text-foreground font-medium">${Number(session.initialBalance).toLocaleString()}</span></span>
              <span className="text-muted-foreground">可用余额: <span className="text-foreground font-medium">${Number(session.currentBalance).toLocaleString()}</span></span>
              <span className="text-muted-foreground">持仓市值: <span className="text-foreground font-medium">${totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-muted-foreground">总资产: <span className="text-foreground font-bold">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
              <span className={`font-bold ${totalReturn >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
                ({totalReturn >= 0 ? '+' : ''}${(totalAssets - Number(session.initialBalance)).toLocaleString(undefined, { maximumFractionDigits: 0 })})
              </span>
            </div>
          </div>
        </div>

        {/* Bottom panel: positions & trades */}
        <div className="border-t border-border bg-card">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActivePanel('positions')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activePanel === 'positions' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              持仓 ({positions.length})
            </button>
            <button
              onClick={() => setActivePanel('trades')}
              className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
                activePanel === 'trades' ? 'text-primary border-b-2 border-primary' : 'text-muted-foreground'
              }`}
            >
              交易记录 ({trades.length})
            </button>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '240px' }}>
            {activePanel === 'positions' ? (
              positions.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">暂无持仓</p>
              ) : (
                <div className="divide-y divide-border">
                  {positions.map(pos => {
                    const currentPrice = pos.symbol === currentSymbol && currentCandle ? currentCandle.close : 0;
                    const marketValue = currentPrice > 0 ? currentPrice * pos.quantity : Number(pos.totalCost);
                    const pnl = currentPrice > 0 ? (currentPrice - Number(pos.avgCost)) * pos.quantity : 0;
                    const pnlPercent = currentPrice > 0 ? ((currentPrice - Number(pos.avgCost)) / Number(pos.avgCost)) * 100 : 0;

                    return (
                      <div
                        key={pos.id}
                        onClick={() => setCurrentSymbol(pos.symbol)}
                        className={`flex items-center justify-between px-4 py-2.5 hover:bg-accent/50 cursor-pointer ${
                          pos.symbol === currentSymbol ? 'bg-accent/30' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <span className="text-sm font-bold">{pos.symbol}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{pos.quantity}股</span>
                              <span className="text-xs text-muted-foreground">·</span>
                              <span className="text-xs text-muted-foreground">成本 ${Number(pos.avgCost).toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">市值 ${marketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                          {currentPrice > 0 ? (
                            <div className={`text-xs font-bold ${pnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                              {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% ({pnl >= 0 ? '+' : ''}${pnl.toFixed(0)})
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">切换查看盈亏</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              trades.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">暂无交易记录</p>
              ) : (
                <div className="divide-y divide-border">
                  {trades.slice(0, 50).map(trade => (
                    <div key={trade.id} className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          trade.type === 'buy' ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                        }`}>
                          {trade.type === 'buy' ? '买入' : '卖出'}
                        </span>
                        <span className="text-sm font-medium">{trade.symbol}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-xs">{trade.quantity}股 × ${Number(trade.price).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{formatDateNum(trade.tradeDate)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Trade dialog */}
      {showTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm mx-4 rounded-lg border border-border bg-card p-6 shadow-2xl">
            <button onClick={() => setShowTrade(false)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X size={18} />
            </button>
            <h2 className="text-lg font-semibold mb-1">
              {tradeType === 'buy' ? '买入' : '卖出'} {currentSymbol}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              当前K线中间价: ${midPrice.toFixed(2)}
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">价格</label>
                <input
                  type="number"
                  step="0.01"
                  value={tradePrice}
                  onChange={e => setTradePrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">数量（股）</label>
                <input
                  type="number"
                  value={tradeQuantity}
                  onChange={e => setTradeQuantity(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="text-sm text-muted-foreground">
                总金额: ${(parseFloat(tradePrice || '0') * parseInt(tradeQuantity || '0')).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                可用余额: ${Number(session.currentBalance).toLocaleString()}
              </div>
              <Button
                onClick={executeTrade}
                disabled={trading}
                className={`w-full ${tradeType === 'buy' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
              >
                {trading ? <Loader2 className="animate-spin mr-1" size={16} /> : null}
                确认{tradeType === 'buy' ? '买入' : '卖出'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Search dialog */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 rounded-lg border border-border bg-card shadow-2xl">
            <div className="p-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="搜索股票代码..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoFocus
                />
                <button onClick={() => { setShowSearch(false); setSearchQuery(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
            </div>
            {filteredStocks.length > 0 && (
              <div className="max-h-64 overflow-y-auto border-t border-border">
                {filteredStocks.map(s => (
                  <button
                    key={s}
                    onClick={() => { setCurrentSymbol(s); setShowSearch(false); setSearchQuery(''); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
