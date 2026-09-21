import { describe, expect, it } from 'vitest';
import { SEED_FOODS } from '@/db/seed/foods';
import { lighterTip, lightestVariant, usualVariant, variantsOf } from './variants';

const byId = (id: string) => SEED_FOODS.find((f) => f.id === id)!;

describe('variants', () => {
  it('liste les variantes triées de la plus légère à la plus grasse', () => {
    const v = variantsOf(byId('ground_beef_15'), SEED_FOODS);
    expect(v.map((f) => f.id)).toEqual(['ground_beef_5', 'ground_beef_10', 'ground_beef_15', 'ground_beef_20']);
    expect(lightestVariant(byId('milk_whole'), SEED_FOODS).id).toBe('milk_skim');
  });
  it('respecte le choix habituel', () => {
    const u = usualVariant(byId('ground_beef_5'), SEED_FOODS, { usualVariants: { ground_beef: 'ground_beef_10' } });
    expect(u.id).toBe('ground_beef_10');
    expect(usualVariant(byId('apple'), SEED_FOODS, { usualVariants: {} }).id).toBe('apple');
  });
  it('propose une astuce plus légère seulement si ça vaut le coup', () => {
    const tip = lighterTip(byId('ground_beef_15'), SEED_FOODS, 150);
    expect(tip?.food.id).toBe('ground_beef_5');
    expect(tip?.kcalSaved).toBe(128);
    expect(lighterTip(byId('ground_beef_5'), SEED_FOODS, 150)).toBeNull();
    expect(lighterTip(byId('mayo'), SEED_FOODS, 5)).toBeNull();
  });
  it('chaque groupe a exactement un rang 0', () => {
    const groups = new Map<string, number[]>();
    for (const f of SEED_FOODS) if (f.variantGroup) groups.set(f.variantGroup, [...(groups.get(f.variantGroup) ?? []), f.variantRank!]);
    for (const [g, ranks] of groups) expect(ranks.filter((r) => r === 0).length, g).toBe(1);
  });
});
