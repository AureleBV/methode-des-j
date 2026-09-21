import { db } from '@/db';

/**
 * Magasins à proximité via Overpass (OpenStreetMap). Gratuit, sans clé.
 * Seule une position arrondie (~100 m) est envoyée. Cache 1 h.
 */
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const TTL_MS = 3600 * 1000;
const TIMEOUT_MS = 12000;

export type ShopKind = 'supermarket' | 'convenience' | 'butcher' | 'greengrocer' | 'bakery' | 'frozen_food' | 'deli' | 'cheese' | 'seafood' | 'health_food' | 'farm' | 'marketplace' | 'other';

export interface NearbyShop {
  id: string;
  name: string;
  kind: ShopKind;
  brand?: string;
  lat: number;
  lon: number;
  distanceM: number;
  openingHours?: string;
}

export const SHOP_LABELS: Record<ShopKind, { label: string; emoji: string }> = {
  supermarket: { label: 'Supermarché', emoji: '🛒' },
  convenience: { label: 'Supérette', emoji: '🏪' },
  butcher: { label: 'Boucherie', emoji: '🥩' },
  greengrocer: { label: 'Primeur', emoji: '🥕' },
  bakery: { label: 'Boulangerie', emoji: '🥖' },
  frozen_food: { label: 'Surgelés', emoji: '🧊' },
  deli: { label: 'Traiteur / épicerie fine', emoji: '🧀' },
  cheese: { label: 'Fromagerie', emoji: '🧀' },
  seafood: { label: 'Poissonnerie', emoji: '🐟' },
  health_food: { label: 'Bio / diététique', emoji: '🌱' },
  farm: { label: 'Vente à la ferme', emoji: '🚜' },
  marketplace: { label: 'Marché', emoji: '🏬' },
  other: { label: 'Commerce', emoji: '🏬' },
};

export function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function parseOverpass(elements: OverpassElement[], lat: number, lon: number): NearbyShop[] {
  const out: NearbyShop[] = [];
  for (const el of elements) {
    const p = el.center ?? (el.lat !== undefined && el.lon !== undefined ? { lat: el.lat, lon: el.lon } : undefined);
    if (!p || !el.tags) continue;
    const shop = el.tags.shop;
    const kind: ShopKind = el.tags.amenity === 'marketplace' ? 'marketplace' : shop && shop in SHOP_LABELS ? (shop as ShopKind) : 'other';
    const name = el.tags.name || el.tags.brand || SHOP_LABELS[kind].label;
    out.push({ id: `${el.type}/${el.id}`, name, kind, brand: el.tags.brand, lat: p.lat, lon: p.lon, distanceM: haversineM(lat, lon, p.lat, p.lon), openingHours: el.tags.opening_hours });
  }
  return out.sort((a, b) => a.distanceM - b.distanceM);
}

export function buildQuery(lat: number, lon: number, radiusM: number): string {
  const kinds = 'supermarket|convenience|butcher|greengrocer|bakery|frozen_food|deli|cheese|seafood|health_food|farm';
  return `[out:json][timeout:10];(nwr["shop"~"^(${kinds})$"](around:${radiusM},${lat},${lon});nwr["amenity"="marketplace"](around:${radiusM},${lat},${lon}););out center 60;`;
}

export type ShopsResult = { ok: true; data: NearbyShop[]; fromCache: boolean } | { ok: false; error: 'offline' | 'timeout' | 'error' };

export async function findNearbyShops(lat: number, lon: number, radiusM = 2000, fetchImpl: typeof fetch = fetch): Promise<ShopsResult> {
  // Arrondi ~100 m : suffisant pour les commerces, et moins précis que la position réelle.
  const rl = Math.round(lat * 1000) / 1000;
  const ro = Math.round(lon * 1000) / 1000;
  const key = `overpass:${rl},${ro},${radiusM}`;
  try {
    const cached = await db.meta.get(key);
    if (cached && typeof cached.value === 'string') {
      const parsed = JSON.parse(cached.value) as { fetchedAt: number; data: NearbyShop[] };
      if (Date.now() - parsed.fetchedAt < TTL_MS) return { ok: true, data: parsed.data, fromCache: true };
    }
  } catch {
    /* cache optionnel */
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { ok: false, error: 'offline' };
  let lastError: 'timeout' | 'error' = 'error';
  for (const endpoint of ENDPOINTS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
      const res = await fetchImpl(endpoint, { method: 'POST', body: 'data=' + encodeURIComponent(buildQuery(rl, ro, radiusM)), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
      if (!res.ok) {
        lastError = 'error';
        continue;
      }
      const body = (await res.json()) as { elements?: OverpassElement[] };
      const data = parseOverpass(body.elements ?? [], rl, ro);
      try {
        await db.meta.put({ key, value: JSON.stringify({ fetchedAt: Date.now(), data }) });
      } catch {
        /* cache optionnel */
      }
      return { ok: true, data, fromCache: false };
    } catch (e) {
      lastError = (e as Error).name === 'AbortError' ? 'timeout' : 'error';
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, error: lastError };
}

/** Liens d'itinéraire : geo: (Android), Apple Plans, Google Maps (web). */
export function directionsLinks(shop: NearbyShop) {
  const q = encodeURIComponent(shop.name);
  return {
    geo: `geo:${shop.lat},${shop.lon}?q=${shop.lat},${shop.lon}(${q})`,
    apple: `https://maps.apple.com/?daddr=${shop.lat},${shop.lon}&q=${q}`,
    google: `https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lon}`,
    osm: `https://www.openstreetmap.org/?mlat=${shop.lat}&mlon=${shop.lon}#map=18/${shop.lat}/${shop.lon}`,
  };
}
