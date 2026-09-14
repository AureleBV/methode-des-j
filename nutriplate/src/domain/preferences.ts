import type { Diet, Food, FoodCategory, PreferenceLevel, Recipe, RecipeIngredient, UserPreference } from './types';

/**
 * Filtrage des aliments/recettes selon les préférences (adoré / accepté /
 * détesté / allergie), le régime et les tags de groupe (ex : 'crudite').
 */

export interface PrefIndex {
  foods: Map<string, PreferenceLevel>;
  tags: Map<string, PreferenceLevel>;
}

export function buildPrefIndex(prefs: UserPreference[]): PrefIndex {
  const foods = new Map<string, PreferenceLevel>();
  const tags = new Map<string, PreferenceLevel>();
  for (const p of prefs) (p.targetType === 'food' ? foods : tags).set(p.targetId, p.level);
  return { foods, tags };
}

/** Niveau effectif pour un aliment : préférence directe > tag > 'ok'. */
export function foodLevel(food: Food, idx: PrefIndex): PreferenceLevel {
  const direct = idx.foods.get(food.id);
  if (direct) return direct;
  let worst: PreferenceLevel | undefined;
  for (const t of food.tags) {
    const l = idx.tags.get(t);
    if (!l) continue;
    if (l === 'allergy') return 'allergy';
    if (l === 'hate') worst = 'hate';
    else if (l === 'love' && !worst) worst = 'love';
  }
  return worst ?? 'ok';
}

const DIET_EXCLUDED_TAGS: Record<Diet, string[]> = {
  none: [],
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'egg', 'dairy', 'animal'],
  pescatarian: ['meat'],
  no_pork: ['pork'],
  gluten_free: ['gluten'],
  lactose_free: ['lactose'],
};

export function foodAllowedByDiet(food: Food, diet: Diet): boolean {
  const excluded = DIET_EXCLUDED_TAGS[diet];
  if (excluded.length === 0) return true;
  const tags = new Set([...food.tags, food.category]);
  return !excluded.some((t) => tags.has(t));
}

export function isFoodExcluded(food: Food, idx: PrefIndex, diet: Diet): boolean {
  const level = foodLevel(food, idx);
  return level === 'hate' || level === 'allergy' || !foodAllowedByDiet(food, diet);
}

export interface RecipeCompat {
  /** 'ok' : rien à changer ; 'substitute' : ingrédients détestés remplaçables ; 'blocked' : allergie/régime sur un ingrédient obligatoire. */
  status: 'ok' | 'substitute' | 'blocked';
  problematic: { ingredient: RecipeIngredient; food: Food; level: PreferenceLevel | 'diet' }[];
  loved: number;
}

export function recipeCompatibility(
  recipe: Recipe,
  ingredients: RecipeIngredient[],
  foodsById: Map<string, Food>,
  idx: PrefIndex,
  diet: Diet,
): RecipeCompat {
  const problematic: RecipeCompat['problematic'] = [];
  let loved = 0;
  let blocked = false;
  for (const ing of ingredients.filter((i) => i.recipeId === recipe.id)) {
    const food = foodsById.get(ing.foodId);
    if (!food) continue;
    const level = foodLevel(food, idx);
    if (level === 'love') loved++;
    const dietOk = foodAllowedByDiet(food, diet);
    if (level === 'allergy' || !dietOk) {
      problematic.push({ ingredient: ing, food, level: level === 'allergy' ? 'allergy' : 'diet' });
      if (!ing.optional) blocked = true;
    } else if (level === 'hate') {
      problematic.push({ ingredient: ing, food, level: 'hate' });
    }
  }
  return { status: blocked ? 'blocked' : problematic.length ? 'substitute' : 'ok', problematic, loved };
}

/**
 * Groupes de substitution : un aliment peut être remplacé par un autre du
 * même groupe (à quantité égale, l'app recalcule les macros).
 */
