import { CDSignal, BuySellPressure, NXSignal, MomentumSignal } from '@/lib/types';
import { TrendingUp, TrendingDown, Zap, Activity } from 'lucide-react';

interface SignalPanelProps {
  cdSignals: CDSignal[];
  buySellPressure: BuySellPressure[];
  nxSignals: NXSignal[];
  momentumSignals?: MomentumSignal[];
}

export default function SignalPanel({ cdSignals, buySellPressure, nxSignals, momentumSignals = [] }: SignalPanelProps) {
  const cdBuy = cdSignals.filter(s => s.type === 'buy').length;
  const cdSell = cdSignals.filter(s => s.type === 'sell').length;
  const lastCd = cdSignals[cdSignals.length - 1];

  const strongUp = buySellPressure.filter(p => p.signal === 'strong_up').length;
  const strongDown = buySellPressure.filter(p => p.signal === 'strong_down').length;
  const lastPressure = buySellPressure[buySellPressure.length - 1];
  const lastStrongSignal = [...buySellPressure].reverse().find(p => p.signal);

  const nxBuy = nxSignals.filter(s => s.type === 'buy').length;
  const nxSell = nxSignals.filter(s => s.type === 'sell').length;
  const lastNx = nxSignals[nxSignals.length - 1];

  const momentumBuy = momentumSignals.filter(m => 
    m.signal === 'double_digit_up' || m.signal === 'yellow_cross_green' || 
    m.signal === 'green_to_red' || m.signal === 'strong_buy'
  ).length;
  const momentumSell = 0; // 不再统计卖出信号
  const lastMomentum = momentumSignals[momentumSignals.length - 1];
  const lastMomentumSignal = [...momentumSignals].reverse().find(m => m.signal);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    // 转换为美东时间 (ET)
    const etString = d.toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    // 格式: "MM/DD, HH:mm" -> "MM/DD HH:mm"
    return etString.replace(',', '');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {/* CD Signal Stats */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-cyan" />
          <span className="text-sm font-medium">CD抄底信号</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-up" />
            <span className="text-muted-foreground">买入:</span>
            <span className="data-mono text-up font-medium">{cdBuy}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={14} className="text-down" />
            <span className="text-muted-foreground">卖出:</span>
            <span className="data-mono text-down font-medium">{cdSell}</span>
          </div>
        </div>
        {lastCd && (
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            最近: <span className={lastCd.type === 'buy' ? 'text-up' : 'text-down'}>{lastCd.label}</span>
            <span className="ml-1">({formatTime(lastCd.time)})</span>
          </div>
        )}
      </div>

      {/* Buy/Sell Pressure Stats */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-purple" />
          <span className="text-sm font-medium">买卖力道信号</span>
        </div>
        <div className="mb-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground space-y-1">
          <div>⚡ 闪电：买入动能比前一天高50%</div>
          <div>💀 骷髅头：卖出动能比前一天高50%</div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <Zap size={14} className="text-purple" />
            <span className="text-muted-foreground">动能强劲:</span>
            <span className="data-mono text-purple font-medium">{strongUp}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={14} className="text-down" />
            <span className="text-muted-foreground">动能减弱:</span>
            <span className="data-mono text-down font-medium">{strongDown}</span>
          </div>
        </div>
        {lastStrongSignal && (
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            最近: <span className={lastStrongSignal.signal === 'strong_up' ? 'text-purple' : 'text-down'}>
              {lastStrongSignal.signal === 'strong_up' ? '⚡ 动能强劲' : '动能减弱'}
            </span>
            <span className="ml-1">({formatTime(lastStrongSignal.time)})</span>
          </div>
        )}
        {lastPressure && (
          <div className="mt-1 text-xs text-muted-foreground">
            当前力道: <span className="data-mono">{lastPressure.pressure.toFixed(2)}</span>
            <span className="ml-1">变化率: <span className={`data-mono ${lastPressure.changeRate >= 0 ? 'text-up' : 'text-down'}`}>{lastPressure.changeRate >= 0 ? '+' : ''}{lastPressure.changeRate.toFixed(1)}%</span></span>
          </div>
        )}
      </div>

      {/* NX Signal Stats */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-cyan" />
          <span className="text-sm font-medium">NX指标信号</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-up" />
            <span className="text-muted-foreground">买入:</span>
            <span className="data-mono text-up font-medium">{nxBuy}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={14} className="text-down" />
            <span className="text-muted-foreground">卖出:</span>
            <span className="data-mono text-down font-medium">{nxSell}</span>
          </div>
        </div>
        {lastNx && (
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            最近: <span className={lastNx.type === 'buy' ? 'text-up' : 'text-down'}>{lastNx.label}</span>
            <span className="ml-1">({formatTime(lastNx.time)})</span>
          </div>
        )}
      </div>

      {/* Momentum Signal Stats */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-cyan-400" />
          <span className="text-sm font-medium">买卖动能信号</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5">
            <TrendingUp size={14} className="text-up" />
            <span className="text-muted-foreground">强买:</span>
            <span className="data-mono text-up font-medium">{momentumBuy}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown size={14} className="text-down" />
            <span className="text-muted-foreground">强卖:</span>
            <span className="data-mono text-down font-medium">{momentumSell}</span>
          </div>
        </div>
        {lastMomentumSignal && (
          <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
            最近: <span className={lastMomentumSignal.signal === 'strong_buy' ? 'text-up' : 'text-down'}>
              {lastMomentumSignal.signal === 'strong_buy' ? '强买' : '强卖'}
            </span>
            <span className="ml-1">({formatTime(lastMomentumSignal.time)})</span>
          </div>
        )}
        {lastMomentum && (
          <div className="mt-1 text-xs text-muted-foreground">
            动能差: <span className={`data-mono ${lastMomentum.diff >= 0 ? 'text-up' : 'text-down'}`}>
              {lastMomentum.diff >= 0 ? '+' : ''}{lastMomentum.diff.toFixed(1)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
