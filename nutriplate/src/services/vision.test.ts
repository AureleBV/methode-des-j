import { describe, expect, it } from 'vitest';
import { SEED_FOOD_IDS } from '@/db/seed/foods';
import { SEED_RECIPES } from '@/db/seed/recipes';
import { frenchLabel, IMAGENET_FOOD_MAP, mapGuess, parseGeminiJson } from './vision';

describe('vision', () => {
  it('parse la réponse JSON de Gemini, même entourée de texte', () => {
    const g = parseGeminiJson('Voici :\n```json\n{"items":[{"name":"Riz","grams":180,"confidence":0.9},{"name":"Poulet","grams":120}]}\n```');
    expect(g).toEqual([
      { raw: 'Riz', label: 'Riz', grams: 180, confidence: 0.9 },
      { raw: 'Poulet', label: 'Poulet', grams: 120, confidence: 0.5 },
    ]);
    expect(parseGeminiJson('rien')).toEqual([]);
  });
  it('traduit les classes ImageNet et pointe vers des aliments existants', () => {
    expect(frenchLabel('cheeseburger')).toBe('Burger');
    expect(frenchLabel('banana, Musa')).toBe('Banane');
    expect(frenchLabel('toaster')).toBe('toaster');
    expect(mapGuess('pizza, pizza pie').recipeIds).toContain('pizza_tortilla');
    const recipeIds = new Set(SEED_RECIPES.map((r) => r.id));
    for (const [k, v] of Object.entries(IMAGENET_FOOD_MAP)) {
      for (const id of v.foodIds ?? []) expect(SEED_FOOD_IDS.has(id), `${k} -> ${id}`).toBe(true);
      for (const id of v.recipeIds ?? []) expect(recipeIds.has(id), `${k} -> ${id}`).toBe(true);
    }
  });
});
