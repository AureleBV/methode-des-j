/**
 * Types partagés du domaine. Pas de dépendance à React ni à Dexie :
 * tout ce qui est ici est testable en pur TypeScript.
 */

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'recomp' | 'maintain' | 'gain';
export type Equipment = 'microwave' | 'pan' | 'airfryer' | 'oven' | 'none';
export type Diet = 'none' | 'vegetarian' | 'vegan' | 'pescatarian' | 'no_pork' | 'gluten_free' | 'lactose_free';

export type FoodCategory =
  | 'meat'
  | 'fish'
  | 'egg'
  | 'starch'
  | 'vegetable'
  | 'fruit'
  | 'dairy'
  | 'sauce'
  | 'snack'
  | 'dessert'
  | 'fat'
  | 'drink'
  | 'other';

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
}

export type FoodSource = 'local' | 'off' | 'user';

export interface Food {
  id: string;
  name: string;
  brand?: string;
  category: FoodCategory;
  /** Valeurs pour 100 g (ou 100 ml pour les boissons). */
  per100: Macros;
  /** Portions usuelles pour saisie rapide. */
  portions?: { label: string; grams: number }[];
  /** Tags libres : 'crudite', 'cooked', 'raw', 'fitness', 'plaisir', 'volume'... */
  tags: string[];
  source: FoodSource;
  barcode?: string;
  /** Quantité par défaut proposée à l'ajout (g). */
  defaultGrams?: number;
  /** Groupe de variantes (ex: 'ground_beef' pour 5 / 10 / 15 / 20 % MG). */
  variantGroup?: string;
  /** Libellé court de la variante ('5 % MG', 'complet', '0 %'). */
  variantLabel?: string;
  /** Rang dans le groupe : 0 = version la plus légère. */
  variantRank?: number;
}

/** Produit précis (marque) rattaché à un aliment générique. */
export interface FoodVariant {
  id: string;
  foodId: string;
  name: string;
  brand?: string;
  barcode?: string;
  /** Valeurs propres au produit si connues (sinon celles de l'aliment générique). */
  per100?: Macros;
  packGrams?: number;
  /** Produit habituel : utilisé par défaut dans la liste de courses. */
  preferred: boolean;
  createdAt: number;
}

/** Prix observé (saisi par l'utilisateur ou issu d'Open Prices). */
export interface PriceRecord {
  id: string;
  variantId?: string;
  foodId: string;
  priceEur: number;
  packGrams?: number;
  store?: string;
  date: string;
  source: 'user' | 'openprices';
}

/** Programme d'entraînement créé par l'utilisateur. */
export interface CustomProgram {
  id: string;
  name: string;
  type: WorkoutType;
  emoji: string;
  durationMinutes: number;
  description?: string;
  exercises: { name: string; sets: number; reps: string; note?: string }[];
  createdAt: number;
}

export type PreferenceLevel = 'love' | 'ok' | 'hate' | 'allergy';

