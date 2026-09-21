import type { ActivityLevel, Goal, GoalPace, Macros, Sex, Targets, UserProfile } from './types';

/**
 * Calculs énergétiques. Toutes les valeurs sont des ESTIMATIONS
 * (formule de Mifflin-St Jeor pour le métabolisme basal, facteurs d'activité
 * usuels). Elles servent de point de départ et doivent être ajustées
 * avec l'évolution réelle du poids.
 */

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sédentaire (bureau, peu de marche)',
  light: 'Léger (marche quotidienne, debout parfois)',
  moderate: 'Modéré (actif la journée)',
  active: 'Actif (métier physique)',
  very_active: 'Très actif (physique + sport intense)',
};

export const PACE_LABELS: Record<GoalPace, { label: string; hint: string }> = {
  douce: { label: 'Douce', hint: '≈ -200 à -350 kcal · perte lente, faim minimale' },
  moderee: { label: 'Modérée', hint: '≈ -250 à -550 kcal · le bon compromis' },
  soutenue: { label: 'Soutenue', hint: '≈ -400 à -650 kcal · plus rapide, demande de la rigueur' },
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: 'Perte de poids',
  recomp: 'Recomposition corporelle',
  maintain: 'Maintien',
  gain: 'Prise de muscle',
};

/** Métabolisme basal (Mifflin-St Jeor). */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * Dépense énergétique totale estimée. Le facteur d'activité couvre la vie
 * quotidienne ; les séances de sport ajoutent un petit bonus (~+3,5 % par
 * séance hebdo, plafonné à 6 séances) plutôt qu'un gros multiplicateur,
 * pour éviter de surestimer.
 */
export function tdee(bmrValue: number, activity: ActivityLevel, sessionsPerWeek: number): number {
  const sport = Math.min(Math.max(sessionsPerWeek, 0), 6) * 0.035;
  return Math.round(bmrValue * (ACTIVITY_FACTOR[activity] + sport));
}

/** Plancher calorique sous lequel l'app ne descend jamais par défaut. */
export function kcalFloor(sex: Sex, bmrValue: number): number {
  const absolute = sex === 'male' ? 1500 : 1300;
  return Math.max(absolute, Math.round(bmrValue * 1.05));
}

/**
 * Déficit/surplus cible en kcal/jour.
 * - perte : ~15 % de la dépense, borné entre 250 et 550 kcal (jamais extrême)
 * - recomposition : ~8 %, borné 150-300
 * - maintien : 0
 * - prise de muscle : +8 %, borné 150-300
 * En mode "douceur" (signaux de rapport compliqué à la nourriture), on
 * plafonne le déficit à 200 kcal.
 */
export function goalDelta(goal: Goal, tdeeValue: number, gentleMode = false, pace: GoalPace = 'moderee'): number {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  let delta = 0;
  switch (goal) {
    case 'lose': {
      // Rythme choisi par l'utilisateur, toujours dans une fourchette raisonnable.
      const [pct, lo, hi] = pace === 'douce' ? [0.1, 200, 350] : pace === 'soutenue' ? [0.2, 400, 650] : [0.15, 250, 550];
      delta = -clamp(Math.round(tdeeValue * pct), lo, hi);
      break;
    }
    case 'recomp':
      delta = -clamp(Math.round(tdeeValue * 0.08), 150, 300);
      break;
    case 'maintain':
      delta = 0;
      break;
    case 'gain':
      delta = clamp(Math.round(tdeeValue * 0.08), 150, 300);
      break;
  }
  if (gentleMode && delta < -200) delta = -200;
  return delta;
}

/**
 * Poids de référence pour les protéines : si l'IMC dépasse 30, on utilise un
 * poids ajusté pour ne pas gonfler artificiellement l'objectif.
 */
export function proteinReferenceWeight(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  if (bmi <= 30) return weightKg;
  const idealAt25 = 25 * h * h;
  return idealAt25 + (weightKg - idealAt25) * 0.4;
}

export interface TargetInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  sessionsPerWeek: number;
  goal: Goal;
  kcalAdjustment?: number;
  gentleMode?: boolean;
  pace?: GoalPace;
  proteinPerKg?: number;
}

/** Calcule l'ensemble des objectifs (kcal + macros). */
export function computeTargets(input: TargetInput): Targets {
  const b = bmr(input.sex, input.weightKg, input.heightCm, input.age);
  const t = tdee(b, input.activity, input.sessionsPerWeek);
  const delta = goalDelta(input.goal, t, input.gentleMode, input.pace);
  const floor = kcalFloor(input.sex, b);
  let kcal = t + delta + (input.kcalAdjustment ?? 0);
  if (kcal < floor) kcal = floor;
  kcal = Math.round(kcal / 10) * 10;

  const refWeight = proteinReferenceWeight(input.weightKg, input.heightCm);
  const proteinPerKg = Math.min(2.4, Math.max(1.2, input.proteinPerKg ?? (input.goal === 'maintain' ? 1.6 : 1.8)));
  const protein = Math.round(refWeight * proteinPerKg);

  // Lipides : ~28 % des kcal, jamais sous 0,7 g/kg (hormones, satiété).
  const fat = Math.max(Math.round((kcal * 0.28) / 9), Math.round(refWeight * 0.7));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return { bmr: b, tdee: t, kcal, protein, carbs, fat, delta: kcal - t };
}

