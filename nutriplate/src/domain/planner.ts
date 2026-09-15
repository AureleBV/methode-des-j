import { macrosForGrams, sumMacros } from './nutrition';
import { isFoodExcluded, recipeCompatibility, type PrefIndex } from './preferences';
import { satietyScore } from './satiety';
import type { Diet, Equipment, Food, FoodCategory, Macros, MealSlot, PlanEntry, Recipe, RecipeIngredient } from './types';
import { addDays } from './weight';

/** Recette enrichie de ses macros par portion (calculées depuis les ingrédients). */
export interface RecipeView {
  recipe: Recipe;
  ingredients: (RecipeIngredient & { food: Food })[];
  /** Macros pour UNE portion. */
  macros: Macros;
  /** Poids d'une portion (g). */
  grams: number;
  satiety: 1 | 2 | 3 | 4 | 5;
}

export function buildRecipeView(recipe: Recipe, ingredients: RecipeIngredient[], foodsById: Map<string, Food>): RecipeView {
  const ings = ingredients
    .filter((i) => i.recipeId === recipe.id)
    .map((i) => ({ ...i, food: foodsById.get(i.foodId)! }))
    .filter((i) => i.food);
  const totalGrams = ings.reduce((s, i) => s + i.grams, 0);
  const total = sumMacros(ings.map((i) => macrosForGrams(i.food.per100, i.grams)));
  const per = (v: number) => Math.round((v / recipe.servings) * 10) / 10;
  const macros: Macros = { kcal: Math.round(total.kcal / recipe.servings), protein: per(total.protein), carbs: per(total.carbs), fat: per(total.fat), fiber: per(total.fiber ?? 0) };
  const grams = Math.round(totalGrams / recipe.servings);
  return { recipe, ingredients: ings, macros, grams, satiety: satietyScore(macros, grams) };
}

export interface RecipeFilter {
  query?: string;
  tags?: string[];
  maxKcal?: number;
  minProtein?: number;
  maxMinutes?: number;
  equipment?: Equipment[];
  minSatiety?: number;
}

const TAG_SYNONYMS: Record<string, string[]> = {
  'repas rapide': ['rapide'],
  rapide: ['rapide'],
  'repas étudiant': ['etudiant'],
  etudiant: ['etudiant'],
  étudiant: ['etudiant'],
  'grosse faim': ['grosse-faim'],
  'air fryer': ['airfryer'],
  airfryer: ['airfryer'],
  'micro-ondes': ['micro-ondes'],
  'riche en protéines': ['proteine'],
  protéines: ['proteine'],
  proteines: ['proteine'],
  pâtes: ['pates'],
  pates: ['pates'],
  riz: ['riz'],
  burger: ['burger'],
  pizza: ['pizza'],
  wrap: ['wrap'],
  poulet: ['poulet'],
  'petit-déjeuner': ['petit-dej'],
  'petit dej': ['petit-dej'],
  dessert: ['dessert'],
  sucré: ['dessert'],
  végétarien: ['vegetarien'],
  'sans cuisson': ['sans-cuisson'],
};

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

/** Interprète une requête libre : "moins de 600 kcal", "air fryer", "pâtes"... */
export function parseQuery(query: string): RecipeFilter {
  const q = normalize(query);
  const f: RecipeFilter = { tags: [] };
  const kcal = q.match(/(?:moins de|<|max)\s*(\d{3,4})\s*k?cal/);
  if (kcal) f.maxKcal = Number(kcal[1]);
  const min = q.match(/(?:moins de|<|max)\s*(\d{1,2})\s*min/);
  if (min) f.maxMinutes = Number(min[1]);
  let rest = q.replace(/(?:moins de|<|max)\s*\d{3,4}\s*k?cal/g, '').replace(/(?:moins de|<|max)\s*\d{1,2}\s*min/g, '');
  for (const [k, tags] of Object.entries(TAG_SYNONYMS)) {
    const nk = normalize(k);
    if (rest.includes(nk)) {
      f.tags!.push(...tags);
      rest = rest.replace(nk, ' ');
    }
  }
  rest = rest.replace(/\s+/g, ' ').trim();
  if (rest) f.query = rest;
  return f;
}

