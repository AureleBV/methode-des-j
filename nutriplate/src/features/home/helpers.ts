import type { RecipeView } from '@/domain/planner';
import { foodLevel, foodAllowedByDiet, type PrefIndex } from '@/domain/preferences';
import type { UserProfile } from '@/domain/types';
export { SLOT_LABELS } from '@/domain/planner';

/** Vrai si la recette est faisable (équipement) et ne contient ni allergène, ni aliment détesté obligatoire. */
export function recipeCompatibilityQuick(v: RecipeView, prefs: PrefIndex, profile: UserProfile): boolean {
  const has = new Set(profile.equipment);
  if (!v.recipe.equipment.every((e) => e === 'none' || has.has(e))) return false;
  for (const ing of v.ingredients) {
    const level = foodLevel(ing.food, prefs);
    const dietOk = foodAllowedByDiet(ing.food, profile.diet);
    if ((level === 'allergy' || !dietOk) && !ing.optional) return false;
    if (level === 'hate' && !ing.optional) return false;
  }
  return true;
}
