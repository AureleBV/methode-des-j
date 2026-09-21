import { db } from '@/db';

/**
 * Analyse d'une photo d'assiette. Deux fournisseurs, au choix dans Profil :
 *  - 'local'  : modèle MobileNet exécuté DANS le navigateur (TensorFlow.js).
 *               Gratuit, aucune image envoyée nulle part. Reconnaissance
 *               approximative (classes génériques), l'utilisateur confirme.
 *  - 'gemini' : API Google Gemini avec la clé de l'utilisateur (offre
 *               gratuite chez Google). Meilleure qualité, mais la photo est
 *               envoyée à Google : jamais activé sans action explicite.
 * Le modèle local est téléchargé une fois (≈ 4 Mo) à la première utilisation.
 */

export type VisionProvider = 'local' | 'gemini';

export interface VisionGuess {
  /** Libellé lisible (FR quand connu). */
  label: string;
  /** Libellé brut du modèle (anglais pour MobileNet). */
  raw: string;
  confidence: number;
  /** Estimation de quantité si le fournisseur la donne (Gemini). */
  grams?: number;
}

export type VisionResult = { ok: true; guesses: VisionGuess[]; provider: VisionProvider } | { ok: false; error: string };

const META_PROVIDER = 'vision.provider';
const META_KEY = 'vision.geminiKey';

export async function getVisionSettings(): Promise<{ provider: VisionProvider; geminiKey: string }> {
  const [p, k] = await Promise.all([db.meta.get(META_PROVIDER), db.meta.get(META_KEY)]);
  return { provider: (p?.value as VisionProvider) === 'gemini' ? 'gemini' : 'local', geminiKey: typeof k?.value === 'string' ? k.value : '' };
}

export async function setVisionSettings(s: { provider: VisionProvider; geminiKey: string }): Promise<void> {
  await db.meta.bulkPut([
    { key: META_PROVIDER, value: s.provider },
    { key: META_KEY, value: s.geminiKey.trim() },
  ]);
}

/* ————— Fournisseur local (TensorFlow.js + MobileNet) ————— */

type MobileNetModel = { classify(img: HTMLImageElement | HTMLCanvasElement, topk?: number): Promise<{ className: string; probability: number }[]> };
let modelPromise: Promise<MobileNetModel> | null = null;

async function loadLocalModel(): Promise<MobileNetModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs');
      await tf.ready();
      const mobilenet = await import('@tensorflow-models/mobilenet');
      // Poids hébergés par TensorFlow (Google Cloud Storage), sans clé.
      return mobilenet.load({ version: 1, alpha: 1.0, modelUrl: 'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_1.0_224/model.json' });
    })().catch((e) => {
      modelPromise = null;
      throw e;
    });
  }
  return modelPromise;
}

export async function classifyLocal(img: HTMLImageElement | HTMLCanvasElement): Promise<VisionGuess[]> {
  const model = await loadLocalModel();
  const preds = await model.classify(img, 5);
  return preds.map((p) => ({ raw: p.className, label: frenchLabel(p.className), confidence: Math.round(p.probability * 100) / 100 }));
}

/* ————— Fournisseur Gemini (clé fournie par l'utilisateur) ————— */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const PROMPT =
  'Tu es un assistant nutrition. Liste les aliments visibles sur cette photo de repas avec une estimation de la quantité en grammes par aliment. Réponds UNIQUEMENT en JSON : {"items":[{"name":"<nom en français>","grams":<nombre>,"confidence":<0-1>}]}. Pas de texte autour.';

