import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useLocation, useRoute } from 'wouter';
import {
  ArrowLeft, ChevronLeft, ChevronRight, DollarSign, TrendingUp, TrendingDown,
  ShoppingCart, Loader2, Search, BarChart3, Wallet, History, X, Zap, Filter,
  Play, Pause, FastForward
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StockChart from '@/components/StockChart';
import SignalPanel from '@/components/SignalPanel';
import { fetchStockData, US_STOCKS } from '@/lib/stockApi';
import { Candle, TimeInterval, CDSignal, BuySellPressure, NXSignal, MomentumSignal, ChanLunSignal, AdvancedChanData, AdvancedChanSignal, BiPoint, ZhongShu } from '@/lib/types';
import { calculateCDSignals, calculateBuySellPressure, calculateNXSignals, calculateMomentum, calculateChanLunSignals, calculateAdvancedChanData, calculateAdvancedChanSignals, findBiPoints, findZhongShu, findChanBuySellPoints } from '@/lib/indicators';

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

const SPEED_OPTIONS = [
  { value: 1, label: '1x', ms: 1000 },
  { value: 2, label: '2x', ms: 500 },
  { value: 5, label: '5x', ms: 200 },
];

export default function BacktestSimulator() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/backtest/:id');
  const sessionId = params?.id ? parseInt(params.id) : 0;

  const [session, setSession] = useState<BacktestSession | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [positionPrices, setPositionPrices] = useState<Record<string, number>>({});
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Current stock being viewed
  const [currentSymbol, setCurrentSymbol] = useState('AAPL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Chart data
  const [interval, setInterval] = useState<TimeInterval>('1d');

  // Fetch latest prices for all positions
  const fetchPositionPrices = useCallback(async () => {
    if (positions.length === 0 || !session) return;
    
    const priceMap: Record<string, number> = {};
    const cutoffTimestamp = dateNumToTimestamp(session.currentDate);
    
    // Fetch prices for all positions in parallel
    await Promise.all(
      positions.map(async (pos) => {
        try {
          const candles = await fetchStockData(pos.symbol, interval);
          // Find the last candle before or at current date
          let lastPrice = Number(pos.avgCost); // fallback to cost
          for (let i = candles.length - 1; i >= 0; i--) {
            if (candles[i].time <= cutoffTimestamp) {
              lastPrice = candles[i].close;
              break;
            }
          }
          priceMap[pos.symbol] = lastPrice;
        } catch (err) {
          console.error(`Failed to fetch price for ${pos.symbol}:`, err);
          priceMap[pos.symbol] = Number(pos.avgCost); // fallback
        }
      })
    );
    
    setPositionPrices(priceMap);
    
    // Calculate total assets and update database
    let totalMarketValue = 0;
    for (const pos of positions) {
      const currentPrice = priceMap[pos.symbol] || Number(pos.avgCost);
      totalMarketValue += currentPrice * pos.quantity;
    }
    const totalAssets = Number(session.currentBalance) + totalMarketValue;
    const totalPnL = totalAssets - Number(session.initialBalance);
    const totalPnLPercent = (totalPnL / Number(session.initialBalance)) * 100;
    
    // Update database with calculated values
    fetch(`/api/backtest/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        totalAssets: totalAssets.toFixed(2),
        totalPnL: totalPnL.toFixed(2),
        totalPnLPercent: totalPnLPercent.toFixed(4),
      }),
    }).catch(err => console.error('Failed to update total assets:', err));
  }, [positions, session, interval, sessionId]);

  // Fetch position prices when positions or session date changes
  // This ensures all positions use the same unified date for price calculation
  useEffect(() => {
    fetchPositionPrices();
  }, [positions, session?.currentDate, interval]); // Explicitly depend on session.currentDate
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

  // Auto-play state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPlayingRef = useRef(false);
  const playSpeedRef = useRef(1);

  // Indicator toggles
  const [showChanLun, setShowChanLun] = useState(false);
  const [showAdvancedChan, setShowAdvancedChan] = useState(false);
  const [showLadder, setShowLadder] = useState(true);
  const [showCDLabels, setShowCDLabels] = useState(true);

  // Keep refs in sync
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { playSpeedRef.current = playSpeed; }, [playSpeed]);

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

  // Track previous symbol/interval to detect real changes vs session date updates
  const prevSymbolRef = useRef(currentSymbol);
  const prevIntervalRef = useRef(interval);
  const dataLoadedRef = useRef(false);

  // Fetch chart data for current symbol and interval
  const fetchChartData = useCallback(async (forceLoading = false) => {
    if (!session) return;
    if (forceLoading || !dataLoadedRef.current) {
      setChartLoading(true);
    }
    try {
      const candles = await fetchStockData(currentSymbol, interval);
      setAllCandles(candles);

      const cutoffTimestamp = dateNumToTimestamp(session.currentDate);
      let idx = candles.length;
      for (let i = 0; i < candles.length; i++) {
        if (candles[i].time > cutoffTimestamp) {
          idx = i;
          break;
        }
      }
      setVisibleIndex(Math.max(idx, 1));
      dataLoadedRef.current = true;
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    }
    setChartLoading(false);
  }, [currentSymbol, interval, session]);

  useEffect(() => {
    if (!session) return;
    const symbolChanged = prevSymbolRef.current !== currentSymbol;
    const intervalChanged = prevIntervalRef.current !== interval;
    prevSymbolRef.current = currentSymbol;
    prevIntervalRef.current = interval;
    fetchChartData(symbolChanged || intervalChanged || !dataLoadedRef.current);
  }, [fetchChartData, session, currentSymbol, interval]);

  // Get visible candles (only up to current simulation point)
  const visibleCandles = useMemo(() => allCandles.slice(0, visibleIndex), [allCandles, visibleIndex]);
  const currentCandle = visibleCandles.length > 0 ? visibleCandles[visibleCandles.length - 1] : null;

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

  // Always calculate ChanLun signals for signal panel statistics (display on chart is controlled by showChanLun)
  const chanLunSignals = useMemo<ChanLunSignal[]>(() => {
    if (visibleCandles.length < 10) return [];
    try { return calculateChanLunSignals(visibleCandles); } catch { return []; }
  }, [visibleCandles]);

  // Always calculate indicators regardless of toggle state (for screener)
  const advancedChanData = useMemo<AdvancedChanData[]>(() => {
    if (visibleCandles.length < 30) return [];
    try { return calculateAdvancedChanData(visibleCandles); } catch { return []; }
  }, [visibleCandles]);

  const advancedChanSignals = useMemo<AdvancedChanSignal[]>(() => {
    if (advancedChanData.length === 0) return [];
    try { return calculateAdvancedChanSignals(visibleCandles, advancedChanData); } catch { return []; }
  }, [visibleCandles, advancedChanData]);

  const biPoints = useMemo<BiPoint[]>(() => {
    if (visibleCandles.length < 10) return [];
    try { return findBiPoints(visibleCandles); } catch { return []; }
  }, [visibleCandles]);
  const zhongshus = useMemo<ZhongShu[]>(() => {
    if (biPoints.length < 4) return [];
    try { return findZhongShu(biPoints, visibleCandles); } catch { return []; }
  }, [biPoints, visibleCandles]);
  const chanBuySellSignals = useMemo<AdvancedChanSignal[]>(() => {
    if (biPoints.length < 5) return [];
    try { return findChanBuySellPoints(biPoints, zhongshus, visibleCandles); } catch { return []; }
  }, [biPoints, zhongshus, visibleCandles]);

  // Get cost price for current symbol
  const currentPosition = positions.find(p => p.symbol === currentSymbol);
  const costPrice = currentPosition ? Number(currentPosition.avgCost) : undefined;

  // Debounce timer for session date updates
  const dateUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDateRef = useRef<number | null>(null);

  const flushDateUpdate = useCallback(() => {
    if (pendingDateRef.current !== null && session) {
      const dateNum = pendingDateRef.current;
      pendingDateRef.current = null;
      fetch(`/api/backtest/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentDate: dateNum }),
      }).then(r => r.json()).then(data => {
        if (data.success) setSession(data.session);
      }).catch(() => {});
    }
  }, [session, sessionId]);

  const scheduleDateUpdate = useCallback((dateNum: number) => {
    pendingDateRef.current = dateNum;
    if (dateUpdateTimerRef.current) clearTimeout(dateUpdateTimerRef.current);
    dateUpdateTimerRef.current = setTimeout(flushDateUpdate, 500);
  }, [flushDateUpdate]);

  // Advance one candle - optimized for rapid clicking
  // Find the next date that has data for all positions
  const advanceCandle = useCallback(() => {
    setVisibleIndex(prev => {
      if (prev < allCandles.length) {
        const newIdx = prev + 1;
        const newCandle = allCandles[newIdx - 1];
        if (newCandle && session) {
          const newDate = new Date(newCandle.time);
          const dateNum = newDate.getFullYear() * 10000 + (newDate.getMonth() + 1) * 100 + newDate.getDate();
          if (dateNum !== session.currentDate) {
            // Update to this date - fetchPositionPrices will use this unified date for all positions
            scheduleDateUpdate(dateNum);
          }
        }
        return newIdx;
      }
      return prev;
    });
  }, [allCandles, session, scheduleDateUpdate]);

  // Go back one candle
  // Find the previous date that has data for all positions
  const retreatCandle = useCallback(() => {
    setVisibleIndex(prev => {
      if (prev > 1) {
        const newIdx = prev - 1;
        const prevCandle = allCandles[newIdx - 1];
        if (prevCandle && session) {
          const prevDate = new Date(prevCandle.time);
          const dateNum = prevDate.getFullYear() * 10000 + (prevDate.getMonth() + 1) * 100 + prevDate.getDate();
          if (dateNum !== session.currentDate) {
            // Update to this date - fetchPositionPrices will use this unified date for all positions
            scheduleDateUpdate(dateNum);
          }
        }
        return newIdx;
      }
      return prev;
    });
  }, [allCandles, session, scheduleDateUpdate]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dateUpdateTimerRef.current) clearTimeout(dateUpdateTimerRef.current);
      flushDateUpdate();
    };
  }, [flushDateUpdate]);

  // ===== AUTO-PLAY =====
  const autoPlayStep = useCallback(() => {
    if (!isPlayingRef.current) return;
    
    setVisibleIndex(prev => {
      const newIdx = prev + 1;
      if (newIdx > allCandles.length) {
        // Reached the end, stop playing
        setIsPlaying(false);
        return prev;
      }
      
      // Update session date
      const newCandle = allCandles[newIdx - 1];
      if (newCandle) {
        const newDate = new Date(newCandle.time);
        const dateNum = newDate.getFullYear() * 10000 + (newDate.getMonth() + 1) * 100 + newDate.getDate();
        pendingDateRef.current = dateNum;
      }
      
      // Schedule next step
      const speedMs = SPEED_OPTIONS.find(s => s.value === playSpeedRef.current)?.ms || 1000;
      playTimerRef.current = setTimeout(autoPlayStep, speedMs);
      
      return newIdx;
    });
  }, [allCandles]);

  // Start/stop auto-play
  const toggleAutoPlay = useCallback(() => {
    if (isPlaying) {
      // Stop
      setIsPlaying(false);
      if (playTimerRef.current) {
        clearTimeout(playTimerRef.current);
        playTimerRef.current = null;
      }
      // Flush pending date update
      flushDateUpdate();
    } else {
      // Start
      if (visibleIndex >= allCandles.length) return; // Already at end
      setIsPlaying(true);
      const speedMs = SPEED_OPTIONS.find(s => s.value === playSpeed)?.ms || 1000;
      playTimerRef.current = setTimeout(autoPlayStep, speedMs);
    }
  }, [isPlaying, visibleIndex, allCandles.length, playSpeed, autoPlayStep, flushDateUpdate]);

  // Cycle play speed
  const cycleSpeed = useCallback(() => {
    setPlaySpeed(prev => {
      const idx = SPEED_OPTIONS.findIndex(s => s.value === prev);
      return SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length].value;
    });
  }, []);

  // Cleanup auto-play on unmount
  useEffect(() => {
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showTrade || showSearch) return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (isPlaying) return; // Don't manually advance during auto-play
        advanceCandle();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (isPlaying) {
          // Stop auto-play when pressing left
          setIsPlaying(false);
          if (playTimerRef.current) {
            clearTimeout(playTimerRef.current);
            playTimerRef.current = null;
          }
        }
        retreatCandle();
      } else if (e.key === ' ') {
        e.preventDefault();
        toggleAutoPlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [advanceCandle, retreatCandle, showTrade, showSearch, isPlaying, toggleAutoPlay]);

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

  // Calculate total market value using consistent price source for all positions
  // Always use positionPrices (fetched at current simulation date) to ensure consistency
  // This prevents market value from changing when switching between stocks or time intervals
  let totalMarketValue = 0;
  let unrealizedPnl = 0;
  for (const pos of positions) {
    // Use the price from positionPrices (fetched at current simulation date)
    // For the currently viewed symbol, also show it on the chart with currentCandle
    const currentPrice = positionPrices[pos.symbol] || Number(pos.avgCost);
    
    const marketValue = currentPrice * pos.quantity;
    totalMarketValue += marketValue;
    unrealizedPnl += (currentPrice - Number(pos.avgCost)) * pos.quantity;
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
              <span className="font-medium">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className={`font-bold ${totalReturn >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
            </div>
          </div>
        </div>
      </header>

      {/* Stock selector & interval */}
      <div className="border-b border-border bg-background">
        <div className="container py-1.5 space-y-1">
          {/* Row 1: Symbol + Price */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-secondary hover:bg-accent text-sm font-bold shrink-0"
            >
              <Search size={12} /> {currentSymbol}
            </button>
            {currentCandle && (
              <span className={`text-xs font-medium ${currentCandle.close >= currentCandle.open ? 'text-red-500' : 'text-green-500'}`}>
                ${currentCandle.close.toFixed(2)}
              </span>
            )}
          </div>
          {/* Row 2: Time intervals - scrollable */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 -mx-1 px-1">
            {TIME_LEVELS.map(t => (
              <button
                key={t.value}
                onClick={() => setInterval(t.value)}
                className={`px-2 py-0.5 text-xs rounded whitespace-nowrap transition-colors shrink-0 ${
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
        {/* K-line controls bar - responsive layout */}
        <div className="border-b border-border bg-card/50 px-3 py-2 sticky top-0 z-30 space-y-1.5">
          {/* Row 1: Navigation + Auto-play + Counter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={retreatCandle} disabled={visibleIndex <= 1 || isPlaying}>
              <ChevronLeft size={12} /> <span className="hidden sm:inline">上一根</span><span className="sm:hidden">←</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={advanceCandle} disabled={visibleIndex >= allCandles.length || isPlaying}>
              <span className="hidden sm:inline">下一根</span><span className="sm:hidden">→</span> <ChevronRight size={12} />
            </Button>
            
            <div className="w-px h-5 bg-border mx-0.5 hidden sm:block" />
            
            <Button
              variant={isPlaying ? "default" : "outline"}
              size="sm"
              className={`h-7 px-2 text-xs ${isPlaying ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}`}
              onClick={toggleAutoPlay}
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              <span className="hidden sm:inline ml-1">{isPlaying ? '暂停' : '播放'}</span>
            </Button>
            <Button variant="outline" size="sm" className="h-7 px-1.5 text-xs min-w-[36px]" onClick={cycleSpeed}>
              <FastForward size={10} className="mr-0.5" />
              {SPEED_OPTIONS.find(s => s.value === playSpeed)?.label}
            </Button>
            
            <span className="text-[10px] text-muted-foreground ml-auto">
              {visibleIndex}/{allCandles.length}
            </span>
          </div>
          
          {/* Row 2: Trade + Indicator toggles + Screener */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              size="sm"
              className="h-7 px-2 text-xs bg-red-500 hover:bg-red-600 text-white"
              onClick={() => { setTradeType('buy'); setTradePrice(midPrice.toFixed(2)); setShowTrade(true); }}
            >
              <ShoppingCart size={12} className="mr-0.5" /> 买入
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={() => { setTradeType('sell'); setTradePrice(midPrice.toFixed(2)); setShowTrade(true); }}
            >
              <TrendingDown size={12} className="mr-0.5" /> 卖出
            </Button>
            
            <div className="w-px h-5 bg-border mx-0.5" />
            
            <Button
              size="sm"
              variant={showLadder ? "default" : "outline"}
              className={`h-7 px-2 text-xs ${showLadder ? "bg-blue-500 hover:bg-blue-600 text-white" : "border-blue-500 text-blue-500 hover:bg-blue-500/10"}`}
              onClick={() => setShowLadder(!showLadder)}
            >
              梯子
            </Button>
            <Button
              size="sm"
              variant={showChanLun ? "default" : "outline"}
              className={`h-7 px-2 text-xs ${showChanLun ? "bg-orange-500 hover:bg-orange-600 text-white" : "border-orange-500 text-orange-500 hover:bg-orange-500/10"}`}
              onClick={() => setShowChanLun(!showChanLun)}
            >
              缠论
            </Button>
            <Button
              size="sm"
              variant={showAdvancedChan ? "default" : "outline"}
              className={`h-7 px-2 text-xs ${showAdvancedChan ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"}`}
              onClick={() => setShowAdvancedChan(!showAdvancedChan)}
            >
              禅动
            </Button>
            <Button
              size="sm"
              variant={showCDLabels ? "default" : "outline"}
              className={`h-7 px-3 text-xs font-medium transition-all ${showCDLabels ? "bg-blue-500 hover:bg-blue-600 text-white shadow-md" : "border-blue-400 text-blue-400 hover:bg-blue-500/10"}`}
              onClick={() => {
                console.log('CD标记按钮被点击，当前状态:', showCDLabels);
                setShowCDLabels(!showCDLabels);
              }}
              title="显示/隐藏CD抄底文字标记"
            >
              {showCDLabels ? "CD标记" : "CD标记"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs ml-auto"
              onClick={() => navigate(`/screener?backtest=${sessionId}&date=${session.currentDate}`)}
            >
              <Filter size={12} className="mr-0.5" /> 选股
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
                chanLunSignals={chanLunSignals}
                showChanLun={showChanLun}
                advancedChanData={advancedChanData}
                advancedChanSignals={advancedChanSignals}
                showAdvancedChan={showAdvancedChan}
                showLadder={showLadder}
                showCDLabels={showCDLabels}
                biPoints={biPoints}
                zhongshus={zhongshus}
                chanBuySellSignals={chanBuySellSignals}
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
                  chanLunSignals={chanLunSignals}
                  advancedChanSignals={advancedChanSignals}
                  chanBuySellSignals={chanBuySellSignals}
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
                    // Use current candle price for viewed symbol, otherwise use fetched price
                    const currentPrice = (pos.symbol === currentSymbol && currentCandle) 
                      ? currentCandle.close 
                      : (positionPrices[pos.symbol] || Number(pos.avgCost));
                    const marketValue = currentPrice * pos.quantity;
                    const pnl = (currentPrice - Number(pos.avgCost)) * pos.quantity;
                    const pnlPercent = ((currentPrice - Number(pos.avgCost)) / Number(pos.avgCost)) * 100;

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
                          <div className={`text-xs font-bold ${pnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                            {pnl >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}% ({pnl >= 0 ? '+' : ''}${pnl.toFixed(0)})
                          </div>
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
