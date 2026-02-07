import { useEffect, useRef, useMemo, useCallback } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, HistogramData, LineData, Time, LogicalRange } from 'lightweight-charts';
import { Candle, TimeInterval, CDSignal, BuySellPressure, MomentumSignal } from '@/lib/types';
import { calculateMACD, calculateLadder } from '@/lib/indicators';
import { toFutuTime } from '@/lib/stockApi';

interface StockChartProps {
  candles: Candle[];
  interval: TimeInterval;
  cdSignals: CDSignal[];
  buySellPressure: BuySellPressure[];
  momentumSignals?: MomentumSignal[];
  height?: number;
  costPrice?: number;
}

function toChartTime(ts: number, interval: TimeInterval): Time {
  const futuTs = toFutuTime(ts, interval);
  const d = new Date(futuTs);
  const month = d.getUTCMonth();
  const isDST = month >= 2 && month <= 10;
  const etOffsetMs = isDST ? 4 * 3600 * 1000 : 5 * 3600 * 1000;
  const etTimestamp = futuTs - etOffsetMs;
  return (etTimestamp / 1000) as Time;
}

// Helper to save and restore visible range
interface SavedRange {
  barsFromEnd: number;
  barSpan: number;
}

export default function StockChart({ candles, interval, cdSignals, buySellPressure, momentumSignals, height = 400, costPrice }: StockChartProps) {
  const mainChartRef = useRef<HTMLDivElement>(null);
  const macdChartRef = useRef<HTMLDivElement>(null);
  const pressureChartRef = useRef<HTMLDivElement>(null);
  const momentumChartRef = useRef<HTMLDivElement>(null);
  const mainChartApi = useRef<IChartApi | null>(null);
  const macdChartApi = useRef<IChartApi | null>(null);
  const pressureChartApi = useRef<IChartApi | null>(null);
  const momentumChartApi = useRef<IChartApi | null>(null);

  // Track series refs for incremental updates
  const mainSeriesRef = useRef<{
    candle: ISeriesApi<'Candlestick'> | null;
    blueUp: ISeriesApi<'Line'> | null;
    blueDn: ISeriesApi<'Line'> | null;
    yellowUp: ISeriesApi<'Line'> | null;
    yellowDn: ISeriesApi<'Line'> | null;
    volume: ISeriesApi<'Histogram'> | null;
    cost: ISeriesApi<'Line'> | null;
  }>({ candle: null, blueUp: null, blueDn: null, yellowUp: null, yellowDn: null, volume: null, cost: null });

  const macdSeriesRef = useRef<{
    diff: ISeriesApi<'Line'> | null;
    dea: ISeriesApi<'Line'> | null;
    macd: ISeriesApi<'Histogram'> | null;
  }>({ diff: null, dea: null, macd: null });

  const pressureSeriesRef = useRef<{ pressure: ISeriesApi<'Line'> | null }>({ pressure: null });
  const momentumSeriesRef = useRef<{
    buy: ISeriesApi<'Line'> | null;
    sell: ISeriesApi<'Line'> | null;
    diff: ISeriesApi<'Histogram'> | null;
  }>({ buy: null, sell: null, diff: null });

  // Save user's visible range relative to the end of data
  const savedRangeRef = useRef<SavedRange | null>(null);
  const prevCandleCountRef = useRef<number>(0);
  const isInitialRender = useRef(true);
  // Track interval changes to force full rebuild
  const prevIntervalRef = useRef<TimeInterval>(interval);

  const chartOptions = useMemo(() => ({
    layout: {
      background: { color: '#0a0e17' },
      textColor: '#9ca3af',
      fontSize: 11,
    },
    grid: {
      vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
      horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
    },
    crosshair: {
      mode: 0,
      vertLine: { color: 'rgba(6, 182, 212, 0.3)', width: 1 as const, style: 2 as const },
      horzLine: { color: 'rgba(6, 182, 212, 0.3)', width: 1 as const, style: 2 as const },
    },
    timeScale: {
      borderColor: 'rgba(42, 46, 57, 0.5)',
      timeVisible: !['1d', '1w', '1mo'].includes(interval),
      secondsVisible: false,
    },
    rightPriceScale: {
      borderColor: 'rgba(42, 46, 57, 0.5)',
    },
  }), [interval]);

  // Save current visible range before data update
  const saveVisibleRange = useCallback(() => {
    if (!mainChartApi.current) return;
    try {
      const range = mainChartApi.current.timeScale().getVisibleLogicalRange();
      if (range) {
        const totalBars = prevCandleCountRef.current;
        const barsFromEnd = totalBars - 1 - (range.to as number);
        const barSpan = (range.to as number) - (range.from as number);
        savedRangeRef.current = { barsFromEnd, barSpan };
      }
    } catch {
      // ignore
    }
  }, []);

  // Restore visible range after data update, keeping same zoom level and relative position
  const restoreVisibleRange = useCallback((newTotal: number) => {
    if (!mainChartApi.current || !savedRangeRef.current) return;
    const { barsFromEnd, barSpan } = savedRangeRef.current;
    // Adjust: the new last bar index is newTotal - 1
    // Keep the same number of bars from the end, but shift by 1 to show the new bar
    const adjustedBarsFromEnd = Math.max(0, barsFromEnd - 1); // Shift to include new bar
    const newTo = newTotal - 1 - adjustedBarsFromEnd;
    const newFrom = newTo - barSpan;
    try {
      mainChartApi.current.timeScale().setVisibleLogicalRange({
        from: newFrom,
        to: newTo,
      } as LogicalRange);
    } catch {
      // fallback
    }
  }, []);

  // ===== MAIN CHART =====
  useEffect(() => {
    if (!mainChartRef.current || candles.length === 0) return;

    const intervalChanged = prevIntervalRef.current !== interval;
    prevIntervalRef.current = interval;

    // Determine if this is an incremental update (same interval, just more candles)
    const isIncremental = !intervalChanged && !isInitialRender.current && mainChartApi.current && mainSeriesRef.current.candle && prevCandleCountRef.current > 0;

    if (isIncremental) {
      // Save current zoom/position before updating
      saveVisibleRange();

      // Update data on existing series
      const candleData: CandlestickData[] = candles.map(c => ({
        time: toChartTime(c.time, interval),
        open: c.open, high: c.high, low: c.low, close: c.close,
      }));
      mainSeriesRef.current.candle!.setData(candleData);

      // Update CD signal markers
      if (cdSignals.length > 0) {
        const markers = cdSignals.map(s => ({
          time: toChartTime(s.time, interval),
          position: s.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
          color: s.type === 'buy' ? '#ef4444' : '#22c55e',
          shape: s.type === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
          text: s.label,
        }));
        mainSeriesRef.current.candle!.setMarkers(markers);
      } else {
        mainSeriesRef.current.candle!.setMarkers([]);
      }

      // Update ladder
      const ladder = calculateLadder(candles);
      if (ladder.length > 0 && mainSeriesRef.current.blueUp) {
        mainSeriesRef.current.blueUp.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.blueUp })));
        mainSeriesRef.current.blueDn!.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.blueDn })));
        mainSeriesRef.current.yellowUp!.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.yellowUp })));
        mainSeriesRef.current.yellowDn!.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.yellowDn })));
      }

      // Update volume
      if (mainSeriesRef.current.volume) {
        mainSeriesRef.current.volume.setData(candles.map(c => ({
          time: toChartTime(c.time, interval),
          value: c.volume,
          color: c.close >= c.open ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
        })));
      }

      // Update cost line
      if (mainSeriesRef.current.cost) {
        if (costPrice && costPrice > 0) {
          mainSeriesRef.current.cost.setData(candles.map(c => ({
            time: toChartTime(c.time, interval), value: costPrice,
          })));
        } else {
          mainSeriesRef.current.cost.setData([]);
        }
      } else if (costPrice && costPrice > 0 && mainChartApi.current) {
        const costSeries = mainChartApi.current.addLineSeries({
          color: '#f59e0b', lineWidth: 2, lineStyle: 2,
          title: `成本 $${costPrice.toFixed(2)}`,
          crosshairMarkerVisible: false, priceLineVisible: true, lastValueVisible: true,
        });
        costSeries.setData(candles.map(c => ({ time: toChartTime(c.time, interval), value: costPrice })));
        mainSeriesRef.current.cost = costSeries;
      }

      // Restore zoom/position
      restoreVisibleRange(candles.length);
      prevCandleCountRef.current = candles.length;
      return; // Don't recreate chart
    }

    // ===== FULL REBUILD =====
    if (mainChartApi.current) {
      mainChartApi.current.remove();
      mainChartApi.current = null;
    }
    mainSeriesRef.current = { candle: null, blueUp: null, blueDn: null, yellowUp: null, yellowDn: null, volume: null, cost: null };

    const chart = createChart(mainChartRef.current, {
      ...chartOptions,
      width: mainChartRef.current.clientWidth,
      height,
    });
    mainChartApi.current = chart;

    // Candlestick
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#ef4444', downColor: '#22c55e',
      borderUpColor: '#ef4444', borderDownColor: '#22c55e',
      wickUpColor: '#ef4444', wickDownColor: '#22c55e',
    });
    candleSeries.setData(candles.map(c => ({
      time: toChartTime(c.time, interval),
      open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    mainSeriesRef.current.candle = candleSeries;

    // Ladder
    const ladder = calculateLadder(candles);
    if (ladder.length > 0) {
      const blueUp = chart.addLineSeries({ color: 'rgba(59, 130, 246, 0.8)', lineWidth: 1, title: '蓝梯A', crosshairMarkerVisible: false });
      const blueDn = chart.addLineSeries({ color: 'rgba(59, 130, 246, 0.8)', lineWidth: 1, title: '蓝梯B', crosshairMarkerVisible: false });
      const yellowUp = chart.addLineSeries({ color: 'rgba(234, 179, 8, 0.8)', lineWidth: 1, title: '黄梯A1', crosshairMarkerVisible: false });
      const yellowDn = chart.addLineSeries({ color: 'rgba(234, 179, 8, 0.8)', lineWidth: 1, title: '黄梯B1', crosshairMarkerVisible: false });
      blueUp.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.blueUp })));
      blueDn.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.blueDn })));
      yellowUp.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.yellowUp })));
      yellowDn.setData(ladder.map(l => ({ time: toChartTime(l.time, interval), value: l.yellowDn })));
      mainSeriesRef.current.blueUp = blueUp;
      mainSeriesRef.current.blueDn = blueDn;
      mainSeriesRef.current.yellowUp = yellowUp;
      mainSeriesRef.current.yellowDn = yellowDn;
    }

    // CD Signal markers
    if (cdSignals.length > 0) {
      candleSeries.setMarkers(cdSignals.map(s => ({
        time: toChartTime(s.time, interval),
        position: s.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
        color: s.type === 'buy' ? '#ef4444' : '#22c55e',
        shape: s.type === 'buy' ? 'arrowUp' as const : 'arrowDown' as const,
        text: s.label,
      })));
    }

    // Cost price line
    if (costPrice && costPrice > 0) {
      const costSeries = chart.addLineSeries({
        color: '#f59e0b', lineWidth: 2, lineStyle: 2,
        title: `成本 $${costPrice.toFixed(2)}`,
        crosshairMarkerVisible: false, priceLineVisible: true, lastValueVisible: true,
      });
      costSeries.setData(candles.map(c => ({ time: toChartTime(c.time, interval), value: costPrice })));
      mainSeriesRef.current.cost = costSeries;
    }

    // Volume
    const volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: 'volume' });
    chart.priceScale('volume').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    volumeSeries.setData(candles.map(c => ({
      time: toChartTime(c.time, interval),
      value: c.volume,
      color: c.close >= c.open ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)',
    })));
    mainSeriesRef.current.volume = volumeSeries;

    // Initial view: show last 80 bars
    const barsToShow = Math.min(80, candles.length);
    chart.timeScale().setVisibleLogicalRange({
      from: Math.max(0, candles.length - barsToShow),
      to: candles.length - 1,
    } as LogicalRange);

    prevCandleCountRef.current = candles.length;
    isInitialRender.current = false;

    const handleResize = () => {
      if (mainChartRef.current) chart.applyOptions({ width: mainChartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      mainChartApi.current = null;
      mainSeriesRef.current = { candle: null, blueUp: null, blueDn: null, yellowUp: null, yellowDn: null, volume: null, cost: null };
    };
  }, [candles, interval, cdSignals, height, chartOptions, costPrice, saveVisibleRange, restoreVisibleRange]);

  // ===== MACD SUB-CHART =====
  useEffect(() => {
    if (!macdChartRef.current || candles.length === 0) return;

    const intervalChanged = prevIntervalRef.current !== interval;

    // Incremental update for MACD
    if (!intervalChanged && macdChartApi.current && macdSeriesRef.current.diff) {
      const { diff, dea, macd } = calculateMACD(candles);
      macdSeriesRef.current.diff.setData(candles.map((c, i) => ({ time: toChartTime(c.time, interval), value: diff[i] })));
      macdSeriesRef.current.dea!.setData(candles.map((c, i) => ({ time: toChartTime(c.time, interval), value: dea[i] })));
      macdSeriesRef.current.macd!.setData(candles.map((c, i) => ({
        time: toChartTime(c.time, interval),
        value: macd[i],
        color: macd[i] >= 0
          ? (macd[i] >= (i > 0 ? macd[i-1] : 0) ? '#ef4444' : '#b91c1c')
          : (macd[i] <= (i > 0 ? macd[i-1] : 0) ? '#22c55e' : '#15803d'),
      })));

      if (cdSignals.length > 0) {
        macdSeriesRef.current.diff.setMarkers(cdSignals.map(s => ({
          time: toChartTime(s.time, interval),
          position: s.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
          color: s.type === 'buy' ? '#ef4444' : '#22c55e',
          shape: 'circle' as const,
          text: s.label,
        })));
      }
      return;
    }

    // Full rebuild
    if (macdChartApi.current) {
      macdChartApi.current.remove();
      macdChartApi.current = null;
    }
    macdSeriesRef.current = { diff: null, dea: null, macd: null };

    const chart = createChart(macdChartRef.current, {
      ...chartOptions,
      width: macdChartRef.current.clientWidth,
      height: 180,
    });
    macdChartApi.current = chart;

    const { diff, dea, macd } = calculateMACD(candles);
    const diffSeries = chart.addLineSeries({ color: '#06b6d4', lineWidth: 1, title: 'DIFF' });
    const deaSeries = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1, title: 'DEA' });
    const macdSeries = chart.addHistogramSeries({ title: 'MACD' });

    diffSeries.setData(candles.map((c, i) => ({ time: toChartTime(c.time, interval), value: diff[i] })));
    deaSeries.setData(candles.map((c, i) => ({ time: toChartTime(c.time, interval), value: dea[i] })));
    macdSeries.setData(candles.map((c, i) => ({
      time: toChartTime(c.time, interval),
      value: macd[i],
      color: macd[i] >= 0
        ? (macd[i] >= (i > 0 ? macd[i-1] : 0) ? '#ef4444' : '#b91c1c')
        : (macd[i] <= (i > 0 ? macd[i-1] : 0) ? '#22c55e' : '#15803d'),
    })));

    macdSeriesRef.current = { diff: diffSeries, dea: deaSeries, macd: macdSeries };

    if (cdSignals.length > 0) {
      diffSeries.setMarkers(cdSignals.map(s => ({
        time: toChartTime(s.time, interval),
        position: s.type === 'buy' ? 'belowBar' as const : 'aboveBar' as const,
        color: s.type === 'buy' ? '#ef4444' : '#22c55e',
        shape: 'circle' as const,
        text: s.label,
      })));
    }

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (macdChartRef.current) chart.applyOptions({ width: macdChartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      macdChartApi.current = null;
      macdSeriesRef.current = { diff: null, dea: null, macd: null };
    };
  }, [candles, interval, cdSignals, chartOptions]);

  // ===== BUY/SELL PRESSURE SUB-CHART =====
  useEffect(() => {
    if (!pressureChartRef.current || buySellPressure.length === 0) return;

    // Incremental update
    if (pressureChartApi.current && pressureSeriesRef.current.pressure) {
      pressureSeriesRef.current.pressure.setData(buySellPressure.map(p => ({
        time: toChartTime(p.time, interval),
        value: p.pressure,
      })));
      const markers = buySellPressure
        .filter(p => p.signal !== undefined)
        .map(p => ({
          time: toChartTime(p.time, interval),
          position: p.signal === 'strong_up' ? 'aboveBar' as const : 'belowBar' as const,
          color: p.signal === 'strong_up' ? '#a78bfa' : '#22c55e',
          shape: 'circle' as const,
          text: p.signal === 'strong_up' ? '⚡' : '💀',
        }));
      if (markers.length > 0) pressureSeriesRef.current.pressure.setMarkers(markers);
      return;
    }

    // Full rebuild
    if (pressureChartApi.current) {
      pressureChartApi.current.remove();
      pressureChartApi.current = null;
    }

    const chart = createChart(pressureChartRef.current, {
      ...chartOptions,
      width: pressureChartRef.current.clientWidth,
      height: 150,
    });
    pressureChartApi.current = chart;

    const pressureSeries = chart.addLineSeries({ color: '#a78bfa', lineWidth: 2, title: '买卖力道' });
    pressureSeries.setData(buySellPressure.map(p => ({
      time: toChartTime(p.time, interval),
      value: p.pressure,
    })));
    pressureSeriesRef.current.pressure = pressureSeries;

    const markers = buySellPressure
      .filter(p => p.signal !== undefined)
      .map(p => ({
        time: toChartTime(p.time, interval),
        position: p.signal === 'strong_up' ? 'aboveBar' as const : 'belowBar' as const,
        color: p.signal === 'strong_up' ? '#a78bfa' : '#22c55e',
        shape: 'circle' as const,
        text: p.signal === 'strong_up' ? '⚡' : '💀',
      }));
    if (markers.length > 0) pressureSeries.setMarkers(markers);

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (pressureChartRef.current) chart.applyOptions({ width: pressureChartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      pressureChartApi.current = null;
      pressureSeriesRef.current = { pressure: null };
    };
  }, [buySellPressure, interval, chartOptions]);

  // ===== MOMENTUM SUB-CHART =====
  useEffect(() => {
    if (!momentumChartRef.current || !momentumSignals || momentumSignals.length === 0) return;

    // Incremental update
    if (momentumChartApi.current && momentumSeriesRef.current.buy) {
      momentumSeriesRef.current.buy.setData(momentumSignals.map(m => ({
        time: toChartTime(m.time, interval), value: m.buyMomentum,
      })));
      momentumSeriesRef.current.sell!.setData(momentumSignals.map(m => ({
        time: toChartTime(m.time, interval), value: m.sellMomentum,
      })));
      momentumSeriesRef.current.diff!.setData(momentumSignals.map(m => ({
        time: toChartTime(m.time, interval),
        value: m.diff,
        color: m.diff >= 0 ? '#ef4444' : '#22c55e',
      })));

      const markers = momentumSignals
        .map(m => {
          if (m.signal === 'double_digit_up') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#fbbf24', shape: 'arrowUp' as const, text: '⚡' };
          if (m.signal === 'yellow_cross_green') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#eab308', shape: 'circle' as const, text: '↑' };
          if (m.signal === 'green_to_red') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#ef4444', shape: 'circle' as const, text: '▲' };
          if (m.signal === 'strong_buy') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#dc2626', shape: 'arrowUp' as const, text: '🔥' };
          if (m.signal === 'double_digit_down') return { time: toChartTime(m.time, interval), position: 'belowBar' as const, color: '#9333ea', shape: 'arrowDown' as const, text: '💀' };
          return null;
        })
        .filter((m): m is NonNullable<typeof m> => m !== null);
      if (markers.length > 0) momentumSeriesRef.current.diff!.setMarkers(markers);
      return;
    }

    // Full rebuild
    if (momentumChartApi.current) {
      momentumChartApi.current.remove();
      momentumChartApi.current = null;
    }

    const chart = createChart(momentumChartRef.current, {
      ...chartOptions,
      width: momentumChartRef.current.clientWidth,
      height: 150,
    });
    momentumChartApi.current = chart;

    const buySeries = chart.addLineSeries({ color: '#fbbf24', lineWidth: 2, title: '买入动能' });
    buySeries.setData(momentumSignals.map(m => ({ time: toChartTime(m.time, interval), value: m.buyMomentum })));

    const sellSeries = chart.addLineSeries({ color: '#22c55e', lineWidth: 2, title: '卖出动能' });
    sellSeries.setData(momentumSignals.map(m => ({ time: toChartTime(m.time, interval), value: m.sellMomentum })));

    const diffSeries = chart.addHistogramSeries({ title: '动能差' });
    diffSeries.setData(momentumSignals.map(m => ({
      time: toChartTime(m.time, interval),
      value: m.diff,
      color: m.diff >= 0 ? '#ef4444' : '#22c55e',
    })));

    momentumSeriesRef.current = { buy: buySeries, sell: sellSeries, diff: diffSeries };

    const markers = momentumSignals
      .map(m => {
        if (m.signal === 'double_digit_up') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#fbbf24', shape: 'arrowUp' as const, text: '⚡' };
        if (m.signal === 'yellow_cross_green') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#eab308', shape: 'circle' as const, text: '↑' };
        if (m.signal === 'green_to_red') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#ef4444', shape: 'circle' as const, text: '▲' };
        if (m.signal === 'strong_buy') return { time: toChartTime(m.time, interval), position: 'aboveBar' as const, color: '#dc2626', shape: 'arrowUp' as const, text: '🔥' };
        if (m.signal === 'double_digit_down') return { time: toChartTime(m.time, interval), position: 'belowBar' as const, color: '#9333ea', shape: 'arrowDown' as const, text: '💀' };
        return null;
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);
    if (markers.length > 0) diffSeries.setMarkers(markers);

    chart.timeScale().fitContent();

    const handleResize = () => {
      if (momentumChartRef.current) chart.applyOptions({ width: momentumChartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      momentumChartApi.current = null;
      momentumSeriesRef.current = { buy: null, sell: null, diff: null };
    };
  }, [momentumSignals, interval, chartOptions]);

  // Sync time scales across all charts
  useEffect(() => {
    const allCharts = [mainChartApi.current, macdChartApi.current, pressureChartApi.current, momentumChartApi.current].filter(Boolean) as IChartApi[];
    if (allCharts.length < 2) return;

    const syncFns: Array<{ chart: IChartApi; fn: (range: any) => void }> = [];
    for (let i = 0; i < allCharts.length; i++) {
      for (let j = 0; j < allCharts.length; j++) {
        if (i === j) continue;
        const fn = (range: any) => {
          if (range) allCharts[j].timeScale().setVisibleLogicalRange(range);
        };
        allCharts[i].timeScale().subscribeVisibleLogicalRangeChange(fn);
        syncFns.push({ chart: allCharts[i], fn });
      }
    }

    return () => {
      syncFns.forEach(({ chart, fn }) => {
        try { chart.timeScale().unsubscribeVisibleLogicalRangeChange(fn); } catch {}
      });
    };
  }, [candles, buySellPressure, momentumSignals]);

  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-2">
        <span className="font-medium text-foreground">主图</span>
        <span>K线 + 黄蓝梯子</span>
      </div>
      <div ref={mainChartRef} className="w-full rounded-md overflow-hidden border border-border" />
      
      <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-2">
        <span className="font-medium text-foreground">副图</span>
        <span>CD抄底指标 (MACD)</span>
        <span className="text-xs text-red-400 ml-1">抄底</span>
        <span className="text-xs text-green-400">/</span>
        <span className="text-xs text-green-400">卖出</span>
      </div>
      <div ref={macdChartRef} className="w-full rounded-md overflow-hidden border border-border" />
      
      <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-2">
        <span className="font-medium text-purple">副图</span>
        <span className="text-purple">买卖力道</span>
        <span className="text-xs">双位数上涨 = 动能强劲 ⚡ | 双位数下跌 = 动能衰竭 💀</span>
      </div>
      <div ref={pressureChartRef} className="w-full rounded-md overflow-hidden border border-border" />
      
      {momentumSignals && momentumSignals.length > 0 && (
        <>
          <div className="text-xs text-muted-foreground px-2 py-1 flex items-center gap-2">
            <span className="font-medium text-cyan-400">副图</span>
            <span className="text-cyan-400">买卖动能</span>
            <span className="text-xs">黄线=买入动能 | 绿线=卖出动能 | 红柱=买压 | 绿柱=卖压</span>
          </div>
          <div ref={momentumChartRef} className="w-full rounded-md overflow-hidden border border-border" />
        </>
      )}
    </div>
  );
}
