import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { fetchStockData, STOCK_POOL } from '@/lib/stockApi';
import { Candle, TimeInterval } from '@/lib/types';
import { calculateCDSignals, calculateBuySellPressure, calculateMomentum, checkBlueLadderStrength, checkChanLunBuySignal, checkChanLunSellSignal, checkAdvancedChanBuySignal, checkAdvancedChanSellSignal, checkNearGoldenSupport, checkNearZhongshu } from '@/lib/indicators';

// Types
export interface ScreenerCondition {
  indicator: string;
  intervals: TimeInterval[];
}

export interface ScreenerResult {
  symbol: string;
  name: string;
  matchedConditions: string[];
}

export interface ScreenerJob {
  id: string;
  conditions: ScreenerCondition[];
  logic: 'AND' | 'OR';
  sectorFilter: string;
  priceRange: [number, number];
  status: 'running' | 'completed' | 'cancelled';
  progress: number;
  total: number;
  results: ScreenerResult[];
  startTime: number;
  endTime?: number;
  // For backtest mode
  backtestDate?: number;
}

interface ScreenerContextType {
  currentJob: ScreenerJob | null;
  jobHistory: ScreenerJob[];
  startScreening: (params: {
    conditions: ScreenerCondition[];
    logic: 'AND' | 'OR';
    sectorFilter: string;
    priceRange: [number, number];
    backtestDate?: number;
  }) => string;
  cancelScreening: () => void;
  clearJob: (id: string) => void;
  notifications: ScreenerNotification[];
  dismissNotification: (id: string) => void;
}

export interface ScreenerNotification {
  id: string;
  jobId: string;
  message: string;
  resultCount: number;
  timestamp: number;
  dismissed: boolean;
}

const ScreenerContext = createContext<ScreenerContextType | null>(null);

export function useScreener() {
  const ctx = useContext(ScreenerContext);
  if (!ctx) throw new Error('useScreener must be used within ScreenerProvider');
  return ctx;
}

// Check if a stock matches conditions
function checkStockConditions(
  candles: Candle[],
  conditions: ScreenerCondition[],
  logic: 'AND' | 'OR'
): string[] {
  if (candles.length < 30) return [];
  
  const matched: string[] = [];
  
  for (const cond of conditions) {
    let conditionMet = false;
    
    try {
      if (cond.indicator === 'cd_buy') {
        const signals = calculateCDSignals(candles);
        // 只筛选最近10根K线内出现的抵底信号
        const recentBuySignals = signals.filter(s => 
          s.type === 'buy' && 
          s.time >= candles[Math.max(0, candles.length - 10)].time
        );
        conditionMet = recentBuySignals.length > 0;
      } else if (cond.indicator === 'cd_sell') {
        const signals = calculateCDSignals(candles);
        // 只筛选最近10根K线内出现的顶部信号
        const recentSellSignals = signals.filter(s => 
          s.type === 'sell' && 
          s.time >= candles[Math.max(0, candles.length - 10)].time
        );
        conditionMet = recentSellSignals.length > 0;
      } else if (cond.indicator === 'pressure_strong_up') {
        const pressure = calculateBuySellPressure(candles);
        const last = pressure.length > 0 ? pressure[pressure.length - 1] : null;
        conditionMet = last?.signal === 'strong_up';
      } else if (cond.indicator === 'pressure_strong_down') {
        const pressure = calculateBuySellPressure(candles);
        const last = pressure.length > 0 ? pressure[pressure.length - 1] : null;
        conditionMet = last?.signal === 'strong_down';
      } else if (cond.indicator === 'blue_ladder_strong') {
        conditionMet = checkBlueLadderStrength(candles);
      } else if (cond.indicator === 'momentum_strong_buy') {
        const momentum = calculateMomentum(candles);
        const lastSignal = [...momentum].reverse().find(m => m.signal);
        conditionMet = lastSignal?.signal === 'strong_buy' || lastSignal?.signal === 'double_digit_up';
      } else if (cond.indicator === 'momentum_double_digit_up') {
        const momentum = calculateMomentum(candles);
        const lastSignal = [...momentum].reverse().find(m => m.signal);
        conditionMet = lastSignal?.signal === 'double_digit_up';
      } else if (cond.indicator === 'chanlun_buy') {
        conditionMet = checkChanLunBuySignal(candles);
      } else if (cond.indicator === 'chanlun_sell') {
        conditionMet = checkChanLunSellSignal(candles);
      } else if (cond.indicator === 'advanced_chan_buy') {
        conditionMet = checkAdvancedChanBuySignal(candles);
      } else if (cond.indicator === 'advanced_chan_sell') {
        conditionMet = checkAdvancedChanSellSignal(candles);
      } else if (cond.indicator === 'near_golden_support') {
        conditionMet = checkNearGoldenSupport(candles);
      } else if (cond.indicator === 'near_zhongshu') {
        conditionMet = checkNearZhongshu(candles);
      }
    } catch {
      conditionMet = false;
    }
    
    if (conditionMet) {
      matched.push(`${cond.indicator}@${cond.intervals.join(',')}`);
    }
  }
  
  return matched;
}

