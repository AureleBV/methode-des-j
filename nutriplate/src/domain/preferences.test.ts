import { describe, expect, it } from 'vitest';
import { buildPrefIndex, foodLevel, isFoodExcluded, recipeCompatibility, suggestSubstitutes } from './preferences';
import type { Food, Recipe, RecipeIngredient } from './types';

const f = (id: string, name: string, category: Food['category'], tags: string[] = []): Food => ({ id, name, category, tags, per100: { kcal: 50, protein: 2, carbs: 8, fat: 0.5 }, source: 'local' });
const foods = [
  f('broc', 'Brocoli cuit', 'vegetable', ['cooked']),
  f('hv', 'Haricots verts', 'vegetable', ['cooked']),
  f('car', 'Carottes cuites', 'vegetable', ['cooked']),
  f('sal', 'Salade verte', 'vegetable', ['crudite', 'raw']),
  f('tom', 'Tomate', 'vegetable', ['crudite', 'raw']),
  f('poul', 'Blanc de poulet', 'meat', ['animal']),
  f('lard', 'Lardons', 'meat', ['pork', 'animal']),
];
const byId = new Map(foods.map((x) => [x.id, x]));

describe('preferences', () => {
  it('un aliment détesté par tag est exclu', () => {
    const idx = buildPrefIndex([{ id: '1', targetType: 'tag', targetId: 'crudite', level: 'hate' }]);
    expect(foodLevel(byId.get('sal')!, idx)).toBe('hate');
    expect(isFoodExcluded(byId.get('sal')!, idx, 'none')).toBe(true);
    expect(isFoodExcluded(byId.get('broc')!, idx, 'none')).toBe(false);
  });

  it('le régime exclut les aliments', () => {
    const idx = buildPrefIndex([]);
    expect(isFoodExcluded(byId.get('lard')!, idx, 'no_pork')).toBe(true);
    expect(isFoodExcluded(byId.get('poul')!, idx, 'vegetarian')).toBe(true);
    expect(isFoodExcluded(byId.get('broc')!, idx, 'vegan')).toBe(false);
  });

  it('substitutions : brocoli détesté -> légumes cuits, jamais de crudités si détestées', () => {
    const idx = buildPrefIndex([
      { id: '1', targetType: 'food', targetId: 'broc', level: 'hate' },
      { id: '2', targetType: 'tag', targetId: 'crudite', level: 'hate' },
      { id: '3', targetType: 'food', targetId: 'car', level: 'love' },
    ]);
    const subs = suggestSubstitutes(byId.get('broc')!, foods, idx, 'none');
    expect(subs.map((s) => s.id)).toEqual(['car', 'hv']);
  });

  it('compatibilité recette', () => {
    const recipe: Recipe = { id: 'r', name: 'Test', emoji: '🍽️', tags: [], prepMinutes: 5, difficulty: 'easy', equipment: [], servings: 1, instructions: [] };
    const ings: RecipeIngredient[] = [
      { id: 'a', recipeId: 'r', foodId: 'poul', grams: 150 },
      { id: 'b', recipeId: 'r', foodId: 'broc', grams: 200 },
    ];
    const idx = buildPrefIndex([{ id: '1', targetType: 'food', targetId: 'broc', level: 'hate' }]);
    expect(recipeCompatibility(recipe, ings, byId, idx, 'none').status).toBe('substitute');
    expect(recipeCompatibility(recipe, ings, byId, idx, 'vegetarian').status).toBe('blocked');
    expect(recipeCompatibility(recipe, ings, byId, buildPrefIndex([]), 'none').status).toBe('ok');
  });
});
