import { db, uid } from '@/db';
import { PROGRAMS } from '@/db/seed/programs';
import { macrosForGrams, sumMacros } from '@/domain/nutrition';
import { aggregateShopping, generatePlan, type PlanInput, type RecipeView } from '@/domain/planner';
import type { Food, Macros, MealLog, MealSlot, PlanEntry, PreferenceLevel, Recipe, RecipeIngredient, UserProfile, WorkoutType } from '@/domain/types';
import { today } from '@/domain/weight';

/** Mutations de la base : toutes les écritures passent par ici. */

export async function saveProfile(profile: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<UserProfile, 'createdAt'>>): Promise<void> {
  const existing = await db.profile.get('me');
  await db.profile.put({ ...profile, id: 'me', createdAt: existing?.createdAt ?? profile.createdAt ?? Date.now(), updatedAt: Date.now() });
}

export async function updateProfile(patch: Partial<UserProfile>): Promise<void> {
  await db.profile.update('me', { ...patch, updatedAt: Date.now() });
}

export async function logFood(params: { date: string; slot: MealSlot; food: Food; grams: number }): Promise<MealLog> {
  const entry: MealLog = { id: uid(), date: params.date, slot: params.slot, name: params.food.name, foodId: params.food.id, grams: params.grams, macros: macrosForGrams(params.food.per100, params.grams), createdAt: Date.now() };
  if (params.food.source === 'off') await db.foods.put(params.food); // conserve le produit scanné pour les prochains ajouts
  await db.mealLogs.add(entry);
  return entry;
}

export async function logRecipe(params: { date: string; slot: MealSlot; view: RecipeView; servings: number; overrideMacros?: Macros; overrideName?: string }): Promise<MealLog> {
  const m = params.overrideMacros ?? params.view.macros;
  const scale = (v: number) => Math.round(v * params.servings * 10) / 10;
  const entry: MealLog = {
    id: uid(),
    date: params.date,
    slot: params.slot,
    name: params.overrideName ?? params.view.recipe.name,
    recipeId: params.view.recipe.id,
    grams: Math.round(params.view.grams * params.servings),
    macros: { kcal: Math.round(m.kcal * params.servings), protein: scale(m.protein), carbs: scale(m.carbs), fat: scale(m.fat), fiber: scale(m.fiber ?? 0) },
    createdAt: Date.now(),
  };
  await db.mealLogs.add(entry);
  return entry;
}

export async function logCustom(params: { date: string; slot: MealSlot; name: string; grams: number; macros: Macros }): Promise<void> {
  await db.mealLogs.add({ id: uid(), ...params, createdAt: Date.now() });
}

export async function updateLogGrams(log: MealLog, grams: number, food?: Food): Promise<void> {
  if (grams <= 0) return db.mealLogs.delete(log.id);
  const ratio = grams / Math.max(1, log.grams);
  const macros: Macros = food
    ? macrosForGrams(food.per100, grams)
    : { kcal: Math.round(log.macros.kcal * ratio), protein: Math.round(log.macros.protein * ratio * 10) / 10, carbs: Math.round(log.macros.carbs * ratio * 10) / 10, fat: Math.round(log.macros.fat * ratio * 10) / 10, fiber: Math.round((log.macros.fiber ?? 0) * ratio * 10) / 10 };
  await db.mealLogs.update(log.id, { grams, macros });
}

export const deleteLog = (id: string) => db.mealLogs.delete(id);

export async function toggleFavorite(targetType: 'food' | 'recipe', targetId: string): Promise<boolean> {
  const existing = await db.favorites.where('[targetType+targetId]').equals([targetType, targetId]).first();
  if (existing) {
    await db.favorites.delete(existing.id);
    return false;
  }
  await db.favorites.add({ id: uid(), targetType, targetId, createdAt: Date.now() });
  return true;
}

export async function saveMealFromLogs(name: string, logs: MealLog[]): Promise<void> {
  const items = logs.filter((l) => l.foodId).map((l) => ({ foodId: l.foodId!, grams: l.grams }));
  if (items.length === 0) return;
  await db.meals.add({ id: uid(), name, items, createdAt: Date.now() });
}

export async function logSavedMeal(mealId: string, date: string, slot: MealSlot): Promise<void> {
  const meal = await db.meals.get(mealId);
  if (!meal) return;
  const foods = await db.foods.bulkGet(meal.items.map((i) => i.foodId));
  const logs: MealLog[] = [];
  meal.items.forEach((item, i) => {
    const food = foods[i];
    if (!food) return;
    logs.push({ id: uid(), date, slot, name: food.name, foodId: food.id, grams: item.grams, macros: macrosForGrams(food.per100, item.grams), createdAt: Date.now() + i });
  });
  await db.mealLogs.bulkAdd(logs);
}

