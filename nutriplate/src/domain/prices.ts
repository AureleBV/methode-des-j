import type { Food, FoodVariant, PriceRecord } from './types';

/** Prix moyen au kilo à partir des relevés (utilisateur + Open Prices). */
export interface PriceSummary {
  avgPerKg: number;
  count: number;
  lastDate?: string;
  /** Dernier prix relevé (pack) et magasin. */
  last?: PriceRecord;
}

export function summarizeRecords(records: PriceRecord[], fallbackPackGrams?: number): PriceSummary | null {
  const perKg = records
    .map((r) => {
      const pack = r.packGrams ?? fallbackPackGrams;
      return pack ? (r.priceEur / pack) * 1000 : null;
    })
    .filter((v): v is number => v !== null && Number.isFinite(v) && v > 0);
  if (perKg.length === 0) return null;
  const sorted = [...records].sort((a, b) => (a.date < b.date ? -1 : 1));
  return { avgPerKg: Math.round((perKg.reduce((a, b) => a + b, 0) / perKg.length) * 100) / 100, count: perKg.length, lastDate: sorted.at(-1)?.date, last: sorted.at(-1) };
}

/** Coût estimé d'une quantité (g) au prix moyen/kg. */
export function estimateCost(grams: number, avgPerKg: number | undefined): number | null {
  if (!avgPerKg || grams <= 0) return null;
  return Math.round(((grams / 1000) * avgPerKg) * 100) / 100;
}

export function formatEur(v: number): string {
  return `${v.toFixed(2).replace('.', ',')} €`;
}

/** Produit à mettre dans le panier pour un aliment : le préféré, sinon le premier. */
export function preferredVariant(foodId: string, variants: FoodVariant[]): FoodVariant | undefined {
  const mine = variants.filter((v) => v.foodId === foodId);
  return mine.find((v) => v.preferred) ?? mine[0];
}

/** Nombre de packs à acheter pour couvrir `grams`. */
export function packsNeeded(grams: number, variant: FoodVariant | undefined, food?: Food): number | null {
  const pack = variant?.packGrams ?? food?.portions?.find((p) => /pack|paquet|boîte|sachet/i.test(p.label))?.grams;
  if (!pack) return null;
  return Math.max(1, Math.ceil(grams / pack));
}
