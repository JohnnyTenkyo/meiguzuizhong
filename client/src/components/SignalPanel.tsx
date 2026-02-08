import { CDSignal, BuySellPressure, NXSignal, MomentumSignal, ChanLunSignal, AdvancedChanSignal } from '@/lib/types';
import { useState } from 'react';
import { TrendingUp, TrendingDown, Zap, Activity } from 'lucide-react';
import SignalTimeFilter, { TimeRange } from './SignalTimeFilter';

interface SignalPanelProps {
  cdSignals: CDSignal[];
  buySellPressure: BuySellPressure[];
  nxSignals: NXSignal[];
  momentumSignals?: MomentumSignal[];
  chanLunSignals?: ChanLunSignal[];
  advancedChanSignals?: AdvancedChanSignal[];
  chanBuySellSignals?: AdvancedChanSignal[];
}

export default function SignalPanel({ cdSignals, buySellPressure, nxSignals, momentumSignals = [], chanLunSignals = [], advancedChanSignals = [], chanBuySellSignals = [] }: SignalPanelProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customStartTime, setCustomStartTime] = useState<number>();
  const [customEndTime, setCustomEndTime] = useState<number>();

  // Filter signals based on time range
  const filterByTime = <T extends { time: number }>(signals: T[]): T[] => {
    if (timeRange === 'all') return signals;
    
    const now = Date.now();
    let startTime: number;
    let endTime = now;
    
    if (timeRange === '30days') {
      startTime = now - 30 * 24 * 60 * 60 * 1000;
    } else if (timeRange === '90days') {
      startTime = now - 90 * 24 * 60 * 60 * 1000;
    } else if (timeRange === 'custom' && customStartTime && customEndTime) {
      startTime = customStartTime;
      endTime = customEndTime;
    } else {
      return signals;
    }
    
    return signals.filter(s => s.time >= startTime && s.time <= endTime);
  };

  const handleRangeChange = (range: TimeRange, customStart?: number, customEnd?: number) => {
    setTimeRange(range);
    if (range === 'custom') {
      setCustomStartTime(customStart);
      setCustomEndTime(customEnd);
    }
  };

  // Apply time filter to all signals
  const filteredCdSignals = filterByTime(cdSignals);
  const filteredBuySellPressure = filterByTime(buySellPressure);
  const filteredNxSignals = filterByTime(nxSignals);
  const filteredMomentumSignals = filterByTime(momentumSignals);
  const filteredChanLunSignals = filterByTime(chanLunSignals);
  const filteredAdvancedChanSignals = filterByTime(advancedChanSignals);
  const filteredChanBuySellSignals = filterByTime(chanBuySellSignals);

  const cdBuy = filteredCdSignals.filter(s => s.type === 'buy').length;
  const cdSell = filteredCdSignals.filter(s => s.type === 'sell').length;
  const lastCd = filteredCdSignals[filteredCdSignals.length - 1];

  const strongUp = filteredBuySellPressure.filter(p => p.signal === 'strong_up').length;
  const strongDown = filteredBuySellPressure.filter(p => p.signal === 'strong_down').length;
  const lastPressure = filteredBuySellPressure[filteredBuySellPressure.length - 1];
  const lastStrongSignal = [...filteredBuySellPressure].reverse().find(p => p.signal);

  const nxBuy = filteredNxSignals.filter(s => s.type === 'buy').length;
  const nxSell = filteredNxSignals.filter(s => s.type === 'sell').length;
  const lastNx = filteredNxSignals[filteredNxSignals.length - 1];

  // Calculate momentum markers (⚡💀 + 弱转强/强转弱)
  let lightningCount = 0;  // ⚡ 闪电
  let skullCount = 0;      // 💀 骷髅头
  let weakToStrongCount = 0;  // 弱转强
  let strongToWeakCount = 0;  // 强转弱
  
  for (let i = 1; i < filteredMomentumSignals.length; i++) {
    const curr = filteredMomentumSignals[i];
    const prev = filteredMomentumSignals[i - 1];
    if (!curr || !prev) continue;
    
    // ⚡ 闪电：买压红柱高于前一天100%
    if (curr.diff > 0 && prev.diff > 0 && curr.diff >= prev.diff * 2) {
      lightningCount++;
    }
    // 💀 骷髅头：卖压绿柱高于前一天100%
    if (curr.diff < 0 && prev.diff < 0 && Math.abs(curr.diff) >= Math.abs(prev.diff) * 2) {
      skullCount++;
    }
    
    // 弱转强：黄线穿过绿线 + 红柱高于前一天100%
    if (prev.buyMomentum <= prev.sellMomentum && curr.buyMomentum > curr.sellMomentum && 
        curr.diff > 0 && prev.diff > 0 && curr.diff >= prev.diff * 2) {
      weakToStrongCount++;
    }
    // 强转弱：绿线穿过黄线 + 绿柱高于前一天100%
    if (prev.sellMomentum <= prev.buyMomentum && curr.sellMomentum > curr.buyMomentum && 
        curr.diff < 0 && prev.diff < 0 && Math.abs(curr.diff) >= Math.abs(prev.diff) * 2) {
      strongToWeakCount++;
    }
  }
  
  const lastMomentum = filteredMomentumSignals[filteredMomentumSignals.length - 1];
  const lastMomentumSignal = [...filteredMomentumSignals].reverse().find(m => m.signal);

  // ChanLun stats
  const chanLunBuy = filteredChanLunSignals.filter(s => s.signalType === 'buy').length;
  const chanLunSell = filteredChanLunSignals.filter(s => s.signalType === 'sell').length;
  const chanLunTop = filteredChanLunSignals.filter(s => s.type === 'top').length;
  const chanLunBottom = filteredChanLunSignals.filter(s => s.type === 'bottom').length;
  const lastChanLun = filteredChanLunSignals[filteredChanLunSignals.length - 1];

  // Advanced Chan stats
  const acBuy = filteredAdvancedChanSignals.filter(s => s.type === 'buy').length;
  const acSell = filteredAdvancedChanSignals.filter(s => s.type === 'sell').length;
  const lastAc = filteredAdvancedChanSignals[filteredAdvancedChanSignals.length - 1];
  const nearSupport = filteredAdvancedChanSignals.filter(s => s.category === 'near_support').length;
  const nearResistance = filteredAdvancedChanSignals.filter(s => s.category === 'near_resistance').length;

  // Chan Buy/Sell points (1买2买3买/1卖2卖3卖)
  const chanB1 = filteredChanBuySellSignals.filter(s => s.category === 'b1').length;
  const chanB2 = filteredChanBuySellSignals.filter(s => s.category === 'b2').length;
  const chanB3 = filteredChanBuySellSignals.filter(s => s.category === 'b3').length;
  const chanS1 = filteredChanBuySellSignals.filter(s => s.category === 's1').length;
  const chanS2 = filteredChanBuySellSignals.filter(s => s.category === 's2').length;
  const chanS3 = filteredChanBuySellSignals.filter(s => s.category === 's3').length;
  const lastChanBS = filteredChanBuySellSignals[filteredChanBuySellSignals.length - 1];

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const etString = d.toLocaleString('en-US', { 
      timeZone: 'America/New_York',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    return etString.replace(',', '');
  };

  return (
    <div className="space-y-3">
      <SignalTimeFilter onRangeChange={handleRangeChange} />
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
            <div>⚡ 闪电：买入动能比前一天高100%</div>
            <div>💀 骷髅头：卖出动能比前一天高100%</div>
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
          <div className="mb-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground space-y-1">
            <div>⚡ 闪电：买压红柱高于前一天100%</div>
            <div>💀 骷髅头：卖压绿柱高于前一天100%</div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-lg">⚡</span>
              <span className="text-muted-foreground">闪电:</span>
              <span className="data-mono text-yellow-500 font-medium">{lightningCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg">💀</span>
              <span className="text-muted-foreground">骷髅头:</span>
              <span className="data-mono text-red-500 font-medium">{skullCount}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-1.5">
              <TrendingUp size={14} className="text-up" />
              <span className="text-muted-foreground">弱转强:</span>
              <span className="data-mono text-up font-medium">{weakToStrongCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <TrendingDown size={14} className="text-down" />
              <span className="text-muted-foreground">强转弱:</span>
              <span className="data-mono text-down font-medium">{strongToWeakCount}</span>
            </div>
          </div>
          {lastMomentum && (
            <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
              动能差: <span className={`data-mono ${lastMomentum.diff >= 0 ? 'text-up' : 'text-down'}`}>
                {lastMomentum.diff >= 0 ? '+' : ''}{lastMomentum.diff.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ChanLun + Chan Buy/Sell Points row - Always show */}
      {true && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* ChanLun Signal Stats - Always show */}
          {true && (
            <div className="rounded-lg border border-orange-500/30 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-orange-500 font-bold text-sm">缠</span>
                <span className="text-sm font-medium">缠论分型信号</span>
              </div>
              <div className="mb-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground space-y-1">
                <div>● 底分型：连续3根K线中间最低（看涨）</div>
                <div>● 顶分型：连续3根K线中间最高（看跌）</div>
                <div>■ 底背离买入：底分型 + MACD底背离</div>
                <div>■ 顶背离卖出：顶分型 + MACD顶背离</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-400">●</span>
                  <span className="text-muted-foreground">底分型:</span>
                  <span className="data-mono text-orange-400 font-medium">{chanLunBottom}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-400">●</span>
                  <span className="text-muted-foreground">顶分型:</span>
                  <span className="data-mono text-purple-400 font-medium">{chanLunTop}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-500">■</span>
                  <span className="text-muted-foreground">背离买:</span>
                  <span className="data-mono text-orange-500 font-medium">{chanLunBuy}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-purple-500">■</span>
                  <span className="text-muted-foreground">背离卖:</span>
                  <span className="data-mono text-purple-500 font-medium">{chanLunSell}</span>
                </div>
              </div>
              {lastChanLun && (
                <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                  最近: <span className={lastChanLun.type === 'bottom' ? 'text-orange-400' : 'text-purple-400'}>
                    {lastChanLun.label}
                  </span>
                  <span className="ml-1">({formatTime(lastChanLun.time)})</span>
                </div>
              )}
            </div>
          )}

          {/* Chan Buy/Sell Points (1买2买3买/1卖2卖3卖) - Always show */}
          {true && (
            <div className="rounded-lg border border-cyan-500/30 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-cyan-500 font-bold text-sm">缠</span>
                <span className="text-sm font-medium">缠论买卖点</span>
              </div>
              <div className="mb-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground space-y-1">
                <div>1买/1卖：趋势反转（MACD背驰）</div>
                <div>2买/2卖：1买/1卖后的确认信号</div>
                <div>3买/3卖：离开中枢后回踩不进入中枢</div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-500 font-bold text-xs">1买</span>
                  <span className="data-mono text-orange-500 font-medium">{chanB1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-red-500 font-bold text-xs">1卖</span>
                  <span className="data-mono text-red-500 font-medium">{chanS1}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-yellow-500 font-bold text-xs">2买</span>
                  <span className="data-mono text-yellow-500 font-medium">{chanB2}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-400 font-bold text-xs">2卖</span>
                  <span className="data-mono text-orange-400 font-medium">{chanS2}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-500 font-bold text-xs">3买</span>
                  <span className="data-mono text-emerald-500 font-medium">{chanB3}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-pink-500 font-bold text-xs">3卖</span>
                  <span className="data-mono text-pink-500 font-medium">{chanS3}</span>
                </div>
              </div>
              {lastChanBS && (
                <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground">
                  最近: <span className={lastChanBS.type === 'buy' ? 'text-emerald-400' : 'text-rose-400'}>
                    {lastChanBS.label}
                  </span>
                  <span className="ml-1">({formatTime(lastChanBS.time)})</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