export const deleteSavedMeal = (id: string) => db.meals.delete(id);

export async function setPreference(targetType: 'food' | 'tag', targetId: string, level: PreferenceLevel | null): Promise<void> {
  const existing = await db.preferences.where('[targetType+targetId]').equals([targetType, targetId]).first();
  if (level === null || level === 'ok') {
    if (existing) await db.preferences.delete(existing.id);
    return;
  }
  if (existing) await db.preferences.update(existing.id, { level });
  else await db.preferences.add({ id: uid(), targetType, targetId, level });
}

export async function createCustomFood(input: Omit<Food, 'id' | 'source'>): Promise<Food> {
  const food: Food = { ...input, id: `user:${uid()}`, source: 'user' };
  await db.foods.add(food);
  return food;
}

export const deleteCustomFood = (id: string) => db.foods.delete(id);

export async function saveCustomRecipe(recipe: Omit<Recipe, 'id' | 'createdByUser' | 'createdAt'> & { id?: string }, ingredients: { foodId: string; grams: number; optional?: boolean }[]): Promise<string> {
  const id = recipe.id ?? `user:${uid()}`;
  await db.transaction('rw', [db.recipes, db.recipeIngredients], async () => {
    await db.recipes.put({ ...recipe, id, createdByUser: true, createdAt: Date.now() });
    await db.recipeIngredients.where('recipeId').equals(id).delete();
    const rows: RecipeIngredient[] = ingredients.map((i, n) => ({ id: `${id}__${n}`, recipeId: id, foodId: i.foodId, grams: i.grams, optional: i.optional }));
    await db.recipeIngredients.bulkAdd(rows);
  });
  return id;
}

export async function deleteRecipe(id: string): Promise<void> {
  await db.transaction('rw', [db.recipes, db.recipeIngredients, db.favorites, db.planEntries], async () => {
    await db.recipes.delete(id);
    await db.recipeIngredients.where('recipeId').equals(id).delete();
    await db.favorites.where('[targetType+targetId]').equals(['recipe', id]).delete();
    await db.planEntries.filter((p) => p.recipeId === id).delete();
  });
}

export async function logWeight(date: string, kg: number, note?: string): Promise<void> {
  const existing = await db.weightLogs.where('date').equals(date).first();
  if (existing) await db.weightLogs.update(existing.id, { kg, note });
  else await db.weightLogs.add({ id: uid(), date, kg, note });
  if (date === today()) await db.profile.update('me', { weightKg: kg, updatedAt: Date.now() });
}

export const deleteWeight = (id: string) => db.weightLogs.delete(id);

export async function upsertDayLog(date: string, patch: Partial<Omit<import('@/domain/types').DayLog, 'date'>>): Promise<void> {
  const existing = await db.dayLogs.get(date);
  await db.dayLogs.put({ date, waterMl: 0, activityMinutes: 0, ...existing, ...patch });
}

export async function replaceWeekPlan(input: Omit<PlanInput, 'random'>): Promise<number> {
  const entries = generatePlan(input);
  const end = entries.reduce((m, e) => (e.date > m ? e.date : m), input.startDate);
  await db.transaction('rw', db.planEntries, async () => {
    await db.planEntries.where('date').between(input.startDate, end, true, true).delete();
    await db.planEntries.bulkAdd(entries.map((e) => ({ ...e, id: uid() })));
  });
  return entries.length;
}

export async function setPlanEntry(entry: Omit<PlanEntry, 'id'> & { id?: string }): Promise<void> {
  if (entry.id) return db.planEntries.update(entry.id, entry).then(() => undefined);
  const existing = await db.planEntries.where('[date+slot]').equals([entry.date, entry.slot]).first();
  if (existing) await db.planEntries.update(existing.id, { recipeId: entry.recipeId, servings: entry.servings, time: entry.time });
  else await db.planEntries.add({ ...entry, id: uid() });
}

export const deletePlanEntry = (id: string) => db.planEntries.delete(id);

export async function createShoppingListFromPlan(name: string, entries: PlanEntry[], viewsById: Map<string, RecipeView>, extraFavoriteViews: RecipeView[] = []): Promise<string> {
  const extra: PlanEntry[] = extraFavoriteViews.map((v) => ({ id: uid(), date: today(), slot: 'other', time: '', recipeId: v.recipe.id, servings: 1 }));
  const agg = aggregateShopping([...entries, ...extra], viewsById);
  const id = uid();
  await db.transaction('rw', [db.shoppingLists, db.shoppingListItems], async () => {
    await db.shoppingLists.add({ id, name, createdAt: Date.now() });
    await db.shoppingListItems.bulkAdd(agg.map((a) => ({ id: uid(), listId: id, foodId: a.foodId, name: a.name, category: a.category, grams: a.grams, checked: false })));
  });
  return id;
}

