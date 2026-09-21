import { describe, expect, it } from 'vitest';
import { estimateCost, packsNeeded, preferredVariant, summarizeRecords } from './prices';
import type { FoodVariant, PriceRecord } from './types';

const r = (priceEur: number, packGrams: number | undefined, date: string): PriceRecord => ({ id: date, foodId: 'f', priceEur, packGrams, date, source: 'user' });

describe('prices', () => {
  it('moyenne au kilo et dernier relevé', () => {
    const s = summarizeRecords([r(3, 500, '2026-09-01'), r(7, 1000, '2026-09-10'), r(2, undefined, '2026-09-11')], undefined)!;
    expect(s.avgPerKg).toBe(6.5);
    expect(s.count).toBe(2);
    expect(s.last?.date).toBe('2026-09-11');
    expect(summarizeRecords([r(2, undefined, '2026-09-11')])).toBeNull();
    expect(summarizeRecords([r(2, undefined, '2026-09-11')], 400)!.avgPerKg).toBe(5);
  });
  it('coût estimé et packs', () => {
    expect(estimateCost(650, 6.5)).toBe(4.23);
    expect(estimateCost(650, undefined)).toBeNull();
    const v: FoodVariant = { id: 'v', foodId: 'f', name: 'Steak Charal', packGrams: 250, preferred: false, createdAt: 0 };
    expect(packsNeeded(600, v)).toBe(3);
    expect(packsNeeded(100, undefined)).toBeNull();
    expect(preferredVariant('f', [v, { ...v, id: 'w', preferred: true }])?.id).toBe('w');
  });
});