const SUB_GROUPS: Record<string, string[]> = {
  veg_cooked: ['haricots verts', 'carottes', 'courgette', 'brocoli', 'épinards', 'poêlée de légumes', 'petits pois', 'champignons', 'poivron', 'chou-fleur'],
  veg_raw: ['salade verte', 'tomate', 'concombre', 'carottes râpées', 'radis'],
  starch: ['riz', 'pâtes', 'pommes de terre', 'semoule', 'quinoa', 'boulgour', 'patate douce', 'pain'],
  meat_lean: ['blanc de poulet', 'escalope de dinde', 'steak haché 5 %', 'filet mignon de porc', 'jambon blanc'],
  fish: ['cabillaud', 'saumon', 'thon en boîte', 'crevettes', 'colin'],
  dairy_protein: ['skyr', 'fromage blanc 0 %', 'yaourt grec 0 %', 'yaourt nature', 'cottage cheese'],
  cheese: ['parmesan', 'gruyère', 'mozzarella', 'feta', 'chèvre'],
  sauce: ['ketchup', 'moutarde', 'sauce tomate', 'sauce soja', 'sauce yaourt'],
  fruit: ['pomme', 'banane', 'orange', 'poire', 'fraises', 'clémentines', 'raisin', 'kiwi'],
};

export function substitutionGroup(food: Food): string | undefined {
  const n = food.name.toLowerCase();
  for (const [group, names] of Object.entries(SUB_GROUPS)) if (names.some((x) => n.includes(x))) return group;
  if (food.category === 'vegetable') return food.tags.includes('crudite') ? 'veg_raw' : 'veg_cooked';
  if (food.category === 'starch') return 'starch';
  if (food.category === 'meat') return 'meat_lean';
  if (food.category === 'fish') return 'fish';
  if (food.category === 'fruit') return 'fruit';
  if (food.category === 'sauce') return 'sauce';
  return undefined;
}

/**
 * Propose des substituts pour un aliment : même groupe, jamais détesté,
 * compatible régime, aliments adorés d'abord. Les crudités ne sont proposées
 * à la place d'un légume cuit que si l'utilisateur ne les déteste pas, et
 * inversement on privilégie les légumes cuits.
 */
export function suggestSubstitutes(food: Food, allFoods: Food[], idx: PrefIndex, diet: Diet, max = 4): Food[] {
  const group = substitutionGroup(food);
  const candidates = allFoods.filter((f) => f.id !== food.id && !isFoodExcluded(f, idx, diet) && f.source !== 'off');
  const sameGroup = candidates.filter((f) => substitutionGroup(f) === group);
  let pool = sameGroup;
  if (group === 'veg_raw') {
    // Si l'utilisateur déteste les crudités, on bascule sur des légumes cuits.
    const cookedFirst = candidates.filter((f) => substitutionGroup(f) === 'veg_cooked');
    pool = idx.tags.get('crudite') === 'hate' ? cookedFirst : [...sameGroup, ...cookedFirst];
  } else if (group === 'veg_cooked' && sameGroup.length < max) {
    pool = [...sameGroup, ...candidates.filter((f) => substitutionGroup(f) === 'veg_raw')];
  }
  if (pool.length === 0) pool = candidates.filter((f) => f.category === food.category);
  // Ordre : adorés d'abord, puis les substituts les plus courants (ordre des listes SUB_GROUPS), puis alphabétique.
  const rank = (f: Food) => (foodLevel(f, idx) === 'love' ? 0 : 1);
  const commonness = (f: Food) => {
    const g = substitutionGroup(f);
    const names = g ? SUB_GROUPS[g] : undefined;
    const i = names ? names.findIndex((n) => f.name.toLowerCase().includes(n)) : -1;
    return i === -1 ? 99 : i;
  };
  return [...pool].sort((a, b) => rank(a) - rank(b) || commonness(a) - commonness(b) || a.name.localeCompare(b.name)).slice(0, max);
}

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  meat: 'Viandes',
  fish: 'Poissons & fruits de mer',
  egg: 'Œufs',
  starch: 'Féculents & pains',
  vegetable: 'Légumes',
  fruit: 'Fruits',
  dairy: 'Produits laitiers',
  sauce: 'Sauces & condiments',
  snack: 'Snacks',
  dessert: 'Desserts & sucré',
  fat: 'Huiles & matières grasses',
  drink: 'Boissons',
  other: 'Autres',
};

export const CATEGORY_ORDER: FoodCategory[] = ['meat', 'fish', 'egg', 'starch', 'vegetable', 'fruit', 'dairy', 'sauce', 'snack', 'dessert', 'fat', 'drink', 'other'];
