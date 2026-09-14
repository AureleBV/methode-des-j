import Dexie, { type EntityTable } from 'dexie';
import type {
  DayLog,
  Favorite,
  Food,
  Meal,
  MealLog,
  PlanEntry,
  Recipe,
  RecipeIngredient,
  ShoppingList,
  ShoppingListItem,
  UserPreference,
  UserProfile,
  WeightLog,
  Workout,
  WorkoutExercise,
} from '@/domain/types';

/** Cache local des produits Open Food Facts. */
export interface OffCacheEntry {
  key: string;
  food: Food;
  fetchedAt: number;
}

export interface AppMeta {
  key: string;
  value: string | number;
}

/**
 * Base locale (IndexedDB via Dexie). Une seule base, toutes les données
 * restent sur l'appareil. Les index déclarés ci-dessous servent aux
 * requêtes ; les autres champs sont stockés tels quels.
 */
export class NutriDB extends Dexie {
  profile!: EntityTable<UserProfile, 'id'>;
  foods!: EntityTable<Food, 'id'>;
  recipes!: EntityTable<Recipe, 'id'>;
  recipeIngredients!: EntityTable<RecipeIngredient, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  mealLogs!: EntityTable<MealLog, 'id'>;
  weightLogs!: EntityTable<WeightLog, 'id'>;
  dayLogs!: EntityTable<DayLog, 'date'>;
  workouts!: EntityTable<Workout, 'id'>;
  workoutExercises!: EntityTable<WorkoutExercise, 'id'>;
  favorites!: EntityTable<Favorite, 'id'>;
  shoppingLists!: EntityTable<ShoppingList, 'id'>;
  shoppingListItems!: EntityTable<ShoppingListItem, 'id'>;
  preferences!: EntityTable<UserPreference, 'id'>;
  planEntries!: EntityTable<PlanEntry, 'id'>;
  offCache!: EntityTable<OffCacheEntry, 'key'>;
  meta!: EntityTable<AppMeta, 'key'>;

  constructor(name = 'nutriplate') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      foods: 'id, name, category, source, barcode',
      recipes: 'id, name, *tags, createdByUser',
      recipeIngredients: 'id, recipeId, foodId',
      meals: 'id, name, createdAt',
      mealLogs: 'id, date, [date+slot], foodId, recipeId',
      weightLogs: 'id, &date',
      dayLogs: 'date',
      workouts: 'id, date, type',
      workoutExercises: 'id, workoutId',
      favorites: 'id, [targetType+targetId]',
      shoppingLists: 'id, createdAt',
      shoppingListItems: 'id, listId',
      preferences: 'id, [targetType+targetId]',
      planEntries: 'id, date, [date+slot]',
      offCache: 'key, fetchedAt',
      meta: 'key',
    });
  }
}

export const db = new NutriDB();

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
