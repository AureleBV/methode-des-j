import type { SnackTemplate } from '@/domain/planner';

/** Collations proposées par "J'ai faim maintenant" (voir suggestSnacks). */
export const SEED_SNACKS: SnackTemplate[] = [
  { id: 'apple', name: 'Une pomme', emoji: '🍎', hunger: ['low'], items: [{ foodId: 'apple', grams: 150 }], tags: [] },
  { id: 'clementines', name: '2 clémentines', emoji: '🍊', hunger: ['low'], items: [{ foodId: 'clementine', grams: 120 }], tags: [] },
  { id: 'yogurt', name: 'Un yaourt nature', emoji: '🥛', hunger: ['low'], items: [{ foodId: 'yogurt', grams: 125 }], tags: [] },
  { id: 'compote', name: 'Une compote', emoji: '🍏', hunger: ['low'], items: [{ foodId: 'compote', grams: 100 }], tags: [] },
  { id: 'choc_coffee', name: '2 carrés de chocolat noir', emoji: '🍫', hunger: ['low'], items: [{ foodId: 'dark_chocolate', grams: 20 }], tags: ['plaisir'] },
  { id: 'fb_small', name: 'Fromage blanc 0 %', emoji: '🥣', hunger: ['low', 'medium'], items: [{ foodId: 'fromage_blanc_0', grams: 200 }], tags: ['proteine'] },
  { id: 'skyr_banana', name: 'Skyr + banane', emoji: '🍌', hunger: ['medium'], items: [{ foodId: 'skyr', grams: 200 }, { foodId: 'banana', grams: 120 }], tags: ['proteine'] },
  { id: 'apple_almonds', name: 'Pomme + amandes', emoji: '🌰', hunger: ['medium'], items: [{ foodId: 'apple', grams: 150 }, { foodId: 'almonds', grams: 20 }], tags: [] },
  { id: 'fb_berries', name: 'Fromage blanc, fruits rouges, miel', emoji: '🍓', hunger: ['medium'], items: [{ foodId: 'fromage_blanc_0', grams: 200 }, { foodId: 'frozen_berries', grams: 100 }, { foodId: 'honey', grams: 10 }], tags: ['proteine'] },
  { id: 'protein_bar', name: 'Barre protéinée', emoji: '🍫', hunger: ['medium'], items: [{ foodId: 'protein_bar', grams: 50 }], tags: ['proteine'] },
  { id: 'bread_ham', name: 'Pain + jambon', emoji: '🥖', hunger: ['medium'], items: [{ foodId: 'bread', grams: 50 }, { foodId: 'ham', grams: 50 }], tags: ['proteine'] },
  { id: 'eggs_apple', name: '2 œufs durs + pomme', emoji: '🥚', hunger: ['medium'], items: [{ foodId: 'egg', grams: 110 }, { foodId: 'apple', grams: 150 }], tags: ['proteine'] },
  { id: 'greek_choc', name: 'Yaourt grec + chocolat noir', emoji: '🍫', hunger: ['medium'], items: [{ foodId: 'greek_yogurt_0', grams: 150 }, { foodId: 'dark_chocolate', grams: 15 }], tags: ['plaisir', 'proteine'] },
  { id: 'popcorn', name: 'Grand bol de popcorn nature', emoji: '🍿', hunger: ['medium'], items: [{ foodId: 'popcorn', grams: 30 }], tags: ['volume'] },
  { id: 'big_skyr_fruits', name: '2 pommes + skyr + banane', emoji: '🍎', hunger: ['high'], items: [{ foodId: 'apple', grams: 300 }, { foodId: 'skyr', grams: 300 }, { foodId: 'banana', grams: 120 }], tags: ['proteine', 'volume'] },
  { id: 'porridge_snack', name: 'Porridge banane', emoji: '🥣', hunger: ['high'], items: [{ foodId: 'oats', grams: 50 }, { foodId: 'milk_semi', grams: 250 }, { foodId: 'banana', grams: 100 }], tags: [] },
  { id: 'bread_ham_cheese', name: 'Pain, jambon, fromage', emoji: '🥪', hunger: ['high'], items: [{ foodId: 'bread', grams: 80 }, { foodId: 'ham', grams: 80 }, { foodId: 'gruyere', grams: 20 }], tags: ['proteine'] },
  { id: 'smoothie', name: 'Smoothie protéiné', emoji: '🥤', hunger: ['high'], items: [{ foodId: 'milk_semi', grams: 250 }, { foodId: 'banana', grams: 120 }, { foodId: 'whey', grams: 30 }], tags: ['proteine'] },
  { id: 'wrap_tuna_snack', name: 'Wrap thon express', emoji: '🌯', hunger: ['high'], items: [{ foodId: 'tortilla_wrap', grams: 60 }, { foodId: 'tuna_can', grams: 110 }, { foodId: 'mayo_light', grams: 15 }], tags: ['proteine'] },
  { id: 'eggs_toast', name: '3 œufs brouillés + pain', emoji: '🍳', hunger: ['high'], items: [{ foodId: 'egg', grams: 165 }, { foodId: 'wholemeal_bread', grams: 50 }], tags: ['proteine'] },
  { id: 'fb_oats_honey', name: 'Grand fromage blanc, flocons, miel', emoji: '🍯', hunger: ['high'], items: [{ foodId: 'fromage_blanc_0', grams: 300 }, { foodId: 'oats', grams: 40 }, { foodId: 'honey', grams: 10 }], tags: ['proteine', 'volume'] },
  { id: 'protein_pudding', name: 'Dessert protéiné + fruit', emoji: '🍮', hunger: ['medium'], items: [{ foodId: 'protein_pudding', grams: 200 }, { foodId: 'apple', grams: 150 }], tags: ['proteine'] },
];