export function matchesFilter(view: RecipeView, filter: RecipeFilter): boolean {
  const r = view.recipe;
  if (filter.maxKcal !== undefined && view.macros.kcal > filter.maxKcal) return false;
  if (filter.minProtein !== undefined && view.macros.protein < filter.minProtein) return false;
  if (filter.maxMinutes !== undefined && r.prepMinutes > filter.maxMinutes) return false;
  if (filter.minSatiety !== undefined && view.satiety < filter.minSatiety) return false;
  if (filter.tags && filter.tags.length && !filter.tags.every((t) => r.tags.includes(t))) return false;
  if (filter.equipment && filter.equipment.length) {
    const has = new Set(filter.equipment);
    if (!r.equipment.every((e) => e === 'none' || has.has(e))) return false;
  }
  if (filter.query) {
    const hay = normalize([r.name, r.description ?? '', ...r.tags, ...view.ingredients.map((i) => i.food.name)].join(' '));
    const words = normalize(filter.query).split(' ').filter(Boolean);
    if (!words.every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Repas "équivalents" : kcal ±15 %, protéines ±30 %, satiété ±1. */
export function similarRecipes(target: RecipeView, all: RecipeView[], max = 5): RecipeView[] {
  return all
    .filter((v) => v.recipe.id !== target.recipe.id)
    .map((v) => ({ v, d: Math.abs(v.macros.kcal - target.macros.kcal) / Math.max(1, target.macros.kcal) + Math.abs(v.macros.protein - target.macros.protein) / Math.max(1, target.macros.protein) * 0.5 + Math.abs(v.satiety - target.satiety) * 0.1 }))
    .filter(({ v, d }) => d < 0.6 && Math.abs(v.satiety - target.satiety) <= 1)
    .sort((a, b) => a.d - b.d)
    .slice(0, max)
    .map((x) => x.v);
}

/** Part de l'objectif journalier allouée à chaque créneau. */
export function slotShares(eatsBreakfast: boolean): Record<Exclude<MealSlot, 'other'>, number> {
  return eatsBreakfast
    ? { breakfast: 0.22, lunch: 0.33, snack: 0.12, dinner: 0.33 }
    : { breakfast: 0, lunch: 0.4, snack: 0.15, dinner: 0.45 };
}

export const SLOT_LABELS: Record<MealSlot, string> = { breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', snack: 'Collation', dinner: 'Dîner', other: 'Autre' };
export const SLOT_TIMES: Record<MealSlot, string> = { breakfast: '08:00', lunch: '12:30', snack: '16:30', dinner: '20:00', other: '' };

export interface PlanInput {
  startDate: string;
  days: number;
  kcalTarget: number;
  eatsBreakfast: boolean;
  views: RecipeView[];
  ingredients: RecipeIngredient[];
  foodsById: Map<string, Food>;
  prefs: PrefIndex;
  diet: Diet;
  equipment: Equipment[];
  /** Recettes favorites : priorisées. */
  favoriteIds?: Set<string>;
  random?: () => number;
}

/**
 * Génère un planning simple : pour chaque jour et créneau, choisit une
 * recette compatible (jamais bloquée par allergie/régime, jamais un
 * ingrédient détesté non substituable), proche de la part kcal du créneau,
 * en évitant de répéter la même recette deux jours de suite.
 */
export function generatePlan(input: PlanInput): Omit<PlanEntry, 'id'>[] {
  const rnd = input.random ?? Math.random;
  const shares = slotShares(input.eatsBreakfast);
  const has = new Set(input.equipment);
  const usable = input.views.filter((v) => {
    const c = recipeCompatibility(v.recipe, input.ingredients, input.foodsById, input.prefs, input.diet);
    if (c.status === 'blocked') return false;
    if (c.problematic.some((p) => p.level === 'hate' && !p.ingredient.optional)) return false;
    return v.recipe.equipment.every((e) => e === 'none' || has.has(e));
  });
  const entries: Omit<PlanEntry, 'id'>[] = [];
  const recent: string[] = [];
  const pick = (slot: Exclude<MealSlot, 'other'>, kcal: number): RecipeView | undefined => {
    const slotTag = slot === 'breakfast' ? 'petit-dej' : slot === 'snack' ? 'collation' : 'plat';
    let pool = usable.filter((v) => v.recipe.tags.includes(slotTag));
    if (pool.length === 0) pool = usable;
    const scored = pool
      .map((v) => {
        let score = Math.abs(v.macros.kcal - kcal) / Math.max(1, kcal);
        if (recent.includes(v.recipe.id)) score += 1;
        if (input.favoriteIds?.has(v.recipe.id)) score -= 0.15;
        score += rnd() * 0.25;
        return { v, score };
      })
      .sort((a, b) => a.score - b.score);
    return scored[0]?.v;
  };
  for (let d = 0; d < input.days; d++) {
    const date = addDays(input.startDate, d);
    for (const slot of ['breakfast', 'lunch', 'snack', 'dinner'] as const) {
      const share = shares[slot];
      if (share === 0) continue;
      const v = pick(slot, input.kcalTarget * share);
      if (!v) continue;
      entries.push({ date, slot, time: SLOT_TIMES[slot], recipeId: v.recipe.id, servings: 1 });
      recent.push(v.recipe.id);
      if (recent.length > 6) recent.shift();
    }
  }
  return entries;
}

export interface ShoppingAggregate {
  foodId: string;
  name: string;
  category: FoodCategory;
  grams: number;
}

/** Agrège les ingrédients d'un ensemble d'entrées de planning en liste de courses. */
export function aggregateShopping(entries: PlanEntry[], viewsById: Map<string, RecipeView>): ShoppingAggregate[] {
  const acc = new Map<string, ShoppingAggregate>();
  for (const e of entries) {
    const v = viewsById.get(e.recipeId);
    if (!v) continue;
    for (const ing of v.ingredients) {
      const grams = (ing.grams / v.recipe.servings) * e.servings;
      const cur = acc.get(ing.foodId);
      if (cur) cur.grams += grams;
      else acc.set(ing.foodId, { foodId: ing.foodId, name: ing.food.name, category: ing.food.category, grams });
    }
  }
  return [...acc.values()].map((a) => ({ ...a, grams: Math.round(a.grams) }));
}

/** Formate une quantité de courses de façon lisible (arrondi commercial). */
export function formatShoppingQty(grams: number, food?: Food): string {
  if (food?.portions?.length && food.category !== 'starch') {
    const unit = food.portions.find((p) => /pièce|unité|œuf|tranche|banane|pomme/i.test(p.label));
    if (unit) {
      const n = Math.ceil(grams / unit.grams);
      return `${n} ${n > 1 ? 'pièces' : 'pièce'} (~${Math.round(grams)} g)`;
    }
  }
  if (grams >= 1000) return `${Math.ceil(grams / 100) / 10} kg`;
  if (grams >= 100) return `${Math.ceil(grams / 50) * 50} g`;
  return `${Math.ceil(grams / 10) * 10} g`;
}

/** Collations selon le niveau de faim. */
export type HungerLevel = 'low' | 'medium' | 'high';

export interface SnackTemplate {
  id: string;
  name: string;
  emoji: string;
  hunger: HungerLevel[];
  items: { foodId: string; grams: number }[];
  tags: string[];
}

export interface SnackSuggestion {
  template: SnackTemplate;
  items: { food: Food; grams: number; macros: Macros }[];
  macros: Macros;
  satiety: 1 | 2 | 3 | 4 | 5;
}

export function suggestSnacks(
  hunger: HungerLevel,
  templates: SnackTemplate[],
  foodsById: Map<string, Food>,
  prefs: PrefIndex,
  diet: Diet,
  remainingKcal: number,
): SnackSuggestion[] {
  const out: SnackSuggestion[] = [];
  for (const t of templates) {
    if (!t.hunger.includes(hunger)) continue;
    const items = t.items.map((i) => ({ food: foodsById.get(i.foodId), grams: i.grams }));
    if (items.some((i) => !i.food || isFoodExcluded(i.food, prefs, diet))) continue;
    const full = items.map((i) => ({ food: i.food!, grams: i.grams, macros: macrosForGrams(i.food!.per100, i.grams) }));
    const macros = sumMacros(full.map((i) => i.macros));
    out.push({ template: t, items: full, macros, satiety: satietyScore(macros, full.reduce((s, i) => s + i.grams, 0)) });
  }
  // Priorité : collations qui rentrent dans ce qu'il reste, puis les plus protéinées.
  const fits = (s: SnackSuggestion) => (remainingKcal <= 0 ? 0 : s.macros.kcal <= remainingKcal ? 0 : 1);
  return out.sort((a, b) => fits(a) - fits(b) || b.macros.protein / b.macros.kcal - a.macros.protein / a.macros.kcal);
}

/**
 * Conseil "aliment plaisir" : comment intégrer un extra dans la journée sans
 * compensation ni interdiction.
 */
export function pleasureAdvice(extraKcal: number, remainingKcal: number, targetProtein: number, proteinSoFar: number): string {
  const missingProtein = Math.max(0, targetProtein - proteinSoFar);
  if (extraKcal <= remainingKcal) return `Ça rentre dans ta journée. Pense juste à garder ${Math.round(missingProtein)} g de protéines sur le reste des repas.`;
  const over = extraKcal - remainingKcal;
  if (over < 250) return 'Léger dépassement, ça n’a aucune importance sur la semaine. Un repas plus léger et protéiné à côté suffit largement.';
  return 'Profite. Sur une semaine ça se lisse tout seul : accompagne-le d’une source de protéines et de légumes si tu aimes, et reprends normalement au repas suivant. Pas de compensation, pas de sport punitif.';
}
