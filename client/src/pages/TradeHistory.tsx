import { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, DollarSign, Hash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface BacktestSession {
  id: number;
  name: string;
  initialBalance: string;
  currentBalance: string;
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
  if (str.length === 8) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  return str;
}

export default function TradeHistory() {
  const [, navigate] = useLocation();
  const [, params] = useRoute('/backtest/:id/history');
  const sessionId = params?.id ? parseInt(params.id) : 0;

  const [session, setSession] = useState<BacktestSession | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [sessionId]);

  async function loadData() {
    try {
      setLoading(true);

      // Load session
      const sessionRes = await fetch(`/api/backtest/session/${sessionId}`, {
        headers: getAuthHeaders(),
      });
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json();
        setSession(sessionData);
      }

      // Load trades
      const tradesRes = await fetch(`/api/backtest/session/${sessionId}/trades`, {
        headers: getAuthHeaders(),
      });
      if (tradesRes.ok) {
        const tradesData = await tradesRes.json();
        setTrades(tradesData);
      }
    } catch (error) {
      console.error('Failed to load trade history:', error);
    } finally {
      setLoading(false);
    }
  }

  // Calculate P&L for each trade
  const tradesWithPnL = trades.map((trade, index) => {
    let pnl = 0;
    let pnlPercent = 0;

    if (trade.type === 'sell' && index > 0) {
      // Find the most recent buy trade for the same symbol
      for (let i = index - 1; i >= 0; i--) {
        const prevTrade = trades[i];
        if (prevTrade.symbol === trade.symbol && prevTrade.type === 'buy') {
          const buyPrice = parseFloat(prevTrade.price);
          const sellPrice = parseFloat(trade.price);
          const quantity = Math.min(prevTrade.quantity, trade.quantity);
          pnl = (sellPrice - buyPrice) * quantity;
          pnlPercent = ((sellPrice - buyPrice) / buyPrice) * 100;
          break;
        }
      }
    }

    return {
      ...trade,
      pnl,
      pnlPercent,
    };
  });

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
        <p className="text-muted-foreground">回测会话不存在</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/backtest/${sessionId}`)}
              >
                <ArrowLeft size={16} />
                返回
              </Button>
              <div>
                <h1 className="text-lg font-bold">{session.name} - 交易历史</h1>
                <p className="text-xs text-muted-foreground">
                  共 {trades.length} 笔交易
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trade List */}
      <div className="container mx-auto px-4 py-6">
        {trades.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tradesWithPnL.map((trade) => (
              <div
                key={trade.id}
                className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  {/* Left: Trade Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-medium ${
                        trade.type === 'buy' 
                          ? 'bg-red-500/10 text-red-500' 
                          : 'bg-green-500/10 text-green-500'
                      }`}>
                        {trade.type === 'buy' ? (
                          <>
                            <TrendingUp size={14} />
                            买入
                          </>
                        ) : (
                          <>
                            <TrendingDown size={14} />
                            卖出
                          </>
                        )}
                      </div>
                      <span className="text-lg font-bold">{trade.symbol}</span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Calendar size={12} />
                          <span className="text-xs">交易日期</span>
                        </div>
                        <div className="font-medium">{formatDateNum(trade.tradeDate)}</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <DollarSign size={12} />
                          <span className="text-xs">成交价格</span>
                        </div>
                        <div className="font-medium">${parseFloat(trade.price).toFixed(2)}</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <Hash size={12} />
                          <span className="text-xs">交易数量</span>
                        </div>
                        <div className="font-medium">{trade.quantity} 股</div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1 text-muted-foreground mb-1">
                          <DollarSign size={12} />
                          <span className="text-xs">交易金额</span>
                        </div>
                        <div className="font-medium">${parseFloat(trade.amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                      </div>
                    </div>
                  </div>

                  {/* Right: P&L (only for sell trades) */}
                  {trade.type === 'sell' && trade.pnl !== 0 && (
                    <div className="ml-4 text-right">
                      <div className="text-xs text-muted-foreground mb-1">盈亏</div>
                      <div className={`text-lg font-bold ${trade.pnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                      </div>
                      <div className={`text-sm ${trade.pnlPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {trade.pnlPercent >= 0 ? '+' : ''}{trade.pnlPercent.toFixed(2)}%
                      </div>
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  创建时间: {new Date(trade.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
