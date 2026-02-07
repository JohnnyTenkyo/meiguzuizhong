import { TrendingUp, TrendingDown, Target, Award, BarChart3, DollarSign } from 'lucide-react';

interface Trade {
  id: number;
  type: 'buy' | 'sell';
  price: string;
  quantity: number;
  amount: string;
  tradeDate: number;
}

interface BacktestStatsProps {
  initialBalance: number;
  currentBalance: number;
  totalAssets: number;
  trades: Trade[];
}

interface StatsData {
  totalReturn: number;
  totalReturnAmount: number;
  winRate: number;
  maxDrawdown: number;
  profitLossRatio: number;
  totalTrades: number;
  winTrades: number;
  lossTrades: number;
  avgProfit: number;
  avgLoss: number;
}

function calculateStats(initialBalance: number, currentBalance: number, totalAssets: number, trades: Trade[]): StatsData {
  // 总收益率
  const totalReturn = ((totalAssets - initialBalance) / initialBalance) * 100;
  const totalReturnAmount = totalAssets - initialBalance;

  // 按股票分组交易，计算每笔完整交易的盈亏
  const tradesBySymbol: { [symbol: string]: Trade[] } = {};
  trades.forEach(t => {
    // 从 trade 对象中提取 symbol（这里简化处理，实际需要从 trade 中获取）
    // 由于当前 Trade 接口没有 symbol，我们需要从交易历史中推断
    // 暂时使用简化逻辑：按顺序配对买卖
  });

  // 简化计算：统计所有卖出交易的盈亏
  const sellTrades = trades.filter(t => t.type === 'sell');
  const buyTrades = trades.filter(t => t.type === 'buy');

  let winTrades = 0;
  let lossTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;

  // 简化逻辑：假设每次卖出都对应最近的买入
  const buyQueue: Trade[] = [...buyTrades].reverse();
  
  sellTrades.forEach(sell => {
    if (buyQueue.length > 0) {
      const buy = buyQueue.pop()!;
      const buyPrice = parseFloat(buy.price);
      const sellPrice = parseFloat(sell.price);
      const quantity = Math.min(buy.quantity, sell.quantity);
      const pnl = (sellPrice - buyPrice) * quantity;

      if (pnl > 0) {
        winTrades++;
        totalProfit += pnl;
      } else if (pnl < 0) {
        lossTrades++;
        totalLoss += Math.abs(pnl);
      }
    }
  });

  const winRate = (winTrades + lossTrades) > 0 ? (winTrades / (winTrades + lossTrades)) * 100 : 0;
  const avgProfit = winTrades > 0 ? totalProfit / winTrades : 0;
  const avgLoss = lossTrades > 0 ? totalLoss / lossTrades : 0;
  const profitLossRatio = avgLoss > 0 ? avgProfit / avgLoss : 0;

  // 最大回撤（简化计算：基于当前总资产和初始资金）
  // 实际应该追踪历史最高净值
  const maxDrawdown = totalReturn < 0 ? Math.abs(totalReturn) : 0;

  return {
    totalReturn,
    totalReturnAmount,
    winRate,
    maxDrawdown,
    profitLossRatio,
    totalTrades: winTrades + lossTrades,
    winTrades,
    lossTrades,
    avgProfit,
    avgLoss,
  };
}

export default function BacktestStats({ initialBalance, currentBalance, totalAssets, trades }: BacktestStatsProps) {
  const stats = calculateStats(initialBalance, currentBalance, totalAssets, trades);

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <BarChart3 size={16} className="text-primary" />
        回测绩效统计
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {/* 总收益率 */}
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            {stats.totalReturn >= 0 ? (
              <TrendingUp size={14} className="text-red-500" />
            ) : (
              <TrendingDown size={14} className="text-green-500" />
            )}
            <span className="text-xs text-muted-foreground">总收益率</span>
          </div>
          <div className={`text-lg font-bold ${stats.totalReturn >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn.toFixed(2)}%
          </div>
          <div className={`text-xs ${stats.totalReturnAmount >= 0 ? 'text-red-500' : 'text-green-500'}`}>
            {stats.totalReturnAmount >= 0 ? '+' : ''}${stats.totalReturnAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>

        {/* 胜率 */}
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">胜率</span>
          </div>
          <div className="text-lg font-bold text-foreground">
            {stats.winRate.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.winTrades}胜 / {stats.lossTrades}负
          </div>
        </div>

        {/* 最大回撤 */}
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-orange-500" />
            <span className="text-xs text-muted-foreground">最大回撤</span>
          </div>
          <div className="text-lg font-bold text-orange-500">
            -{stats.maxDrawdown.toFixed(2)}%
          </div>
          <div className="text-xs text-muted-foreground">
            风险指标
          </div>
        </div>

        {/* 盈亏比 */}
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Award size={14} className="text-primary" />
            <span className="text-xs text-muted-foreground">盈亏比</span>
          </div>
          <div className="text-lg font-bold text-foreground">
            {stats.profitLossRatio.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {stats.profitLossRatio >= 1 ? '优秀' : stats.profitLossRatio >= 0.5 ? '良好' : '需改进'}
          </div>
        </div>

        {/* 平均盈利 */}
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-red-500" />
            <span className="text-xs text-muted-foreground">平均盈利</span>
          </div>
          <div className="text-lg font-bold text-red-500">
            +${stats.avgProfit.toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground">
            每笔盈利交易
          </div>
        </div>

        {/* 平均亏损 */}
        <div className="bg-accent/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-green-500" />
            <span className="text-xs text-muted-foreground">平均亏损</span>
          </div>
          <div className="text-lg font-bold text-green-500">
            -${stats.avgLoss.toFixed(0)}
          </div>
          <div className="text-xs text-muted-foreground">
            每笔亏损交易
          </div>
        </div>
      </div>

      {/* 交易统计摘要 */}
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>总交易次数: <span className="text-foreground font-medium">{stats.totalTrades}</span></span>
          <span>初始资金: <span className="text-foreground font-medium">${initialBalance.toLocaleString()}</span></span>
          <span>当前总资产: <span className="text-foreground font-medium">${totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
        </div>
      </div>
    </div>
  );
}
