import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { db } from '@/db';
import { buildRecipeView, type RecipeView } from '@/domain/planner';
import { buildPrefIndex, type PrefIndex } from '@/domain/preferences';
import { targetsForProfile } from '@/domain/nutrition';
import type { Food, Targets, UserProfile } from '@/domain/types';

/** Hooks de lecture réactive sur la base locale. */

export function useProfile(): UserProfile | null | undefined {
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
}

export function useTargets(profile: UserProfile | null | undefined): Targets | null {
  return useMemo(() => (profile ? targetsForProfile(profile) : null), [profile]);
}

export function useFoods(): Food[] {
  return useLiveQuery(() => db.foods.toArray(), []) ?? [];
}

export function useFoodMap(): Map<string, Food> {
  const foods = useFoods();
  return useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
}

export function usePrefIndex(): PrefIndex {
  const prefs = useLiveQuery(() => db.preferences.toArray(), []);
  return useMemo(() => buildPrefIndex(prefs ?? []), [prefs]);
}

export function useRecipeViews(): { views: RecipeView[]; byId: Map<string, RecipeView>; loaded: boolean } {
  const data = useLiveQuery(async () => {
    const [recipes, ingredients, foods] = await Promise.all([db.recipes.toArray(), db.recipeIngredients.toArray(), db.foods.toArray()]);
    return { recipes, ingredients, foods };
  }, []);
  return useMemo(() => {
    if (!data) return { views: [], byId: new Map(), loaded: false };
    const foodsById = new Map(data.foods.map((f) => [f.id, f]));
    const views = data.recipes.map((r) => buildRecipeView(r, data.ingredients, foodsById));
    return { views, byId: new Map(views.map((v) => [v.recipe.id, v])), loaded: true };
  }, [data]);
}

export function useIngredients() {
  return useLiveQuery(() => db.recipeIngredients.toArray(), []) ?? [];
}

export function useDayLogs(date: string) {
  return useLiveQuery(() => db.mealLogs.where('date').equals(date).sortBy('createdAt'), [date]) ?? [];
}

export function useDayLog(date: string) {
  return useLiveQuery(() => db.dayLogs.get(date), [date]);
}

export function useFavorites() {
  const favsQ = useLiveQuery(() => db.favorites.toArray(), []);
  return useMemo(() => { const favs = favsQ ?? []; return { list: favs, recipeIds: new Set(favs.filter((f) => f.targetType === 'recipe').map((f) => f.targetId)), foodIds: new Set(favs.filter((f) => f.targetType === 'food').map((f) => f.targetId)) }; }, [favsQ]);
}

export function useWeightLogs() {
  return useLiveQuery(() => db.weightLogs.orderBy('date').toArray(), []) ?? [];
}

export function useSavedMeals() {
  return useLiveQuery(() => db.meals.orderBy('createdAt').reverse().toArray(), []) ?? [];
}
