import type { WeightLog } from './types';

/** Utilitaires de suivi du poids : moyenne mobile, tendance, plateau. */

export function sortByDate<T extends { date: string }>(logs: T[]): T[] {
  return [...logs].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** Moyenne des pesées sur les N derniers jours à partir de `endDate`. */
export function averageOver(logs: WeightLog[], endDate: string, days: number): number | null {
  const start = addDays(endDate, -(days - 1));
  const inRange = logs.filter((l) => l.date >= start && l.date <= endDate);
  if (inRange.length === 0) return null;
  return round1(inRange.reduce((s, l) => s + l.kg, 0) / inRange.length);
}

export function addDays(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function today(): string {
  return toISODate(new Date());
}

export const round1 = (v: number) => Math.round(v * 10) / 10;

/** Série de moyennes mobiles 7 jours (une valeur par pesée). */
export function movingAverage(logs: WeightLog[], window = 7): { date: string; kg: number; avg: number }[] {
  const sorted = sortByDate(logs);
  return sorted.map((l) => ({ date: l.date, kg: l.kg, avg: averageOver(sorted, l.date, window) ?? l.kg }));
}

export interface WeightSummary {
  latest: WeightLog | null;
  avg7: number | null;
  change30: number | null;
  changeSinceStart: number | null;
  /** Variation hebdo moyenne (kg/semaine) sur les 3 dernières semaines, calculée sur moyennes mobiles. */
  weeklyTrend: number | null;
}

export function weightSummary(logs: WeightLog[]): WeightSummary {
  const sorted = sortByDate(logs);
  const latest = sorted.at(-1) ?? null;
  if (!latest) return { latest: null, avg7: null, change30: null, changeSinceStart: null, weeklyTrend: null };
  const first = sorted[0]!;
  const avg7 = averageOver(sorted, latest.date, 7);
  const avgPast30 = averageOver(sorted, addDays(latest.date, -30), 7);
  const change30 = avg7 !== null && avgPast30 !== null ? round1(avg7 - avgPast30) : null;
  const changeSinceStart = daysBetween(first.date, latest.date) >= 1 ? round1(latest.kg - first.kg) : null;
  const avgPast21 = averageOver(sorted, addDays(latest.date, -21), 7);
  const weeklyTrend = avg7 !== null && avgPast21 !== null ? round1((avg7 - avgPast21) / 3) : null;
  return { latest, avg7, change30, changeSinceStart, weeklyTrend };
}

/**
 * Détecte un plateau : moyenne 7 j quasi stable (variation < 0,3 kg) sur
 * au moins `minWeeks` semaines consécutives, avec une pesée récente.
 */
export function detectPlateau(logs: WeightLog[], minWeeks = 3): { plateau: boolean; weeks: number } {
  const sorted = sortByDate(logs);
  const latest = sorted.at(-1);
  if (!latest || sorted.length < 6) return { plateau: false, weeks: 0 };
  const current = averageOver(sorted, latest.date, 7);
  if (current === null) return { plateau: false, weeks: 0 };
  let weeks = 0;
  for (let w = 1; w <= 12; w++) {
    const past = averageOver(sorted, addDays(latest.date, -7 * w), 7);
    if (past === null) break;
    if (Math.abs(past - current) < 0.3) weeks = w;
    else break;
  }
  return { plateau: weeks >= minWeeks, weeks };
}

export const WEIGHT_VARIATION_NOTE =
  'Ton poids varie d’un jour à l’autre à cause de l’eau, du sel, des glucides, du contenu digestif… Seule la moyenne sur 7 jours donne la tendance.';
