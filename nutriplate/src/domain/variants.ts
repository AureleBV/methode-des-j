import type { Food, UserProfile } from './types';

/**
 * Variantes d'un même aliment (steak 5 / 10 / 15 / 20 %, lait écrémé /
 * demi / entier…). L'app n'impose jamais la version la plus légère : elle
 * la propose, et l'utilisateur choisit précisément ce qu'il prend.
 */

export function variantsOf(food: Food, all: Food[]): Food[] {
  if (!food.variantGroup) return [food];
  return all.filter((f) => f.variantGroup === food.variantGroup).sort((a, b) => (a.variantRank ?? 0) - (b.variantRank ?? 0));
}

export function lightestVariant(food: Food, all: Food[]): Food {
  return variantsOf(food, all)[0] ?? food;
}

/** Variante habituelle de l'utilisateur pour le groupe de cet aliment, sinon l'aliment lui-même. */
export function usualVariant(food: Food, all: Food[], profile: Pick<UserProfile, 'usualVariants'> | null | undefined): Food {
  if (!food.variantGroup) return food;
  const id = profile?.usualVariants?.[food.variantGroup];
  if (!id) return food;
  return all.find((f) => f.id === id && f.variantGroup === food.variantGroup) ?? food;
}

export interface LighterTip {
  food: Food;
  /** Différence de kcal pour la quantité donnée (positive = économie). */
  kcalSaved: number;
}

/** Astuce douce : version plus légère disponible, et combien ça change pour cette quantité. */
export function lighterTip(food: Food, all: Food[], grams: number): LighterTip | null {
  const lightest = lightestVariant(food, all);
  if (lightest.id === food.id) return null;
  const saved = Math.round(((food.per100.kcal - lightest.per100.kcal) * grams) / 100);
  if (saved < 25) return null;
  return { food: lightest, kcalSaved: saved };
}

/** Libellé d'affichage : nom générique + variante. */
export function variantDisplayName(food: Food): string {
  return food.variantLabel ? `${food.name}` : food.name;
}
