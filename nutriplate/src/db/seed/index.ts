import { db, type NutriDB } from '@/db';
import { SEED_FOODS } from './foods';
import { SEED_INGREDIENTS, SEED_RECIPES } from './recipes';

export const SEED_VERSION = 1;

/**
 * Insère/actualise les données de départ. Les aliments et recettes créés
 * par l'utilisateur (source 'user' / createdByUser) ne sont jamais touchés.
 * Rejoué uniquement quand SEED_VERSION change.
 */
export async function ensureSeeded(database: NutriDB = db): Promise<void> {
  const current = await database.meta.get('seedVersion');
  if (current && Number(current.value) >= SEED_VERSION) return;
  await database.transaction('rw', [database.foods, database.recipes, database.recipeIngredients, database.meta], async () => {
    await database.foods.bulkPut(SEED_FOODS);
    await database.recipes.bulkPut(SEED_RECIPES);
    const seedRecipeIds = SEED_RECIPES.map((r) => r.id);
    await database.recipeIngredients.where('recipeId').anyOf(seedRecipeIds).delete();
    await database.recipeIngredients.bulkPut(SEED_INGREDIENTS);
    await database.meta.put({ key: 'seedVersion', value: SEED_VERSION });
  });
}