export function ScreenerProvider({ children }: { children: ReactNode }) {
  const [currentJob, setCurrentJob] = useState<ScreenerJob | null>(null);
  const [jobHistory, setJobHistory] = useState<ScreenerJob[]>([]);
  const [notifications, setNotifications] = useState<ScreenerNotification[]>([]);
  const cancelRef = useRef(false);

  const startScreening = useCallback((params: {
    conditions: ScreenerCondition[];
    logic: 'AND' | 'OR';
    sectorFilter: string;
    priceRange: [number, number];
    backtestDate?: number;
  }) => {
    const jobId = `job_${Date.now()}`;
    cancelRef.current = false;

    // Build stock list based on filters
    let stockList = STOCK_POOL.map(s => s.symbol);
    if (params.sectorFilter && params.sectorFilter !== 'all') {
      const sectorStocks = STOCK_POOL.filter(s => s.sectors?.includes(params.sectorFilter as any));
      stockList = sectorStocks.map(s => s.symbol);
    }

    const job: ScreenerJob = {
      id: jobId,
      conditions: params.conditions,
      logic: params.logic,
      sectorFilter: params.sectorFilter,
      priceRange: params.priceRange,
      status: 'running',
      progress: 0,
      total: stockList.length,
      results: [],
      startTime: Date.now(),
      backtestDate: params.backtestDate,
    };

    setCurrentJob(job);

    // Run screening in background
    (async () => {
      const results: ScreenerResult[] = [];
      const BATCH_SIZE = 15;

      for (let i = 0; i < stockList.length; i += BATCH_SIZE) {
        if (cancelRef.current) {
          setCurrentJob(prev => prev?.id === jobId ? { ...prev, status: 'cancelled' } : prev);
          return;
        }

        const batch = stockList.slice(i, i + BATCH_SIZE);
        
        await Promise.allSettled(batch.map(async (symbol) => {
          if (cancelRef.current) return;

          try {
            // For each condition, check all selected intervals
            const allMatchedConditions: string[] = [];
            
            for (const cond of params.conditions) {
              const intervalMatches: boolean[] = [];
              
              for (const iv of cond.intervals) {
                let candles = await fetchStockData(symbol, iv);
                
                // If backtest mode, truncate candles
                if (params.backtestDate) {
                  const str = String(params.backtestDate);
                  const y = parseInt(str.slice(0, 4));
                  const m = parseInt(str.slice(4, 6)) - 1;
                  const d = parseInt(str.slice(6, 8));
                  const cutoff = new Date(y, m, d).getTime();
                  candles = candles.filter(c => c.time <= cutoff);
                }
                
                // Price filter
                if (candles.length > 0) {
                  const lastPrice = candles[candles.length - 1].close;
                  if (lastPrice < params.priceRange[0] || lastPrice > params.priceRange[1]) {
                    return; // Skip this stock
                  }
                }
                
                const matched = checkStockConditions(candles, [{ ...cond, intervals: [iv] }], 'AND');
                intervalMatches.push(matched.length > 0);
              }
              
              // For a single condition, all selected intervals must match (AND within condition)
              if (intervalMatches.length > 0 && intervalMatches.every(m => m)) {
                allMatchedConditions.push(`${cond.indicator}@${cond.intervals.join(',')}`);
              }
            }
            
            // Check if stock passes based on logic
            let passes = false;
            if (params.logic === 'AND') {
              passes = allMatchedConditions.length === params.conditions.length;
            } else {
              passes = allMatchedConditions.length > 0;
            }
            
            if (passes) {
              results.push({
                symbol,
                name: symbol,
                matchedConditions: allMatchedConditions,
              });
            }
          } catch {
            // Skip failed stocks
          }
        }));

        // Update progress
        const newProgress = Math.min(i + BATCH_SIZE, stockList.length);
        setCurrentJob(prev => {
          if (prev?.id !== jobId || cancelRef.current) return prev;
          return { ...prev, progress: newProgress, results: [...results] };
        });
      }

      // Job completed
      if (!cancelRef.current) {
        const completedJob: ScreenerJob = {
          ...job,
          status: 'completed',
          progress: stockList.length,
          results: [...results],
          endTime: Date.now(),
        };
        
        setCurrentJob(completedJob);
        setJobHistory(prev => [completedJob, ...prev].slice(0, 10));
        
        // Add notification
        const notification: ScreenerNotification = {
          id: `notif_${Date.now()}`,
          jobId,
          message: `条件选股完成！找到 ${results.length} 只符合条件的股票`,
          resultCount: results.length,
          timestamp: Date.now(),
          dismissed: false,
        };
        setNotifications(prev => [notification, ...prev]);
      }
    })();

    return jobId;
  }, []);

  const cancelScreening = useCallback(() => {
    cancelRef.current = true;
    setCurrentJob(prev => prev ? { ...prev, status: 'cancelled' } : null);
  }, []);

  const clearJob = useCallback((id: string) => {
    setCurrentJob(prev => prev?.id === id ? null : prev);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, dismissed: true } : n));
  }, []);

  return (
    <ScreenerContext.Provider value={{
      currentJob,
      jobHistory,
      startScreening,
      cancelScreening,
      clearJob,
      notifications,
      dismissNotification,
    }}>
      {children}
    </ScreenerContext.Provider>
  );
}