export interface UserPreference {
  id: string;
  /** 'food' cible un aliment précis, 'tag' un groupe (ex: 'crudite'). */
  targetType: 'food' | 'tag';
  targetId: string;
  level: PreferenceLevel;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  foodId: string;
  grams: number;
  /** Ingrédient facultatif (sauce, garniture) : peut être retiré sans casser la recette. */
  optional?: boolean;
  note?: string;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  description?: string;
  /** Tags de recherche : 'rapide', 'etudiant', 'grosse-faim', 'airfryer', 'micro-ondes', 'pates', 'riz', 'burger'... */
  tags: string[];
  prepMinutes: number;
  difficulty: Difficulty;
  equipment: Equipment[];
  /** Nombre de portions produites par les quantités indiquées. */
  servings: number;
  instructions: string[];
  /** Conseil "aliment plaisir" ou astuce d'équilibrage. */
  tip?: string;
  /** Réglages Air Fryer si applicable. */
  airfryer?: { tempC: number; minutes: number; oilGramsDefault: number };
  createdByUser?: boolean;
  /** Image (data URL) pour les recettes perso. */
  imageDataUrl?: string;
  createdAt?: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'snack' | 'dinner' | 'other';

export interface MealLog {
  id: string;
  /** Date locale au format YYYY-MM-DD. */
  date: string;
  slot: MealSlot;
  /** Snapshot du nom au moment de l'ajout (l'aliment peut changer ensuite). */
  name: string;
  foodId?: string;
  recipeId?: string;
  grams: number;
  /** Macros totales pour la quantité consommée (snapshot). */
  macros: Macros;
  createdAt: number;
}

/** Repas enregistré (assemblage d'aliments) pour ré-ajout en un tap. */
export interface Meal {
  id: string;
  name: string;
  items: { foodId: string; grams: number }[];
  createdAt: number;
}

export interface WeightLog {
  id: string;
  date: string;
  kg: number;
  note?: string;
}

export interface DayLog {
  /** Clé : date YYYY-MM-DD. */
  date: string;
  waterMl: number;
  activityMinutes: number;
  hunger?: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export type WorkoutType = 'gym' | 'home' | 'walk' | 'cardio';

export interface WorkoutSet {
  reps: number;
  weightKg?: number;
  done: boolean;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  name: string;
  order: number;
  targetSets: number;
  targetReps: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  date: string;
  type: WorkoutType;
  name: string;
  programId?: string;
  durationMinutes?: number;
  distanceKm?: number;
  notes?: string;
  completed: boolean;
  createdAt: number;
}

export interface Favorite {
  id: string;
  targetType: 'food' | 'recipe';
  targetId: string;
  createdAt: number;
}

export interface ShoppingList {
  id: string;
  name: string;
  createdAt: number;
}

export interface ShoppingListItem {
  id: string;
  listId: string;
  foodId?: string;
  name: string;
  category: FoodCategory;
  grams: number;
  checked: boolean;
}

export interface PlanEntry {
  id: string;
  date: string;
  slot: MealSlot;
  time: string;
  recipeId: string;
  servings: number;
}

export interface UserProfile {
  id: 'me';
  firstName?: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg?: number;
  activity: ActivityLevel;
  sessionsPerWeek: number;
  goal: Goal;
  equipment: Equipment[];
  diet: Diet;
  /** Petit-déjeuner pris habituellement ? Influence le planning. */
  eatsBreakfast: boolean;
  /** Ajustement manuel/auto en kcal appliqué à l'objectif calculé. */
  kcalAdjustment: number;
  /** Signaux de rapport compliqué à l'alimentation : mode "douceur" (pas de déficit poussé). */
  gentleMode: boolean;
  waterGoalMl: number;
  onboarded: boolean;
  createdAt: number;
  updatedAt: number;
  /** —— Personnalisation (phase 4) —— */
  avatar?: string;
  accent?: AccentTheme;
  /** Rythme : douce = déficit réduit, soutenue = déficit haut de la fourchette. */
  pace?: GoalPace;
  /** Protéines par kg de poids de référence (défaut : 1,6 à 1,8). */
  proteinPerKg?: number;
  /** Heures habituelles des repas (planning, rappels). */
  mealTimes?: Partial<Record<MealSlot, string>>;
  /** Variante habituelle par groupe (ex: ground_beef -> ground_beef_10). */
  usualVariants?: Record<string, string>;
  /** Créneaux effectivement pris (permet de retirer la collation, etc.). */
  slots?: MealSlot[];
}

export type AccentTheme = 'green' | 'blue' | 'coral' | 'violet' | 'amber';
export type GoalPace = 'douce' | 'moderee' | 'soutenue';

export interface Targets {
  bmr: number;
  tdee: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Déficit (négatif) ou surplus (positif) effectif en kcal/jour. */
  delta: number;
}