export function targetsForProfile(p: UserProfile): Targets {
  return computeTargets({
    sex: p.sex,
    age: p.age,
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    activity: p.activity,
    sessionsPerWeek: p.sessionsPerWeek,
    goal: p.goal,
    kcalAdjustment: p.kcalAdjustment,
    gentleMode: p.gentleMode,
    pace: p.pace,
    proteinPerKg: p.proteinPerKg,
  });
}

/** Macros d'une quantité donnée à partir des valeurs pour 100 g. */
export function macrosForGrams(per100: Macros, grams: number): Macros {
  const f = grams / 100;
  const r = (v: number) => Math.round(v * f * 10) / 10;
  return {
    kcal: Math.round(per100.kcal * f),
    protein: r(per100.protein),
    carbs: r(per100.carbs),
    fat: r(per100.fat),
    fiber: per100.fiber !== undefined ? r(per100.fiber) : undefined,
  };
}

export function sumMacros(list: Macros[]): Macros {
  const total: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  for (const m of list) {
    total.kcal += m.kcal;
    total.protein += m.protein;
    total.carbs += m.carbs;
    total.fat += m.fat;
    total.fiber = (total.fiber ?? 0) + (m.fiber ?? 0);
  }
  return {
    kcal: Math.round(total.kcal),
    protein: Math.round(total.protein * 10) / 10,
    carbs: Math.round(total.carbs * 10) / 10,
    fat: Math.round(total.fat * 10) / 10,
    fiber: Math.round((total.fiber ?? 0) * 10) / 10,
  };
}

export const EMPTY_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

/**
 * Message de progression du jour, volontairement non culpabilisant.
 * On ne parle jamais "d'échec" : un léger dépassement est normal.
 */
export function dayFeedback(consumedKcal: number, targetKcal: number, mealsLeft: number): string {
  const ratio = consumedKcal / targetKcal;
  if (consumedKcal === 0) return 'Journée vierge, bon appétit 🙂';
  if (ratio < 0.5) return mealsLeft > 0 ? 'Bien parti, il reste de la place' : 'Journée légère, pense à manger à ta faim';
  if (ratio < 0.9) return 'Tu es dans les clous 👌';
  if (ratio <= 1.15) return 'Objectif presque atteint 👍';
  if (ratio <= 1.25) return 'Un peu au-dessus, ça arrive : demain est un autre jour';
  return 'Journée plus copieuse. Aucune compensation nécessaire, on reprend le rythme tranquillement';
}

/**
 * Ajustement hebdomadaire suggéré à partir de l'évolution du poids moyen.
 * Retourne un delta kcal (peut être 0) et une explication. Jamais plus de
 * ±150 kcal d'un coup, et jamais sous le plancher (géré par computeTargets).
 */
export interface AdjustmentAdvice {
  deltaKcal: number;
  reason: string;
}

export function suggestAdjustment(params: {
  goal: Goal;
  weeklyChangeKg: number;
  weightKg: number;
  weeksObserved: number;
  adherenceOk: boolean;
  hungerHigh: boolean;
  gentleMode: boolean;
}): AdjustmentAdvice {
  const { goal, weeklyChangeKg, weightKg, weeksObserved, adherenceOk, hungerHigh, gentleMode } = params;
  if (weeksObserved < 2) return { deltaKcal: 0, reason: 'Pas encore assez de données : on attend au moins 2 semaines de pesées.' };
  if (!adherenceOk) return { deltaKcal: 0, reason: 'Le journal est peu rempli : impossible de savoir si le plan est suivi. On garde les mêmes objectifs.' };
  const pct = (weeklyChangeKg / weightKg) * 100;
  if (goal === 'lose' || goal === 'recomp') {
    const tooFast = pct < -1.0;
    const stalled = pct > -0.15;
    if (tooFast || hungerHigh) return { deltaKcal: 100, reason: tooFast ? 'La perte est rapide (>1 %/semaine). On remonte un peu pour protéger le muscle et l’énergie.' : 'Faim élevée signalée : on ajoute un peu de marge, la régularité compte plus que la vitesse.' };
    if (stalled && !gentleMode) return { deltaKcal: -100, reason: 'Le poids moyen est stable depuis quelques semaines. Un ajustement léger de -100 kcal est proposé, après vérification des portions et des boissons.' };
    return { deltaKcal: 0, reason: 'Le rythme est bon (0,25 à 1 %/semaine) : on ne change rien.' };
  }
  if (goal === 'gain') {
    if (pct > 0.6) return { deltaKcal: -100, reason: 'Prise rapide : on réduit légèrement le surplus.' };
    if (pct < 0.1) return { deltaKcal: 100, reason: 'Pas de prise : on augmente légèrement.' };
  }
  return { deltaKcal: 0, reason: 'Poids stable, objectif de maintien atteint.' };
}
