import { describe, expect, it } from 'vitest';
import { addDays, averageOver, detectPlateau, weightSummary } from './weight';
import type { WeightLog } from './types';

function series(start: string, values: number[]): WeightLog[] {
  return values.map((kg, i) => ({ id: String(i), date: addDays(start, i), kg }));
}

describe('weight', () => {
  it('moyenne 7 jours', () => {
    const logs = series('2026-01-01', [80, 81, 80, 79, 80, 81, 80, 79]);
    expect(averageOver(logs, '2026-01-08', 7)).toBe(80);
  });
  it('résumé et tendance', () => {
    const logs = series('2026-01-01', Array.from({ length: 30 }, (_, i) => 85 - i * 0.07));
    const s = weightSummary(logs);
    expect(s.latest?.kg).toBeCloseTo(82.97, 1);
    expect(s.weeklyTrend).toBeLessThan(0);
    expect(s.changeSinceStart).toBeCloseTo(-2, 0);
  });
  it('détecte un plateau de 3 semaines', () => {
    const flat = series('2026-01-01', Array.from({ length: 35 }, (_, i) => 80 + (i % 2 ? 0.2 : -0.2)));
    expect(detectPlateau(flat).plateau).toBe(true);
    const falling = series('2026-01-01', Array.from({ length: 35 }, (_, i) => 80 - i * 0.08));
    expect(detectPlateau(falling).plateau).toBe(false);
  });
});
