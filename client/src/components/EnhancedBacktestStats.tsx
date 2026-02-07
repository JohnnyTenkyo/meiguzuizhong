import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Target, Award, BarChart3, DollarSign, LineChart, Calendar, Package } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Trade {
  id: number;
  symbol: string;
  type: 'buy' | 'sell';
  price: string;
  quantity: number;
  amount: string;
  tradeDate: number;
}

interface Position {
  symbol: string;
  quantity: number;
  avgCost: string;
  totalCost: string;
}

interface EnhancedBacktestStatsProps {
  initialBalance: number;
  currentBalance: number;
  totalAssets: number;
  trades: Trade[];
  positions: Position[];
}

interface DailyPnL {
  date: number;
  dateStr: string;
  totalAssets: number;
  pnl: number;
  pnlPercent: number;
  trades: Trade[];
}

interface StockPnL {
  symbol: string;
  totalBuyAmount: number;
  totalSellAmount: number;
  totalPnL: number;
  pnlPercent: number;
  tradeCount: number;
  currentPosition: number;
  avgCost: number;
}

function formatDateNum(dateNum: number): string {
  const str = String(dateNum);
  if (str.length === 8) return `${str.slice(4, 6)}/${str.slice(6, 8)}`;
  return str;
}

function calculateDailyPnL(initialBalance: number, trades: Trade[]): DailyPnL[] {
  // Group trades by date
  const tradesByDate: { [date: number]: Trade[] } = {};
  trades.forEach(t => {
    if (!tradesByDate[t.tradeDate]) {
      tradesByDate[t.tradeDate] = [];
    }
    tradesByDate[t.tradeDate].push(t);
  });

  const dates = Object.keys(tradesByDate).map(Number).sort((a, b) => a - b);
  const dailyPnL: DailyPnL[] = [];
  let runningBalance = initialBalance;
  let runningPositions: { [symbol: string]: { quantity: number; totalCost: number } } = {};

  dates.forEach(date => {
    const dayTrades = tradesByDate[date];
    let dayPnL = 0;

    dayTrades.forEach(trade => {
      const amount = parseFloat(trade.amount);
      if (trade.type === 'buy') {
        runningBalance -= amount;
        if (!runningPositions[trade.symbol]) {
          runningPositions[trade.symbol] = { quantity: 0, totalCost: 0 };
        }
        runningPositions[trade.symbol].quantity += trade.quantity;
        runningPositions[trade.symbol].totalCost += amount;
      } else {
        runningBalance += amount;
        const pos = runningPositions[trade.symbol];
        if (pos) {
          const avgCost = pos.totalCost / pos.quantity;
          const costBasis = avgCost * trade.quantity;
          dayPnL += (amount - costBasis);
          pos.quantity -= trade.quantity;
          pos.totalCost -= costBasis;
          if (pos.quantity <= 0) {
            delete runningPositions[trade.symbol];
          }
        }
      }
    });

    const totalAssets = runningBalance + Object.values(runningPositions).reduce((sum, p) => sum + p.totalCost, 0);
    const pnlPercent = ((totalAssets - initialBalance) / initialBalance) * 100;

    dailyPnL.push({
      date,
      dateStr: formatDateNum(date),
      totalAssets,
      pnl: dayPnL,
      pnlPercent,
      trades: dayTrades,
    });
  });

  return dailyPnL;
}

function calculateStockPnL(trades: Trade[], positions: Position[]): StockPnL[] {
  const stockMap: { [symbol: string]: StockPnL } = {};

  trades.forEach(trade => {
    if (!stockMap[trade.symbol]) {
      stockMap[trade.symbol] = {
        symbol: trade.symbol,
        totalBuyAmount: 0,
        totalSellAmount: 0,
        totalPnL: 0,
        pnlPercent: 0,
        tradeCount: 0,
        currentPosition: 0,
        avgCost: 0,
      };
    }

    const stock = stockMap[trade.symbol];
    stock.tradeCount++;

    if (trade.type === 'buy') {
      stock.totalBuyAmount += parseFloat(trade.amount);
    } else {
      stock.totalSellAmount += parseFloat(trade.amount);
    }
  });

  // Add current positions
  positions.forEach(pos => {
    if (!stockMap[pos.symbol]) {
      stockMap[pos.symbol] = {
        symbol: pos.symbol,
        totalBuyAmount: parseFloat(pos.totalCost),
        totalSellAmount: 0,
        totalPnL: 0,
        pnlPercent: 0,
        tradeCount: 0,
        currentPosition: pos.quantity,
        avgCost: parseFloat(pos.avgCost),
      };
    }
    stockMap[pos.symbol].currentPosition = pos.quantity;
    stockMap[pos.symbol].avgCost = parseFloat(pos.avgCost);
  });

  // Calculate PnL for each stock
  Object.values(stockMap).forEach(stock => {
    stock.totalPnL = stock.totalSellAmount - stock.totalBuyAmount;
    if (stock.totalBuyAmount > 0) {
      stock.pnlPercent = (stock.totalPnL / stock.totalBuyAmount) * 100;
    }
  });

  return Object.values(stockMap).sort((a, b) => b.totalPnL - a.totalPnL);
}

