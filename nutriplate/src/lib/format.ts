import { addDays, today } from '@/domain/weight';

export const kcal = (v: number) => `${Math.round(v)} kcal`;
export const g = (v: number, digits = 0) => `${digits ? v.toFixed(digits) : Math.round(v)} g`;
export const pct = (a: number, b: number) => (b <= 0 ? 0 : Math.min(100, Math.round((a / b) * 100)));

const DAY_NAMES = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function dateLabel(date: string, opts: { short?: boolean; relative?: boolean } = {}): string {
  if (opts.relative !== false) {
    const t = today();
    if (date === t) return "Aujourd'hui";
    if (date === addDays(t, -1)) return 'Hier';
    if (date === addDays(t, 1)) return 'Demain';
  }
  const d = new Date(date + 'T00:00:00');
  const names = opts.short ? DAY_SHORT : DAY_NAMES;
  return `${names[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function dayShort(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return DAY_SHORT[d.getDay()] ?? '';
}

export function dayNumber(date: string): number {
  return new Date(date + 'T00:00:00').getDate();
}

/** Lundi de la semaine contenant `date`. */
export function mondayOf(date: string): string {
  const d = new Date(date + 'T00:00:00');
  const delta = (d.getDay() + 6) % 7;
  return addDays(date, -delta);
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
