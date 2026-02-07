import { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { ArrowLeft, Star, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import StockChart from '@/components/StockChart';
import SignalPanel from '@/components/SignalPanel';
// LoginDialog removed - using Manus OAuth
import { useAuth } from '@/contexts/AuthContext';
import { useWatchlist } from '@/contexts/WatchlistContext';

import { fetchStockData, fetchStockQuote, getStockSectors, SECTOR_NAMES } from '@/lib/stockApi';
import type { StockSector } from '@/lib/stockApi';
import { trpc } from '@/lib/trpc';
import { calculateCDSignals, calculateBuySellPressure, calculateNXSignals, calculateMomentum } from '@/lib/indicators';
import { Candle, TimeInterval, CDSignal, BuySellPressure, NXSignal, MomentumSignal, StockQuote } from '@/lib/types';

const INTERVALS: { value: TimeInterval; label: string }[] = [
  { value: '1m', label: '1m' },
  { value: '3m', label: '3m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '30m', label: '30m' },
  { value: '1h', label: '1h' },
  { value: '2h', label: '2h' },
  { value: '3h', label: '3h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1d' },
  { value: '1w', label: '1w' },
  { value: '1mo', label: '1mo' },
];

export default function StockDetail() {
  const params = useParams<{ symbol: string }>();
  const symbol = params.symbol?.toUpperCase() || 'TSLA';
  const [, navigate] = useLocation();

  const { isAuthenticated } = useAuth();
  const isLoggedIn = isAuthenticated;
  const { isInWatchlist, toggleStock } = useWatchlist();

  const [interval, setInterval] = useState<TimeInterval>('1d');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);

  // Fetch company profile
  const { data: companyProfile } = trpc.stock.getCompanyProfile.useQuery(
    { symbol },
    { staleTime: 24 * 60 * 60 * 1000 } // 24 hours
  );

  // Get stock sectors from local config
  const stockSectors = getStockSectors(symbol);


  // Fetch data
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchStockData(symbol, interval),
      fetchStockQuote(symbol),
    ]).then(([chartData, quoteData]) => {
      if (cancelled) return;
      setCandles(chartData);
      setQuote(quoteData);
      setLoading(false);
    }).catch(err => {
      if (cancelled) return;
      setError(err.message || 'Failed to load data');
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [symbol, interval]);

  // Calculate indicators
  const cdSignals = useMemo<CDSignal[]>(() => calculateCDSignals(candles), [candles]);
  const buySellPressure = useMemo<BuySellPressure[]>(() => calculateBuySellPressure(candles), [candles]);
  const nxSignals = useMemo<NXSignal[]>(() => calculateNXSignals(candles), [candles]);
  const momentumSignals = useMemo<MomentumSignal[]>(() => calculateMomentum(candles), [candles]);

  const handleFavorite = () => {
    if (!isLoggedIn) {
      setShowLogin(true);
      return;
    }
    toggleStock(symbol);
  };

  const isFav = isInWatchlist(symbol);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft size={16} className="mr-1" /> 返回
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight">{symbol}</span>
              {quote && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="data-mono font-semibold text-lg">${quote.price.toFixed(2)}</span>
                  <span className={`data-mono font-medium ${
                    quote.change >= 0 
                      ? 'text-red-500' 
                      : 'text-green-500'
                  }`}>
                    {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({quote.changePercent >= 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleFavorite} className="gap-1">
              <Star size={16} className={isFav ? 'fill-yellow-400 text-yellow-400' : ''} />
              {isFav ? '已收藏' : '收藏'}
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-4 space-y-4">
        {/* Company Info */}
        {companyProfile && (
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start gap-4">
              {companyProfile.logo && (
                <img 
                  src={companyProfile.logo} 
                  alt={companyProfile.name}
                  className="w-16 h-16 rounded-lg object-contain bg-background"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              )}
              <div className="flex-1 space-y-2">
                <div>
                  <h2 className="text-lg font-semibold">{companyProfile.name}</h2>
                  {companyProfile.exchange && (
                    <p className="text-sm text-muted-foreground">{companyProfile.exchange}</p>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-4 text-sm">
                  {companyProfile.marketCap > 0 && (
                    <div>
                      <span className="text-muted-foreground">市值：</span>
                      <span className="font-medium">
                        {companyProfile.marketCap >= 1000 
                          ? `$${(companyProfile.marketCap / 1000).toFixed(2)}B`
                          : `$${companyProfile.marketCap.toFixed(2)}M`
                        }
                      </span>
                    </div>
                  )}
                  {companyProfile.industry && (
                    <div>
                      <span className="text-muted-foreground">行业：</span>
                      <span className="font-medium">{companyProfile.industry}</span>
                    </div>
                  )}
                  {stockSectors.length > 0 && (
                    <div>
                      <span className="text-muted-foreground">板块：</span>
                      <span className="font-medium">
                        {stockSectors.map(s => SECTOR_NAMES[s]).join('、')}
                      </span>
                    </div>
                  )}
                </div>

                {companyProfile.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {companyProfile.description}
                  </p>
                )}

                {companyProfile.weburl && (
                  <a 
                    href={companyProfile.weburl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-block"
                  >
                    官网 →
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Interval selector */}
        <div className="flex items-center gap-1 flex-wrap">
          {INTERVALS.map(iv => (
            <button
              key={iv.value}
              onClick={() => setInterval(iv.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                interval === iv.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {iv.label}
            </button>
          ))}
        </div>

        {/* Chart area */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="ml-2 text-muted-foreground">加载数据中...</span>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={() => setInterval(interval)}>重试</Button>
            </div>
          </div>
        ) : (
          <>
            <StockChart
              candles={candles}
              interval={interval}
              cdSignals={cdSignals}
              buySellPressure={buySellPressure}
              momentumSignals={momentumSignals}
              height={380}
            />

            {/* Signal Panel */}
            <div className="pt-2">
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
      </main>

      {/* LoginDialog removed - using Manus OAuth */}
    </div>
  );
}
