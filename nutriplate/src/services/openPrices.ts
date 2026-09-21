import { db } from '@/db';

/**
 * Open Prices (prices.openfoodfacts.org) : prix relevés par la communauté,
 * lecture libre sans clé. Seul le code-barres est envoyé. Cache 24 h.
 */
const BASE = 'https://prices.openfoodfacts.org/api/v1';
const TTL_MS = 24 * 3600 * 1000;
const TIMEOUT_MS = 6000;

export interface PriceStats {
  /** Prix moyen en € pour l'unité de vente (pack). */
  avgEur: number;
  minEur: number;
  maxEur: number;
  count: number;
  /** Prix moyen au kilo si la quantité produit est connue. */
  avgPerKg?: number;
  lastDate?: string;
  stores: string[];
}

interface OffPrice {
  price?: number;
  currency?: string;
  date?: string;
  location?: { osm_name?: string; osm_brand?: string } | null;
  product?: { product_quantity?: number; product_quantity_unit?: string } | null;
}

export type PriceResult = { ok: true; data: PriceStats | null; fromCache: boolean } | { ok: false; error: 'offline' | 'timeout' | 'error' };

export function summarizePrices(items: OffPrice[]): PriceStats | null {
  const eur = items.filter((p) => typeof p.price === 'number' && (p.currency ?? 'EUR') === 'EUR');
  if (eur.length === 0) return null;
  const prices = eur.map((p) => p.price!);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const qty = eur.find((p) => p.product?.product_quantity && /g|ml/i.test(p.product.product_quantity_unit ?? 'g'))?.product?.product_quantity;
  const stores = [...new Set(eur.map((p) => p.location?.osm_brand || p.location?.osm_name || '').filter(Boolean))].slice(0, 5);
  const dates = eur.map((p) => p.date ?? '').filter(Boolean).sort();
  return {
    avgEur: round2(avg),
    minEur: round2(Math.min(...prices)),
    maxEur: round2(Math.max(...prices)),
    count: eur.length,
    avgPerKg: qty ? round2((avg / qty) * 1000) : undefined,
    lastDate: dates.at(-1),
    stores,
  };
}

const round2 = (v: number) => Math.round(v * 100) / 100;

export async function fetchPriceStats(barcode: string, fetchImpl: typeof fetch = fetch): Promise<PriceResult> {
  const code = barcode.replace(/\D/g, '');
  if (!code) return { ok: true, data: null, fromCache: true };
  const key = `openprices:${code}`;
  try {
    const cached = await db.meta.get(key);
    if (cached && typeof cached.value === 'string') {
      const parsed = JSON.parse(cached.value) as { fetchedAt: number; data: PriceStats | null };
      if (Date.now() - parsed.fetchedAt < TTL_MS) return { ok: true, data: parsed.data, fromCache: true };
    }
  } catch {
    /* cache optionnel */
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, error: 'offline' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl(`${BASE}/prices?product_code=${code}&size=50&order_by=-date`, { signal: ctrl.signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return { ok: false, error: 'error' };
    const body = (await res.json()) as { items?: OffPrice[] };
    const data = summarizePrices(body.items ?? []);
    try {
      await db.meta.put({ key, value: JSON.stringify({ fetchedAt: Date.now(), data }) });
    } catch {
      /* cache optionnel */
    }
    return { ok: true, data, fromCache: false };
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'AbortError' ? 'timeout' : 'error' };
  } finally {
    clearTimeout(timer);
  }
}
