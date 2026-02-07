import { useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts';
import { Candle, TimeInterval, CDSignal, BuySellPressure, MomentumSignal } from '@/lib/types';
import { calculateMACD } from '@/lib/indicators';

interface StockChartProps {
  candles: Candle[];
  interval: TimeInterval;
  cdSignals: CDSignal[];
  buySellPressure: BuySellPressure[];
  momentumSignals?: MomentumSignal[];
  height?: number;
  costPrice?: number;
}

function formatTime(timestamp: number, interval: TimeInterval): string {
  const date = new Date(timestamp);
  if (['1m', '5m', '15m', '30m', '1h'].includes(interval)) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function StockChart({ candles, interval, cdSignals, buySellPressure, momentumSignals, height = 400, costPrice }: StockChartProps) {
  const chartData = useMemo(() => {
    const macdResult = calculateMACD(candles);
    return candles.map((candle, index) => {
      return {
        time: formatTime(candle.time, interval),
        timestamp: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        macd: macdResult.diff[index] || 0,
        signal: macdResult.dea[index] || 0,
        histogram: macdResult.macd[index] || 0,
      };
    });
  }, [candles, interval]);

  const pressureData = useMemo(() => {
    return buySellPressure.map(p => ({
      time: formatTime(p.time, interval),
      pressure: p.pressure,
      changeRate: p.changeRate,
    }));
  }, [buySellPressure, interval]);

  const momentumData = useMemo(() => {
    if (!momentumSignals) return [];
    return momentumSignals.map(m => ({
      time: formatTime(m.time, interval),
      buyMomentum: m.buyMomentum,
      sellMomentum: m.sellMomentum,
      diff: m.diff,
    }));
  }, [momentumSignals, interval]);

  return (
    <div className="space-y-4">
      {/* Main Price Chart */}
      <div className="bg-card rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Price Chart</h3>
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="close" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              name="Close Price"
            />
            {costPrice && (
              <Line 
                type="monotone" 
                dataKey={() => costPrice} 
                stroke="#ef4444" 
                strokeWidth={1}
                strokeDasharray="5 5"
                dot={false}
                name="Cost Price"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      <div className="bg-card rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">Volume</h3>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Bar dataKey="volume" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* MACD Chart */}
      <div className="bg-card rounded-lg p-4">
        <h3 className="text-sm font-medium mb-2">MACD</h3>
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="time" 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <YAxis 
              stroke="#9ca3af"
              tick={{ fill: '#9ca3af' }}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              labelStyle={{ color: '#f3f4f6' }}
            />
            <Legend />
            <Line type="monotone" dataKey="macd" stroke="#3b82f6" strokeWidth={2} dot={false} name="MACD" />
            <Line type="monotone" dataKey="signal" stroke="#ef4444" strokeWidth={2} dot={false} name="Signal" />
            <Bar dataKey="histogram" fill="#10b981" name="Histogram" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Buy/Sell Pressure */}
      {pressureData.length > 0 && (
        <div className="bg-card rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Buy/Sell Pressure</h3>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={pressureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="pressure" stroke="#10b981" strokeWidth={2} dot={false} name="Pressure" />
              <Line type="monotone" dataKey="changeRate" stroke="#ef4444" strokeWidth={2} dot={false} name="Change Rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Momentum Signals */}
      {momentumData.length > 0 && (
        <div className="bg-card rounded-lg p-4">
          <h3 className="text-sm font-medium mb-2">Trading Momentum</h3>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={momentumData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line type="monotone" dataKey="buyMomentum" stroke="#fbbf24" strokeWidth={2} dot={false} name="Buy Momentum" />
              <Line type="monotone" dataKey="sellMomentum" stroke="#22c55e" strokeWidth={2} dot={false} name="Sell Momentum" />
              <Bar dataKey="diff" fill="#3b82f6" name="Momentum Diff" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
