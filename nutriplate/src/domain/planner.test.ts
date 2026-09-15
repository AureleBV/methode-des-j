import { describe, expect, it } from 'vitest';
import { aggregateShopping, buildRecipeView, formatShoppingQty, generatePlan, matchesFilter, parseQuery, similarRecipes } from './planner';
import { buildPrefIndex } from './preferences';
import type { Food, Recipe, RecipeIngredient } from './types';

const foods: Food[] = [
  { id: 'poul', name: 'Blanc de poulet', category: 'meat', tags: ['animal'], per100: { kcal: 120, protein: 22.5, carbs: 0, fat: 2.6 }, source: 'local' },
  { id: 'riz', name: 'Riz cuit', category: 'starch', tags: [], per100: { kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4 }, source: 'local' },
  { id: 'broc', name: 'Brocoli', category: 'vegetable', tags: ['cooked'], per100: { kcal: 35, protein: 2.4, carbs: 4, fat: 0.4, fiber: 3 }, source: 'local' },
  { id: 'skyr', name: 'Skyr', category: 'dairy', tags: ['lactose'], per100: { kcal: 60, protein: 11, carbs: 4, fat: 0.2 }, source: 'local' },
];
const byId = new Map(foods.map((f) => [f.id, f]));
const r = (id: string, name: string, tags: string[], ings: [string, number][], servings = 1): { recipe: Recipe; ings: RecipeIngredient[] } => ({
  recipe: { id, name, emoji: '🍽️', tags, prepMinutes: 10, difficulty: 'easy', equipment: ['pan'], servings, instructions: [] },
  ings: ings.map(([foodId, grams], i) => ({ id: `${id}-${i}`, recipeId: id, foodId, grams })),
});
const defs = [
  r('a', 'Poulet riz', ['plat', 'riz', 'poulet'], [['poul', 150], ['riz', 250], ['broc', 150]]),
  r('b', 'Poulet brocoli', ['plat', 'proteine'], [['poul', 200], ['broc', 300]]),
  r('c', 'Skyr bol', ['petit-dej', 'collation'], [['skyr', 300]]),
  r('d', 'Riz double', ['plat', 'riz'], [['poul', 300], ['riz', 500]], 2),
];
const allIngs = defs.flatMap((d) => d.ings);
const views = defs.map((d) => buildRecipeView(d.recipe, allIngs, byId));

describe('planner', () => {
  it('calcule les macros par portion depuis les ingrédients', () => {
    const v = views[0]!;
    expect(v.macros.kcal).toBe(558);
    expect(v.macros.protein).toBe(44.2);
    expect(views[3]!.macros.kcal).toBe(505);
    expect(views[3]!.grams).toBe(400);
  });

  it('parseQuery comprend les requêtes libres', () => {
    expect(parseQuery('moins de 600 kcal riz')).toMatchObject({ maxKcal: 600, tags: ['riz'] });
    expect(parseQuery('Air Fryer grosse faim').tags).toEqual(expect.arrayContaining(['airfryer', 'grosse-faim']));
    expect(parseQuery('poulet')).toMatchObject({ tags: ['poulet'] });
    expect(parseQuery('brocoli')).toMatchObject({ query: 'brocoli' });
  });

  it('matchesFilter filtre par tags, kcal, texte', () => {
    expect(matchesFilter(views[0]!, parseQuery('riz'))).toBe(true);
    expect(matchesFilter(views[1]!, parseQuery('riz'))).toBe(false);
    expect(matchesFilter(views[0]!, { maxKcal: 500 })).toBe(false);
    expect(matchesFilter(views[1]!, { query: 'brocoli' })).toBe(true);
    expect(matchesFilter(views[0]!, { equipment: ['microwave'] })).toBe(false);
  });

  it('similarRecipes propose des équivalents', () => {
    const sim = similarRecipes(views[0]!, views);
    expect(sim.map((v) => v.recipe.id)).toContain('d');
    expect(sim.map((v) => v.recipe.id)).not.toContain('c');
  });

  it('generatePlan respecte préférences et équipement', () => {
    const prefs = buildPrefIndex([{ id: '1', targetType: 'food', targetId: 'broc', level: 'hate' }]);
    const plan = generatePlan({ startDate: '2026-03-02', days: 2, kcalTarget: 2000, eatsBreakfast: true, views, ingredients: allIngs, foodsById: byId, prefs, diet: 'none', equipment: ['pan'], random: () => 0.5 });
    expect(plan.length).toBe(8);
    expect(plan.every((e) => e.recipeId === 'c' || e.recipeId === 'd')).toBe(true);
    const none = generatePlan({ startDate: '2026-03-02', days: 1, kcalTarget: 2000, eatsBreakfast: false, views, ingredients: allIngs, foodsById: byId, prefs: buildPrefIndex([]), diet: 'none', equipment: ['microwave'], random: () => 0 });
    expect(none.length).toBe(0);
  });

  it('aggregateShopping additionne les ingrédients', () => {
    const viewsById = new Map(views.map((v) => [v.recipe.id, v]));
    const agg = aggregateShopping(
      [
        { id: '1', date: '2026-03-02', slot: 'lunch', time: '12:30', recipeId: 'a', servings: 1 },
        { id: '2', date: '2026-03-03', slot: 'dinner', time: '20:00', recipeId: 'd', servings: 1 },
      ],
      viewsById,
    );
    expect(agg.find((a) => a.foodId === 'poul')?.grams).toBe(300);
    expect(agg.find((a) => a.foodId === 'riz')?.grams).toBe(500);
    expect(formatShoppingQty(1240)).toBe('1.3 kg');
    expect(formatShoppingQty(320)).toBe('350 g');
  });
});
