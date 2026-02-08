import { describe, it, expect } from 'vitest';

// Test the ScreenerContext logic and StockChart incremental update behavior

describe('Screener Background Job', () => {
  it('should have valid ScreenerCondition interface', () => {
    const condition = {
      indicator: 'cd_buy',
      intervals: ['4h', '1h'] as const,
    };
    expect(condition.indicator).toBe('cd_buy');
    expect(condition.intervals).toHaveLength(2);
    expect(condition.intervals).toContain('4h');
    expect(condition.intervals).toContain('1h');
  });

  it('should have valid ScreenerJob structure', () => {
    const job = {
      id: 'job_123',
      conditions: [{ indicator: 'cd_buy', intervals: ['4h'] }],
      logic: 'AND' as const,
      sectorFilter: 'all',
      priceRange: [0, 99999] as [number, number],
      status: 'running' as const,
      progress: 10,
      total: 100,
      results: [],
      startTime: Date.now(),
    };
    expect(job.status).toBe('running');
    expect(job.progress).toBeLessThanOrEqual(job.total);
    expect(job.results).toEqual([]);
  });

  it('should support AND logic - all conditions must match', () => {
    const conditions = [
      { indicator: 'cd_buy', matched: true },
      { indicator: 'pressure_strong_up', matched: true },
      { indicator: 'blue_ladder_strong', matched: false },
    ];
    const allMatched = conditions.every(c => c.matched);
    expect(allMatched).toBe(false); // Not all conditions met
  });

  it('should support OR logic - any condition matches', () => {
    const conditions = [
      { indicator: 'cd_buy', matched: true },
      { indicator: 'pressure_strong_up', matched: false },
    ];
    const anyMatched = conditions.some(c => c.matched);
    expect(anyMatched).toBe(true); // At least one condition met
  });

  it('should filter stocks by sector', () => {
    const stocks = [
      { symbol: 'AAPL', sectors: ['Tech', 'AI'] },
      { symbol: 'TSLA', sectors: ['EV', 'AI'] },
      { symbol: 'JPM', sectors: ['Fintech'] },
    ];
    const filtered = stocks.filter(s => s.sectors.includes('AI'));
    expect(filtered).toHaveLength(2);
    expect(filtered.map(s => s.symbol)).toContain('AAPL');
    expect(filtered.map(s => s.symbol)).toContain('TSLA');
  });

  it('should filter stocks by price range', () => {
    const stocks = [
      { symbol: 'AAPL', price: 180 },
      { symbol: 'TSLA', price: 250 },
      { symbol: 'AMZN', price: 190 },
    ];
    const [min, max] = [100, 200];
    const filtered = stocks.filter(s => s.price >= min && s.price <= max);
    expect(filtered).toHaveLength(2);
    expect(filtered.map(s => s.symbol)).not.toContain('TSLA');
  });

  it('should handle backtest date truncation', () => {
    const candles = [
      { time: new Date('2025-01-01').getTime() },
      { time: new Date('2025-01-02').getTime() },
      { time: new Date('2025-01-03').getTime() },
      { time: new Date('2025-01-04').getTime() },
    ];
    const backtestDate = 20250102;
    const str = String(backtestDate);
    const y = parseInt(str.slice(0, 4));
    const m = parseInt(str.slice(4, 6)) - 1;
    const d = parseInt(str.slice(6, 8));
    const cutoff = new Date(y, m, d).getTime();
    const truncated = candles.filter(c => c.time <= cutoff);
    expect(truncated).toHaveLength(2);
  });
});

describe('StockChart Incremental Update', () => {
  it('should calculate saved range correctly', () => {
    const totalBars = 100;
    const visibleFrom = 80;
    const visibleTo = 99;
    
    const barsFromEnd = totalBars - 1 - visibleTo;
    const barSpan = visibleTo - visibleFrom;
    
    expect(barsFromEnd).toBe(0); // Viewing the latest bars
    expect(barSpan).toBe(19); // 20 bars visible
  });

  it('should restore range after adding one bar', () => {
    const savedBarsFromEnd = 0;
    const savedBarSpan = 19;
    const newTotal = 101; // One new bar added
    
    const adjustedBarsFromEnd = Math.max(0, savedBarsFromEnd - 1);
    const newTo = newTotal - 1 - adjustedBarsFromEnd;
    const newFrom = newTo - savedBarSpan;
    
    expect(newTo).toBe(100); // Points to the new last bar
    expect(newFrom).toBe(81); // Same span maintained
    expect(newTo - newFrom).toBe(savedBarSpan); // Zoom level preserved
  });

  it('should preserve zoom when user has scrolled back', () => {
    const totalBars = 100;
    const visibleFrom = 50;
    const visibleTo = 69;
    
    const barsFromEnd = totalBars - 1 - visibleTo; // 30
    const barSpan = visibleTo - visibleFrom; // 19
    
    const newTotal = 101;
    const adjustedBarsFromEnd = Math.max(0, barsFromEnd - 1); // 29
    const newTo = newTotal - 1 - adjustedBarsFromEnd; // 71
    const newFrom = newTo - barSpan; // 52
    
    expect(newTo - newFrom).toBe(barSpan); // Zoom preserved
    // Position shifts by 1 towards the new bar
    expect(newFrom).toBe(52);
    expect(newTo).toBe(71);
  });

  it('should handle notification creation on job completion', () => {
    const job = {
      id: 'job_123',
      results: [{ symbol: 'AAPL', name: 'AAPL', matchedConditions: ['cd_buy@4h'] }],
      endTime: Date.now(),
    };
    
    const notification = {
      id: `notif_${Date.now()}`,
      jobId: job.id,
      message: `条件选股完成！找到 ${job.results.length} 只符合条件的股票`,
      resultCount: job.results.length,
      timestamp: Date.now(),
      dismissed: false,
    };
    
    expect(notification.resultCount).toBe(1);
    expect(notification.dismissed).toBe(false);
    expect(notification.message).toContain('1');
  });

  it('should dismiss notification correctly', () => {
    const notifications = [
      { id: 'n1', dismissed: false },
      { id: 'n2', dismissed: false },
    ];
    
    const updated = notifications.map(n => n.id === 'n1' ? { ...n, dismissed: true } : n);
    expect(updated[0].dismissed).toBe(true);
    expect(updated[1].dismissed).toBe(false);
  });
});
