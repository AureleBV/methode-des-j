/** Préréglages Air Fryer : base de calcul (aliment) + température/temps indicatifs. */
export interface AirfryerPreset {
  id: string;
  name: string;
  emoji: string;
  foodId: string;
  defaultGrams: number;
  tempC: number;
  minutes: [number, number];
  oilGramsDefault: number;
  notes: string;
}

export const AIRFRYER_PRESETS: AirfryerPreset[] = [
  { id: 'fries', name: 'Frites maison', emoji: '🍟', foodId: 'potato', defaultGrams: 300, tempC: 200, minutes: [18, 22], oilGramsDefault: 8, notes: 'Rince et sèche bien les frites avant. Secoue le panier à mi-cuisson.' },
  { id: 'frozen_fries', name: 'Frites surgelées', emoji: '🍟', foodId: 'frozen_fries', defaultGrams: 200, tempC: 200, minutes: [14, 18], oilGramsDefault: 0, notes: 'Déjà pré-frites : aucune huile nécessaire.' },
  { id: 'potato_cubes', name: 'Pommes de terre en cubes', emoji: '🥔', foodId: 'potato', defaultGrams: 300, tempC: 200, minutes: [18, 20], oilGramsDefault: 8, notes: 'Cubes de 2 cm, herbes, paprika.' },
  { id: 'sweet_potato', name: 'Patate douce', emoji: '🍠', foodId: 'sweet_potato', defaultGrams: 250, tempC: 200, minutes: [15, 18], oilGramsDefault: 5, notes: 'Cuit plus vite que la pomme de terre.' },
  { id: 'chicken', name: 'Blanc de poulet', emoji: '🍗', foodId: 'chicken_breast', defaultGrams: 150, tempC: 190, minutes: [14, 18], oilGramsDefault: 3, notes: 'Épices + un filet d’huile pour ne pas sécher. Retourne à mi-cuisson.' },
  { id: 'chicken_thigh', name: 'Hauts de cuisse', emoji: '🍗', foodId: 'chicken_thigh', defaultGrams: 200, tempC: 190, minutes: [18, 22], oilGramsDefault: 0, notes: 'Plus juteux que le blanc, sans huile.' },
  { id: 'nuggets', name: 'Nuggets', emoji: '🍗', foodId: 'chicken_nuggets', defaultGrams: 150, tempC: 190, minutes: [10, 12], oilGramsDefault: 0, notes: 'Sans huile, directement surgelés.' },
  { id: 'burger', name: 'Steak haché / burger', emoji: '🍔', foodId: 'ground_beef_5', defaultGrams: 150, tempC: 200, minutes: [7, 10], oilGramsDefault: 0, notes: '7 min saignant, 10 min bien cuit.' },
  { id: 'salmon', name: 'Pavé de saumon', emoji: '🍣', foodId: 'salmon', defaultGrams: 130, tempC: 180, minutes: [9, 11], oilGramsDefault: 0, notes: 'Citron, aneth. Ne pas trop cuire.' },
  { id: 'veg', name: 'Légumes rôtis', emoji: '🥦', foodId: 'frozen_veg_mix', defaultGrams: 250, tempC: 190, minutes: [12, 15], oilGramsDefault: 5, notes: 'Brocoli, courgette, poivron, chou-fleur… un peu d’huile pour dorer.' },
  { id: 'wrap', name: 'Wrap croustillant', emoji: '🌯', foodId: 'tortilla_wrap', defaultGrams: 60, tempC: 190, minutes: [6, 8], oilGramsDefault: 0, notes: 'Pliure dessous, garniture déjà cuite.' },
  { id: 'croque', name: 'Croque-monsieur', emoji: '🥪', foodId: 'wholemeal_bread', defaultGrams: 70, tempC: 180, minutes: [6, 8], oilGramsDefault: 0, notes: 'Pas besoin de beurre.' },
  { id: 'cordon', name: 'Cordon bleu', emoji: '🍽️', foodId: 'cordon_bleu', defaultGrams: 100, tempC: 190, minutes: [11, 13], oilGramsDefault: 0, notes: 'Surgelé ou frais, sans huile.' },
];

export const OIL_NOTE =
  'L’huile pèse lourd : chaque cuillère à café (5 g) ajoute ~45 kcal. À l’Air Fryer, 5 à 10 g suffisent pour 300 g de frites, là où une friture en absorbe 30 à 40 g.';