export default function EnhancedBacktestStats({ initialBalance, currentBalance, totalAssets, trades, positions }: EnhancedBacktestStatsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'daily' | 'stocks'>('overview');

  const dailyPnL = useMemo(() => calculateDailyPnL(initialBalance, trades), [initialBalance, trades]);
  const stockPnL = useMemo(() => calculateStockPnL(trades, positions), [trades, positions]);

  const totalReturn = ((totalAssets - initialBalance) / initialBalance) * 100;
  const totalReturnAmount = totalAssets - initialBalance;

  // Prepare chart data
  const chartData = {
    labels: dailyPnL.map(d => d.dateStr),
    datasets: [
      {
        label: '总资产',
        data: dailyPnL.map(d => d.totalAssets),
        borderColor: totalReturn >= 0 ? 'rgb(239, 68, 68)' : 'rgb(34, 197, 94)',
        backgroundColor: totalReturn >= 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => `$${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: (value: any) => `$${value.toLocaleString()}`,
        },
      },
    },
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <BarChart3 size={16} className="text-primary" />
          回测绩效分析
        </h3>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'overview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <BarChart3 size={12} className="inline mr-1" />
            概览
          </button>
          <button
            onClick={() => setActiveTab('daily')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'daily' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <Calendar size={12} className="inline mr-1" />
            每日
          </button>
          <button
            onClick={() => setActiveTab('stocks')}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === 'stocks' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <Package size={12} className="inline mr-1" />
            股票
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Equity Curve */}
          {dailyPnL.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <LineChart size={12} />
                收益曲线
              </h4>
              <div className="h-48 bg-accent/20 rounded-lg p-2">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-accent/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                {totalReturn >= 0 ? (
                  <TrendingUp size={14} className="text-red-500" />
                ) : (
                  <TrendingDown size={14} className="text-green-500" />
                )}
                <span className="text-xs text-muted-foreground">总收益率</span>
              </div>
              <div className={`text-lg font-bold ${totalReturn >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(2)}%
              </div>
              <div className={`text-xs ${totalReturnAmount >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {totalReturnAmount >= 0 ? '+' : ''}${totalReturnAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-accent/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign size={14} className="text-primary" />
                <span className="text-xs text-muted-foreground">总资产</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                ${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-muted-foreground">
                初始 ${initialBalance.toLocaleString()}
              </div>
            </div>

            <div className="bg-accent/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Package size={14} className="text-primary" />
                <span className="text-xs text-muted-foreground">交易股票</span>
              </div>
              <div className="text-lg font-bold text-foreground">
                {stockPnL.length}
              </div>
              <div className="text-xs text-muted-foreground">
                {trades.length} 笔交易
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'daily' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Calendar size={12} />
            每日盈亏统计
          </h4>
          {dailyPnL.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">暂无交易记录</p>
          ) : (
            <div className="space-y-1">
              {dailyPnL.map((day, idx) => (
                <div key={idx} className="bg-accent/20 rounded p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{day.dateStr}</span>
                    <span className="text-muted-foreground">
                      {day.trades.length} 笔交易
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      总资产: ${day.totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className={`font-bold ${day.pnl >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {day.pnl >= 0 ? '+' : ''}${day.pnl.toFixed(0)}
                    </span>
                    <span className={`font-medium ${day.pnlPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {day.pnlPercent >= 0 ? '+' : ''}{day.pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stocks' && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Package size={12} />
            按股票分组盈亏
          </h4>
          {stockPnL.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">暂无交易记录</p>
          ) : (
            <div className="space-y-1">
              {stockPnL.map((stock, idx) => (
                <div key={idx} className="bg-accent/20 rounded p-2 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{stock.symbol}</span>
                    <span className="text-muted-foreground">
                      {stock.tradeCount} 笔
                    </span>
                    {stock.currentPosition > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        持仓 {stock.currentPosition}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">
                      买入: ${stock.totalBuyAmount.toFixed(0)}
                    </span>
                    <span className="text-muted-foreground">
                      卖出: ${stock.totalSellAmount.toFixed(0)}
                    </span>
                    <span className={`font-bold ${stock.totalPnL >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {stock.totalPnL >= 0 ? '+' : ''}${stock.totalPnL.toFixed(0)}
                    </span>
                    <span className={`font-medium ${stock.pnlPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {stock.pnlPercent >= 0 ? '+' : ''}{stock.pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