export async function classifyGemini(base64Jpeg: string, apiKey: string, fetchImpl: typeof fetch = fetch): Promise<VisionGuess[]> {
  const res = await fetchImpl(`${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/jpeg', data: base64Jpeg } }] }], generationConfig: { temperature: 0.2, responseMimeType: 'application/json' } }),
  });
  if (res.status === 400 || res.status === 403) throw new Error('bad-key');
  if (res.status === 429) throw new Error('quota');
  if (!res.ok) throw new Error('error');
  const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
  return parseGeminiJson(text);
}

export function parseGeminiJson(text: string): VisionGuess[] {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return [];
  try {
    const parsed = JSON.parse(m[0]) as { items?: { name?: string; grams?: number; confidence?: number }[] };
    return (parsed.items ?? [])
      .filter((i) => i.name)
      .map((i) => ({ raw: i.name!, label: i.name!, grams: typeof i.grams === 'number' ? Math.round(i.grams) : undefined, confidence: typeof i.confidence === 'number' ? Math.round(i.confidence * 100) / 100 : 0.5 }));
  } catch {
    return [];
  }
}

/* ————— Point d'entrée ————— */

export async function analyzePhoto(img: HTMLImageElement, base64Jpeg: string): Promise<VisionResult> {
  const settings = await getVisionSettings();
  try {
    if (settings.provider === 'gemini') {
      if (!settings.geminiKey) return { ok: false, error: 'Ajoute ta clé Gemini dans Profil → Analyse photo, ou passe en mode « sur l’appareil ».' };
      return { ok: true, provider: 'gemini', guesses: await classifyGemini(base64Jpeg, settings.geminiKey) };
    }
    return { ok: true, provider: 'local', guesses: await classifyLocal(img) };
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'bad-key') return { ok: false, error: 'Clé Gemini refusée. Vérifie-la dans Profil.' };
    if (msg === 'quota') return { ok: false, error: 'Quota Gemini atteint pour le moment. Réessaie plus tard ou passe en mode local.' };
    return { ok: false, error: settings.provider === 'local' ? 'Impossible de charger le modèle local (connexion nécessaire la première fois).' : 'Analyse impossible pour l’instant.' };
  }
}

/** Correspondance classes ImageNet (MobileNet) → libellés FR et aliments/recettes locaux. */
export const IMAGENET_FOOD_MAP: Record<string, { fr: string; foodIds?: string[]; recipeIds?: string[] }> = {
  pizza: { fr: 'Pizza', foodIds: ['frozen_pizza'], recipeIds: ['pizza_tortilla', 'pizza_maison', 'pizza_surgelee_equilibree'] },
  cheeseburger: { fr: 'Burger', recipeIds: ['burger_maison'] },
  hamburger: { fr: 'Burger', recipeIds: ['burger_maison'] },
  hotdog: { fr: 'Hot-dog', foodIds: ['bread', 'merguez'] },
  'hot dog': { fr: 'Hot-dog', foodIds: ['bread', 'merguez'] },
  carbonara: { fr: 'Pâtes', foodIds: ['pasta_cooked'], recipeIds: ['pates_poulet_parmesan', 'pates_bolo'] },
  burrito: { fr: 'Wrap', recipeIds: ['wrap_poulet', 'wrap_thon'] },
  'French loaf': { fr: 'Pain', foodIds: ['bread'] },
  bagel: { fr: 'Pain / bagel', foodIds: ['bread'] },
  pretzel: { fr: 'Bretzel', foodIds: ['bread'] },
  'meat loaf': { fr: 'Viande hachée', foodIds: ['ground_beef_5'] },
  'mashed potato': { fr: 'Purée', foodIds: ['potato'] },
  guacamole: { fr: 'Guacamole', foodIds: ['hummus'] },
  'ice cream': { fr: 'Glace', foodIds: ['ice_cream'] },
  'ice lolly': { fr: 'Glace', foodIds: ['ice_cream'] },
  trifle: { fr: 'Dessert', foodIds: ['greek_yogurt_0'] },
  'chocolate sauce': { fr: 'Chocolat', foodIds: ['dark_chocolate'] },
  banana: { fr: 'Banane', foodIds: ['banana'] },
  orange: { fr: 'Orange', foodIds: ['orange'] },
  lemon: { fr: 'Citron', foodIds: ['orange'] },
  strawberry: { fr: 'Fraises', foodIds: ['strawberries'] },
  'Granny Smith': { fr: 'Pomme', foodIds: ['apple'] },
  pineapple: { fr: 'Ananas', foodIds: ['orange'] },
  fig: { fr: 'Figue', foodIds: ['pear'] },
  pomegranate: { fr: 'Grenade', foodIds: ['orange'] },
  broccoli: { fr: 'Brocoli', foodIds: ['broccoli'] },
  cauliflower: { fr: 'Chou-fleur', foodIds: ['cauliflower'] },
  zucchini: { fr: 'Courgette', foodIds: ['zucchini'] },
  cucumber: { fr: 'Concombre', foodIds: ['cucumber'] },
  mushroom: { fr: 'Champignons', foodIds: ['mushrooms'] },
  'bell pepper': { fr: 'Poivron', foodIds: ['bell_pepper'] },
  corn: { fr: 'Maïs', foodIds: ['corn_can'] },
  'head cabbage': { fr: 'Chou', foodIds: ['cauliflower'] },
  artichoke: { fr: 'Artichaut', foodIds: ['green_beans'] },
  'butternut squash': { fr: 'Courge', foodIds: ['sweet_potato'] },
  'acorn squash': { fr: 'Courge', foodIds: ['sweet_potato'] },
  'spaghetti squash': { fr: 'Courge', foodIds: ['sweet_potato'] },
  espresso: { fr: 'Café', foodIds: ['coffee'] },
  cup: { fr: 'Boisson chaude', foodIds: ['coffee', 'milk_semi'] },
  'red wine': { fr: 'Vin', foodIds: ['beer'] },
  eggnog: { fr: 'Boisson lactée', foodIds: ['milk_semi'] },
  consomme: { fr: 'Soupe / bouillon', foodIds: ['frozen_veg_mix'] },
  'hot pot': { fr: 'Plat mijoté', recipeIds: ['chili_con_carne', 'riz_curry_poulet_coco'] },
  plate: { fr: 'Assiette (plat)', recipeIds: ['boeuf_pdt_poelee', 'poulet_riz_curry'] },
  dough: { fr: 'Pâte', foodIds: ['pizza_dough'] },
  potpie: { fr: 'Tourte', foodIds: ['pizza_dough'] },
  'French fries': { fr: 'Frites', foodIds: ['frozen_fries', 'potato'] },
  omelette: { fr: 'Omelette', recipeIds: ['omelette_jambon_fromage'] },
};

export function frenchLabel(raw: string): string {
  const first = raw.split(',')[0]!.trim();
  return IMAGENET_FOOD_MAP[first]?.fr ?? first;
}

/** Aliments / recettes locaux suggérés pour une classe brute. */
export function mapGuess(raw: string): { foodIds: string[]; recipeIds: string[] } {
  for (const part of raw.split(',').map((s) => s.trim())) {
    const m = IMAGENET_FOOD_MAP[part];
    if (m) return { foodIds: m.foodIds ?? [], recipeIds: m.recipeIds ?? [] };
  }
  return { foodIds: [], recipeIds: [] };
}
