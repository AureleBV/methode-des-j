import type { Macros } from './types';

/**
 * Indicateur de satiété ESTIMÉ (1 à 5) à partir de la composition :
 * densité énergétique (kcal / 100 g), part de protéines, fibres.
 * Ce n'est pas une mesure scientifique, juste une heuristique lisible.
 */
export function satietyScore(macros: Macros, totalGrams: number): 1 | 2 | 3 | 4 | 5 {
  if (totalGrams <= 0 || macros.kcal <= 0) return 3;
  const density = (macros.kcal / totalGrams) * 100; // kcal pour 100 g
  const proteinShare = (macros.protein * 4) / macros.kcal; // part des kcal
  const fiberPer100 = ((macros.fiber ?? 0) / totalGrams) * 100;

  let score = 0;
  if (density < 100) score += 2.2;
  else if (density < 130) score += 1.7;
  else if (density < 180) score += 1.2;
  else if (density < 250) score += 0.6;
  else score += 0.1;

  if (proteinShare > 0.35) score += 1.6;
  else if (proteinShare > 0.25) score += 1.2;
  else if (proteinShare > 0.15) score += 0.7;
  else score += 0.2;

  if (fiberPer100 > 3) score += 0.8;
  else if (fiberPer100 > 1.5) score += 0.4;

  // Volume absolu : une grosse assiette rassasie plus qu'une petite.
  if (totalGrams > 500) score += 0.6;
  else if (totalGrams > 350) score += 0.3;

  const rounded = Math.round(Math.min(5, Math.max(1, score)));
  return rounded as 1 | 2 | 3 | 4 | 5;
}

export function satietyLabel(score: number): string {
  if (score >= 5) return 'Très rassasiant';
  if (score >= 4) return 'Rassasiant';
  if (score >= 3) return 'Correct';
  if (score >= 2) return 'Léger';
  return 'Très léger';
}

export function satietyFlames(score: number): string {
  return '🔥'.repeat(score) + '·'.repeat(5 - score);
}
