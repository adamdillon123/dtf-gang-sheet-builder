import { describe, expect, it } from 'vitest';
import {
  computeBillableDimensions,
  roundToIncrement,
  selectTier,
  subtotalCentsFromAreaUnits
} from '@/lib/pricing';

describe('pricing math', () => {
  it('rounds up to increment', () => {
    expect(roundToIncrement(2.01, 0.25)).toBe(2.25);
    expect(roundToIncrement(4, 0.25)).toBe(4);
  });

  it('enforces minimums and calculates billable sq in', () => {
    const result = computeBillableDimensions(1, 1.5, {
      roundingIncrementIn: 0.25,
      minWidthIn: 2,
      minHeightIn: 2,
      minBillableSqIn: 4
    });
    expect(result.billableWidthIn).toBe(2);
    expect(result.billableHeightIn).toBe(2);
    expect(result.billableSqIn).toBe(4);
  });

  it('selects tier based on total square inches at boundaries', () => {
    const tiers = [
      { minSqIn: 0, maxSqIn: 100, ratePerSqIn: 0.12 },
      { minSqIn: 101, maxSqIn: 300, ratePerSqIn: 0.1 },
      { minSqIn: 301, maxSqIn: null, ratePerSqIn: 0.09 }
    ];
    expect(selectTier(100, tiers)?.ratePerSqIn).toBe(0.12);
    expect(selectTier(101, tiers)?.ratePerSqIn).toBe(0.1);
    expect(selectTier(350, tiers)?.ratePerSqIn).toBe(0.09);
  });

  it('calculates subtotal cents using area units', () => {
    const increment = 0.25;
    const billable = computeBillableDimensions(3, 2, {
      roundingIncrementIn: increment,
      minWidthIn: 2,
      minHeightIn: 2,
      minBillableSqIn: 4
    });
    const subtotalCents = subtotalCentsFromAreaUnits(billable.areaUnits, increment, 0.12);
    expect(subtotalCents).toBe(72);
  });
});