export const toggleShoppingItem = (id: string, checked: boolean) => db.shoppingListItems.update(id, { checked });
export const deleteShoppingItem = (id: string) => db.shoppingListItems.delete(id);
export async function addShoppingItem(listId: string, name: string, category: Food['category'], grams: number, foodId?: string) {
  await db.shoppingListItems.add({ id: uid(), listId, foodId, name, category, grams, checked: false });
}
export async function deleteShoppingList(id: string) {
  await db.transaction('rw', [db.shoppingLists, db.shoppingListItems], async () => {
    await db.shoppingLists.delete(id);
    await db.shoppingListItems.where('listId').equals(id).delete();
  });
}

export async function startWorkout(programId: string | null, type: WorkoutType, date = today()): Promise<string> {
  const program = programId ? PROGRAMS.find((p) => p.id === programId) : undefined;
  const id = uid();
  await db.transaction('rw', [db.workouts, db.workoutExercises], async () => {
    await db.workouts.add({ id, date, type, name: program?.name ?? { gym: 'Séance salle', home: 'Séance maison', walk: 'Marche', cardio: 'Cardio' }[type], programId: program?.id, completed: false, createdAt: Date.now() });
    if (program) {
      // Pré-remplit avec la dernière séance du même programme pour suivre la progression.
      const last = await db.workouts.where('date').below(date).filter((w) => w.programId === program.id && w.completed).last();
      const lastEx = last ? await db.workoutExercises.where('workoutId').equals(last.id).toArray() : [];
      await db.workoutExercises.bulkAdd(
        program.exercises.map((e, i) => {
          const prev = lastEx.find((x) => x.name === e.name);
          const targetReps = Number.parseInt(e.reps, 10) || 10;
          return { id: uid(), workoutId: id, name: e.name, order: i, targetSets: e.sets, targetReps: e.reps, sets: Array.from({ length: e.sets }, (_, s) => ({ reps: prev?.sets[s]?.reps ?? targetReps, weightKg: prev?.sets[s]?.weightKg, done: false })) };
        }),
      );
    }
  });
  return id;
}

export const updateExercise = (id: string, sets: import('@/domain/types').WorkoutSet[]) => db.workoutExercises.update(id, { sets });
export const finishWorkout = (id: string, patch: { durationMinutes?: number; distanceKm?: number; notes?: string }) => db.workouts.update(id, { ...patch, completed: true });
export async function deleteWorkout(id: string) {
  await db.transaction('rw', [db.workouts, db.workoutExercises], async () => {
    await db.workouts.delete(id);
    await db.workoutExercises.where('workoutId').equals(id).delete();
  });
}

/** Export/import JSON de toutes les données utilisateur (sauvegarde). */
export async function exportAll(): Promise<string> {
  const tables = ['profile', 'foods', 'recipes', 'recipeIngredients', 'meals', 'mealLogs', 'weightLogs', 'dayLogs', 'workouts', 'workoutExercises', 'favorites', 'shoppingLists', 'shoppingListItems', 'preferences', 'planEntries'] as const;
  const out: Record<string, unknown[]> = {};
  for (const t of tables) {
    const rows = await db.table(t).toArray();
    out[t] = t === 'foods' ? rows.filter((f: Food) => f.source !== 'local') : t === 'recipes' ? rows.filter((r: Recipe) => r.createdByUser) : t === 'recipeIngredients' ? rows.filter((r: RecipeIngredient) => r.recipeId.startsWith('user:')) : rows;
  }
  return JSON.stringify({ app: 'nutriplate', version: 1, exportedAt: new Date().toISOString(), data: out }, null, 2);
}

export async function importAll(json: string): Promise<void> {
  const parsed = JSON.parse(json) as { app?: string; data?: Record<string, unknown[]> };
  if (parsed.app !== 'nutriplate' || !parsed.data) throw new Error('Fichier non reconnu');
  const data = parsed.data;
  await db.transaction('rw', db.tables, async () => {
    for (const [name, rows] of Object.entries(data)) {
      if (!Array.isArray(rows)) continue;
      const table = db.tables.find((t) => t.name === name);
      if (table) await table.bulkPut(rows);
    }
  });
}

export const totalsOf = (logs: MealLog[]) => sumMacros(logs.map((l) => l.macros));
