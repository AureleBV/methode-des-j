import { describe, expect, it } from 'vitest';
import { bmr, computeTargets, dayFeedback, goalDelta, kcalFloor, macrosForGrams, suggestAdjustment, sumMacros, tdee } from './nutrition';

describe('nutrition', () => {
  it('bmr Mifflin-St Jeor', () => {
    expect(bmr('male', 80, 180, 25)).toBe(1805);
    expect(bmr('female', 60, 165, 22)).toBe(1360);
  });

  it('tdee applique le facteur et un bonus sport plafonné', () => {
    expect(tdee(1800, 'sedentary', 0)).toBe(2160);
    expect(tdee(1800, 'sedentary', 3)).toBe(2349);
    expect(tdee(1800, 'sedentary', 10)).toBe(tdee(1800, 'sedentary', 6));
  });

  it('le déficit est borné et jamais extrême', () => {
    expect(goalDelta('lose', 2000)).toBe(-300);
    expect(goalDelta('lose', 4000)).toBe(-550);
    expect(goalDelta('lose', 1200)).toBe(-250);
    expect(goalDelta('lose', 3000, true)).toBe(-200);
    expect(goalDelta('maintain', 2500)).toBe(0);
    expect(goalDelta('gain', 2500)).toBe(200);
  });

  it('le rythme et les protéines/kg sont personnalisables mais bornés', () => {
    expect(goalDelta('lose', 2500, false, 'douce')).toBe(-250);
    expect(goalDelta('lose', 2500, false, 'soutenue')).toBe(-500);
    expect(goalDelta('lose', 2500, true, 'soutenue')).toBe(-200);
    const t = computeTargets({ sex: 'male', age: 22, heightCm: 178, weightKg: 82, activity: 'light', sessionsPerWeek: 3, goal: 'lose', proteinPerKg: 2.2 });
    expect(t.protein).toBe(180);
    expect(computeTargets({ sex: 'male', age: 22, heightCm: 178, weightKg: 82, activity: 'light', sessionsPerWeek: 3, goal: 'lose', proteinPerKg: 5 }).protein).toBe(197);
  });

  it('respecte le plancher calorique', () => {
    const t = computeTargets({ sex: 'female', age: 40, heightCm: 155, weightKg: 48, activity: 'sedentary', sessionsPerWeek: 0, goal: 'lose', kcalAdjustment: -500 });
    expect(t.kcal).toBeGreaterThanOrEqual(kcalFloor('female', t.bmr));
  });

  it('calcule des macros cohérentes', () => {
    const t = computeTargets({ sex: 'male', age: 22, heightCm: 178, weightKg: 82, activity: 'light', sessionsPerWeek: 3, goal: 'lose' });
    expect(t.protein).toBe(148);
    expect(t.protein * 4 + t.carbs * 4 + t.fat * 9).toBeLessThanOrEqual(t.kcal + 4);
    expect(t.delta).toBeLessThan(0);
    expect(t.delta).toBeGreaterThanOrEqual(-550);
  });

  it('macrosForGrams et sumMacros', () => {
    const m = macrosForGrams({ kcal: 120, protein: 22.5, carbs: 0, fat: 2.6 }, 150);
    expect(m).toMatchObject({ kcal: 180, protein: 33.8, carbs: 0, fat: 3.9 });
    expect(sumMacros([m, m]).kcal).toBe(360);
  });

  it('feedback jamais culpabilisant', () => {
    expect(dayFeedback(2250, 2000, 0)).toContain('Objectif presque atteint');
    expect(dayFeedback(2800, 2000, 0)).not.toMatch(/échec/i);
  });

  it('ajustement prudent', () => {
    const base = { goal: 'lose' as const, weightKg: 80, weeksObserved: 3, adherenceOk: true, hungerHigh: false, gentleMode: false };
    expect(suggestAdjustment({ ...base, weeklyChangeKg: 0 }).deltaKcal).toBe(-100);
    expect(suggestAdjustment({ ...base, weeklyChangeKg: -0.5 }).deltaKcal).toBe(0);
    expect(suggestAdjustment({ ...base, weeklyChangeKg: -1.2 }).deltaKcal).toBe(100);
    expect(suggestAdjustment({ ...base, weeklyChangeKg: 0, gentleMode: true }).deltaKcal).toBe(0);
    expect(suggestAdjustment({ ...base, weeklyChangeKg: 0, weeksObserved: 1 }).deltaKcal).toBe(0);
  });
});
