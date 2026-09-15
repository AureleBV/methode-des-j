import { describe, expect, it } from 'vitest';
import { satietyLabel, satietyScore } from './satiety';

describe('satiety', () => {
  it('gros volume protéiné = très rassasiant', () => {
    const s = satietyScore({ kcal: 600, protein: 55, carbs: 70, fat: 12, fiber: 10 }, 650);
    expect(s).toBe(5);
    expect(satietyLabel(s)).toBe('Très rassasiant');
  });
  it('petit snack dense = léger', () => {
    const s = satietyScore({ kcal: 250, protein: 3, carbs: 30, fat: 13, fiber: 1 }, 45);
    expect(s).toBeLessThanOrEqual(2);
  });
  it('gère les zéros', () => {
    expect(satietyScore({ kcal: 0, protein: 0, carbs: 0, fat: 0 }, 0)).toBe(3);
  });
});
