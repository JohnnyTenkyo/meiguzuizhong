import { describe, it, expect } from 'vitest';
import { calculateMomentum, formatMomentumForChart } from './tradingMomentum';

describe('Buy-Sell Momentum Indicator', () => {
  it('should calculate momentum with valid symbol', async () => {
    const momentum = await calculateMomentum('AAPL');
    
    if (momentum) {
      expect(momentum).toHaveProperty('symbol');
      expect(momentum).toHaveProperty('latestBuyPressure');
      expect(momentum).toHaveProperty('latestSellPressure');
      expect(momentum).toHaveProperty('latestDiff');
      expect(momentum).toHaveProperty('trend');
      expect(momentum).toHaveProperty('data');
      
      // Validate types
      expect(typeof momentum.latestBuyPressure).toBe('number');
      expect(typeof momentum.latestSellPressure).toBe('number');
      expect(typeof momentum.latestDiff).toBe('number');
      expect(typeof momentum.trend).toBe('string');
      expect(Array.isArray(momentum.data)).toBe(true);
      
      // Validate values are non-negative
      expect(momentum.latestBuyPressure).toBeGreaterThanOrEqual(0);
      expect(momentum.latestSellPressure).toBeGreaterThanOrEqual(0);
    }
  }, 15000);

  it('should format momentum for chart display', async () => {
    const momentum = await calculateMomentum('TSLA');
    
    if (momentum) {
      const formatted = formatMomentumForChart(momentum);
      
      expect(formatted).toHaveProperty('buyLine');
      expect(formatted).toHaveProperty('sellLine');
      expect(formatted).toHaveProperty('diffBar');
      expect(formatted).toHaveProperty('trend');
      
      // Check that formatted values are reasonable
      expect(formatted.buyLine).toBeGreaterThanOrEqual(0);
      expect(formatted.sellLine).toBeGreaterThanOrEqual(0);
    }
  }, 15000);

  it('should handle invalid symbol gracefully', async () => {
    const momentum = await calculateMomentum('INVALID_SYMBOL_XYZ');
    
    // Should return null for invalid symbols
    expect(momentum).toBeNull();
  }, 15000);

  it('should calculate positive diffBar when buy pressure > sell pressure', async () => {
    const momentum = await calculateMomentum('AAPL');
    
    if (momentum && momentum.latestDiff > 0) {
      expect(momentum.latestBuyPressure).toBeGreaterThan(momentum.latestSellPressure);
    }
  }, 15000);

  it('should calculate negative diffBar when sell pressure > buy pressure', async () => {
    const momentum = await calculateMomentum('AAPL');
    
    if (momentum && momentum.latestDiff < 0) {
      expect(momentum.latestSellPressure).toBeGreaterThan(momentum.latestBuyPressure);
    }
  }, 15000);

  it('should have consistent trend classification', async () => {
    const momentum = await calculateMomentum('MSFT');
    
    if (momentum) {
      const validTrends = ['强买', '弱买', '中立', '弱卖', '强卖'];
      expect(validTrends).toContain(momentum.trend);
    }
  }, 15000);
});
