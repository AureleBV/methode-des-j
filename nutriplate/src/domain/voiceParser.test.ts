import { describe, expect, it } from 'vitest';
import { SEED_FOODS } from '@/db/seed/foods';
import { bestFoodMatch, gramsFor, parseSpokenMeal } from './voiceParser';

describe('voiceParser', () => {
  it('découpe et comprend les quantités', () => {
    const items = parseSpokenMeal("J'ai mangé 150 grammes de poulet, 200 g de riz et une banane");
    expect(items).toEqual([
      { query: 'poulet', grams: 150 },
      { query: 'riz', grams: 200 },
      { query: 'banane', count: 1, unit: undefined },
    ]);
  });
  it('gère les pièces, unités et kilos', () => {
    expect(parseSpokenMeal('deux œufs et deux tranches de jambon')).toEqual([
      { query: 'oeufs', count: 2, unit: undefined },
      { query: 'jambon', count: 2, unit: 'tranche' },
    ]);
    expect(parseSpokenMeal('0,5 kg de pommes de terre')[0]).toEqual({ query: 'pommes terre', grams: 500 });
    expect(parseSpokenMeal('20 cl de lait')[0]).toEqual({ query: 'lait', grams: 200 });
  });
  it('associe aux aliments locaux et calcule les grammes', () => {
    const items = parseSpokenMeal('150 g de poulet, deux œufs, un yaourt');
    const chicken = bestFoodMatch(items[0]!, SEED_FOODS)!;
    expect(chicken.id).toBe('chicken_breast');
    expect(gramsFor(items[0]!, chicken)).toBe(150);
    const egg = bestFoodMatch(items[1]!, SEED_FOODS)!;
    expect(egg.id).toBe('egg');
    expect(gramsFor(items[1]!, egg)).toBe(110);
    const yog = bestFoodMatch(items[2]!, SEED_FOODS)!;
    expect(yog.category).toBe('dairy');
    expect(bestFoodMatch({ query: 'riz', grams: 200 }, SEED_FOODS)!.id).toBe('rice_cooked');
  });
});
