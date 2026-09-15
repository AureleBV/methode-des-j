import { describe, expect, it } from 'vitest';
import { NutriDB } from '@/db';
import { ensureSeeded } from './index';
import { SEED_FOODS, SEED_FOOD_IDS } from './foods';
import { SEED_INGREDIENTS, SEED_RECIPES } from './recipes';
import { SEED_SNACKS } from './snacks';
import { AIRFRYER_PRESETS } from './airfryer';
import { buildRecipeView } from '@/domain/planner';

describe('seed', () => {
  it('toutes les recettes/collations/presets référencent des aliments existants', () => {
    for (const ing of SEED_INGREDIENTS) expect(SEED_FOOD_IDS.has(ing.foodId), `${ing.recipeId} -> ${ing.foodId}`).toBe(true);
    for (const s of SEED_SNACKS) for (const i of s.items) expect(SEED_FOOD_IDS.has(i.foodId), `${s.id} -> ${i.foodId}`).toBe(true);
    for (const p of AIRFRYER_PRESETS) expect(SEED_FOOD_IDS.has(p.foodId)).toBe(true);
    expect(new Set(SEED_FOODS.map((f) => f.id)).size).toBe(SEED_FOODS.length);
    expect(new Set(SEED_RECIPES.map((r) => r.id)).size).toBe(SEED_RECIPES.length);
  });

  it('les recettes ont des portions réalistes (150-1000 kcal, >= 10 g protéines)', () => {
    const byId = new Map(SEED_FOODS.map((f) => [f.id, f]));
    for (const r of SEED_RECIPES) {
      const v = buildRecipeView(r, SEED_INGREDIENTS, byId);
      expect(v.macros.kcal, r.name).toBeGreaterThanOrEqual(150);
      expect(v.macros.kcal, r.name).toBeLessThanOrEqual(1000);
      expect(v.macros.protein, r.name).toBeGreaterThanOrEqual(10);
      expect(r.instructions.length, r.name).toBeGreaterThan(0);
    }
  });

  it('ensureSeeded est idempotent', async () => {
    const test = new NutriDB('nutriplate-test-' + Math.random());
    await ensureSeeded(test);
    await ensureSeeded(test);
    expect(await test.foods.count()).toBe(SEED_FOODS.length);
    expect(await test.recipes.count()).toBe(SEED_RECIPES.length);
    expect(await test.recipeIngredients.count()).toBe(SEED_INGREDIENTS.length);
    await test.delete();
  });
});
