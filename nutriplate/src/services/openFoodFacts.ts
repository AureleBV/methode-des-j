import { db } from '@/db';
import type { Food, FoodCategory } from '@/domain/types';

/**
 * Intégration Open Food Facts, isolée du reste de l'app.
 * - timeout court, erreurs converties en résultat vide (l'app garde la base locale)
 * - cache IndexedDB (7 jours) pour code-barres et recherches
 * - aucune donnée utilisateur envoyée
 */

const BASE = 'https://world.openfoodfacts.org';
const FIELDS = 'code,product_name,product_name_fr,brands,nutriments,categories_tags,serving_quantity';
const TTL_MS = 7 * 24 * 3600 * 1000;
const TIMEOUT_MS = 6000;

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_fr?: string;
  brands?: string;
  serving_quantity?: number | string;
  categories_tags?: string[];
  nutriments?: Record<string, number | string | undefined>;
}

export type OffResult<T> = { ok: true; data: T; fromCache: boolean } | { ok: false; error: 'offline' | 'not_found' | 'timeout' | 'error' };

function num(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return undefined;
}

function guessCategory(tags: string[] = []): FoodCategory {
  const t = tags.join(' ');
  if (/meat|poultry|charcuterie|jambon|viande/.test(t)) return 'meat';
  if (/fish|seafood|poisson/.test(t)) return 'fish';
  if (/egg|oeuf/.test(t)) return 'egg';
  if (/dairies|yogurt|cheese|fromage|lait|milk/.test(t)) return 'dairy';
  if (/fruit/.test(t) && !/juice|jus/.test(t)) return 'fruit';
  if (/vegetable|legume/.test(t)) return 'vegetable';
  if (/pasta|rice|bread|cereal|potato|pates|riz|pain/.test(t)) return 'starch';
  if (/sauce|condiment|dressing/.test(t)) return 'sauce';
  if (/beverage|boisson|drink|soda|juice/.test(t)) return 'drink';
  if (/dessert|chocolate|biscuit|cake|sweet|confiser/.test(t)) return 'dessert';
  if (/snack|chips|crisps|nuts/.test(t)) return 'snack';
  if (/oil|huile|fat|beurre|butter/.test(t)) return 'fat';
  return 'other';
}

/** Convertit un produit OFF en aliment local. Retourne null si les macros manquent. */
export function mapProduct(p: OffProduct): Food | null {
  const n = p.nutriments ?? {};
  const kcal = num(n['energy-kcal_100g']) ?? (num(n['energy_100g']) !== undefined ? Math.round(num(n['energy_100g'])! / 4.184) : undefined);
  const protein = num(n['proteins_100g']);
  const carbs = num(n['carbohydrates_100g']);
  const fat = num(n['fat_100g']);
  if (kcal === undefined || protein === undefined || carbs === undefined || fat === undefined) return null;
  const name = (p.product_name_fr || p.product_name || '').trim();
  if (!name || !p.code) return null;
  const serving = num(p.serving_quantity);
  const tags: string[] = [];
  const cats = p.categories_tags ?? [];
  if (cats.some((c) => /gluten/.test(c))) tags.push('gluten');
  return {
    id: `off:${p.code}`,
    name,
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    category: guessCategory(cats),
    per100: { kcal: Math.round(kcal), protein, carbs, fat, fiber: num(n['fiber_100g']) ?? 0 },
    portions: serving ? [{ label: '1 portion', grams: serving }] : [],
    tags,
    source: 'off',
    barcode: p.code,
    defaultGrams: serving ?? 100,
  };
}

async function fetchJson(url: string, fetchImpl: typeof fetch): Promise<OffResult<unknown>> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, error: 'offline' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (res.status === 404) return { ok: false, error: 'not_found' };
    if (!res.ok) return { ok: false, error: 'error' };
    return { ok: true, data: await res.json(), fromCache: false };
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    clearTimeout(timer);
  }
}

async function cached(key: string): Promise<Food[] | null> {
  try {
    const hit = await db.offCache.where('key').startsWith(key + '#').toArray();
    const fresh = hit.filter((h) => Date.now() - h.fetchedAt < TTL_MS);
    if (fresh.length === 0) return null;
    return fresh.map((h) => h.food);
  } catch {
    return null;
  }
}

async function store(key: string, foods: Food[]): Promise<void> {
  try {
    await db.offCache.bulkPut(foods.map((f, i) => ({ key: `${key}#${i}`, food: f, fetchedAt: Date.now() })));
  } catch {
    /* le cache est optionnel */
  }
}

export async function lookupBarcode(code: string, fetchImpl: typeof fetch = fetch): Promise<OffResult<Food>> {
  const clean = code.replace(/\D/g, '');
  if (!clean) return { ok: false, error: 'not_found' };
  const local = await db.foods.where('barcode').equals(clean).first();
  if (local) return { ok: true, data: local, fromCache: true };
  const c = await cached(`barcode:${clean}`);
  if (c?.[0]) return { ok: true, data: c[0], fromCache: true };
  const r = await fetchJson(`${BASE}/api/v2/product/${clean}.json?fields=${FIELDS}`, fetchImpl);
  if (!r.ok) return r;
  const body = r.data as { status?: number; product?: OffProduct };
  if (!body.product || body.status === 0) return { ok: false, error: 'not_found' };
  const food = mapProduct(body.product);
  if (!food) return { ok: false, error: 'not_found' };
  await store(`barcode:${clean}`, [food]);
  return { ok: true, data: food, fromCache: false };
}

export async function searchProducts(query: string, fetchImpl: typeof fetch = fetch): Promise<OffResult<Food[]>> {
  const q = query.trim().toLowerCase();
  if (q.length < 3) return { ok: true, data: [], fromCache: true };
  const c = await cached(`search:${q}`);
  if (c) return { ok: true, data: c, fromCache: true };
  const url = `${BASE}/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=${FIELDS}&lc=fr`;
  const r = await fetchJson(url, fetchImpl);
  if (!r.ok) return r;
  const body = r.data as { products?: OffProduct[] };
  const foods = (body.products ?? []).map(mapProduct).filter((f): f is Food => f !== null);
  await store(`search:${q}`, foods);
  return { ok: true, data: foods, fromCache: false };
}

export const OFF_ERROR_LABELS: Record<Exclude<OffResult<never>, { ok: true }>['error'], string> = {
  offline: 'Hors ligne : seule la base locale est disponible.',
  not_found: 'Produit introuvable sur Open Food Facts.',
  timeout: 'Open Food Facts met trop de temps à répondre. Réessaie plus tard.',
  error: 'Impossible de joindre Open Food Facts pour l’instant.',
};
