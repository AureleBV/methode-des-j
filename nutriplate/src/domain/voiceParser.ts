import type { Food } from './types';

/**
 * Transforme une phrase dictée ("150 grammes de poulet, 200 g de riz et une
 * banane") en items {texte, grammes}. Pas d'IA : règles simples, robustes
 * aux tournures courantes en français.
 */

export interface SpokenItem {
  /** Texte de l'aliment tel que dicté, nettoyé. */
  query: string;
  /** Quantité en grammes si exprimée (ou déduite d'une unité), sinon undefined. */
  grams?: number;
  /** Nombre de pièces si exprimé ("deux œufs"). */
  count?: number;
  /** Unité de pièce reconnue ('tranche', 'pot', 'verre'…). */
  unit?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, quinze: 15, vingt: 20, trente: 30, cinquante: 50, cent: 100, 'cent cinquante': 150, 'deux cents': 200, 'deux cent cinquante': 250, 'trois cents': 300, demi: 0.5, 'une demi': 0.5, 'un demi': 0.5,
};

const PIECE_UNITS = ['tranche', 'tranches', 'pot', 'pots', 'verre', 'verres', 'bol', 'bols', 'cuillere', 'cuilleres', 'cuillère', 'cuillères', 'portion', 'portions', 'boite', 'boîte', 'boites', 'boîtes', 'sachet', 'sachets', 'canette', 'canettes', 'carre', 'carré', 'carres', 'carrés', 'poignee', 'poignée', 'boule', 'boules'];

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toNumber(token: string): number | undefined {
  const n = Number(token.replace(',', '.'));
  if (Number.isFinite(n)) return n;
  return NUMBER_WORDS[token];
}

/** Découpe la phrase en segments (virgules, "et", "plus", "avec"). */
function segments(text: string): string[] {
  return text
    .replace(/(\d),(\d)/g, '$1.$2') // virgule décimale ("0,5 kg") ≠ séparateur
    .split(/,|;| et | plus | avec | puis /)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function parseSpokenMeal(sentence: string): SpokenItem[] {
  const text = normalizeText(sentence)
    .replace(/^(j ai mange|j ai pris|ajoute|ajouter|note|mets|j ai bu)\s+/, '')
    .replace(/\b(a midi|ce matin|ce soir|au petit dejeuner|au dejeuner|au diner|en collation)\b/g, '')
    .trim();
  const out: SpokenItem[] = [];
  for (const seg of segments(text)) {
    const item = parseSegment(seg);
    if (item) out.push(item);
  }
  return out;
}

function parseSegment(seg: string): SpokenItem | null {
  let s = seg.trim();
  if (!s) return null;
  // "150 grammes de poulet" / "150 g de poulet" / "poulet 150 g" / "1,5 kg" / "20 cl de lait"
  const mass = s.match(/(\d+(?:[.,]\d+)?)\s*(g|gr|grammes?|kg|kilos?|ml|cl|l|litres?)\b/);
  if (mass) {
    const n = Number(mass[1]!.replace(',', '.'));
    const unit = mass[2]!;
    const grams = /^(kg|kilos?)$/.test(unit) ? n * 1000 : unit === 'cl' ? n * 10 : /^(l|litres?)$/.test(unit) ? n * 1000 : n;
    s = s.replace(mass[0], ' ');
    return { query: cleanQuery(s), grams: Math.round(grams) };
  }
  // "deux oeufs", "une tranche de jambon", "3 pommes", "un yaourt"
  const tokens = s.split(' ');
  const first = tokens[0]!;
  const two = tokens.slice(0, 2).join(' ');
  const count = toNumber(two) ?? toNumber(first);
  if (count !== undefined) {
    const consumed = toNumber(two) !== undefined && two in NUMBER_WORDS ? 2 : 1;
    const rest = tokens.slice(consumed);
    const unitTok = rest[0] && PIECE_UNITS.includes(rest[0]) ? rest[0] : undefined;
    const query = cleanQuery((unitTok ? rest.slice(1) : rest).join(' '));
    return { query: query || (unitTok ?? ''), count, unit: unitTok ? unitTok.replace(/s$/, '') : undefined };
  }
  return { query: cleanQuery(s) };
}

function cleanQuery(s: string): string {
  return s
    .replace(/\b(de|du|des|d|le|la|les|un|une|au|aux|en|et)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Score de correspondance nom d'aliment / requête dictée (0 = aucun). */
export function matchScore(food: Food, query: string): number {
  const q = normalizeText(query);
  if (!q) return 0;
  const name = normalizeText(food.name);
  if (name === q) return 100;
  if (name.startsWith(q)) return 80;
  // Tolère le pluriel dicté ("oeufs", "pommes") face au singulier de la base.
  const words = q.split(' ').filter((w) => w.length > 2).map((w) => w.replace(/(s|x)$/, ''));
  const has = (w: string) => name.includes(w);
  if (words.length && words.every(has)) return 60 + Math.min(19, words.length * 5) - Math.min(20, Math.floor(name.length / 8));
  if (words.some(has)) return 30;
  return 0;
}

/** Meilleur aliment local pour un item dicté (préférence aux aliments de base, hors OFF). */
export function bestFoodMatch(item: SpokenItem, foods: Food[]): Food | undefined {
  const ranked = foods
    // Aliments de base d'abord, version cuite pour les féculents, noms courts en cas d'égalité.
    .map((f) => ({ f, s: matchScore(f, item.query) + (f.source === 'local' ? 5 : 0) + (/cuit/i.test(f.name) ? 2 : 0) - f.name.length / 100 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  return ranked[0]?.f;
}

/** Grammes à enregistrer pour un item dicté, à partir de l'aliment choisi. */
export function gramsFor(item: SpokenItem, food: Food): number {
  if (item.grams) return item.grams;
  if (item.count) {
    const unitPortion = item.unit ? food.portions?.find((p) => normalizeText(p.label).includes(normalizeText(item.unit!))) : undefined;
    const piece = unitPortion ?? food.portions?.[0];
    return Math.round(item.count * (piece?.grams ?? food.defaultGrams ?? 100));
  }
  return food.defaultGrams ?? 100;
}
