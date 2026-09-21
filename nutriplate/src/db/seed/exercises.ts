/** Bibliothèque d'exercices pour construire ses propres séances. */
export interface ExerciseDef {
  name: string;
  muscle: 'jambes' | 'pecs' | 'dos' | 'épaules' | 'bras' | 'abdos' | 'cardio' | 'mobilité';
  place: ('gym' | 'home')[];
  defaultSets: number;
  defaultReps: string;
}

const e = (name: string, muscle: ExerciseDef['muscle'], place: ExerciseDef['place'], defaultSets = 3, defaultReps = '8-12'): ExerciseDef => ({ name, muscle, place, defaultSets, defaultReps });

export const EXERCISE_LIBRARY: ExerciseDef[] = [
  e('Squat barre', 'jambes', ['gym']),
  e('Squat goblet (haltère)', 'jambes', ['gym', 'home']),
  e('Presse à cuisses', 'jambes', ['gym']),
  e('Fentes', 'jambes', ['gym', 'home'], 3, '10 / jambe'),
  e('Squat bulgare', 'jambes', ['gym', 'home'], 3, '8-10 / jambe'),
  e('Soulevé de terre roumain', 'jambes', ['gym'], 3, '8-12'),
  e('Leg curl (ischios)', 'jambes', ['gym'], 3, '10-15'),
  e('Leg extension', 'jambes', ['gym'], 3, '10-15'),
  e('Hip thrust', 'jambes', ['gym', 'home'], 3, '10-15'),
  e('Mollets debout', 'jambes', ['gym', 'home'], 3, '12-20'),
  e('Squats poids du corps', 'jambes', ['home'], 3, '15-20'),
  e('Développé couché', 'pecs', ['gym']),
  e('Développé incliné haltères', 'pecs', ['gym']),
  e('Développé machine (pecs)', 'pecs', ['gym']),
  e('Pompes', 'pecs', ['home', 'gym'], 3, '8-15'),
  e('Pompes déclinées', 'pecs', ['home'], 3, '8-12'),
  e('Écarté poulie', 'pecs', ['gym'], 3, '12-15'),
  e('Dips', 'pecs', ['gym', 'home'], 3, '6-12'),
  e('Tirage vertical', 'dos', ['gym']),
  e('Tractions', 'dos', ['gym', 'home'], 3, '4-8'),
  e('Rowing barre', 'dos', ['gym']),
  e('Rowing haltère', 'dos', ['gym', 'home'], 3, '8-12 / bras'),
  e('Rowing machine', 'dos', ['gym']),
  e('Tirage horizontal poulie', 'dos', ['gym']),
  e('Superman', 'dos', ['home'], 3, '12-15'),
  e('Développé militaire', 'épaules', ['gym']),
  e('Développé haltères épaules', 'épaules', ['gym', 'home']),
  e('Élévations latérales', 'épaules', ['gym', 'home'], 3, '12-15'),
  e('Oiseau (arrière d’épaule)', 'épaules', ['gym', 'home'], 3, '12-15'),
  e('Face pull', 'épaules', ['gym'], 3, '12-15'),
  e('Curl biceps', 'bras', ['gym', 'home'], 3, '10-15'),
  e('Curl marteau', 'bras', ['gym', 'home'], 3, '10-15'),
  e('Extension triceps poulie', 'bras', ['gym'], 3, '10-15'),
  e('Dips sur chaise', 'bras', ['home'], 3, '8-12'),
  e('Extension triceps haltère', 'bras', ['gym', 'home'], 3, '10-15'),
  e('Planche', 'abdos', ['home', 'gym'], 3, '30-60 s'),
  e('Gainage latéral', 'abdos', ['home', 'gym'], 3, '30 s / côté'),
  e('Crunch', 'abdos', ['home', 'gym'], 3, '12-20'),
  e('Relevé de jambes', 'abdos', ['home', 'gym'], 3, '10-15'),
  e('Mountain climbers', 'abdos', ['home'], 3, '30 s'),
  e('Dead bug', 'abdos', ['home'], 3, '10 / côté'),
  e('Burpees', 'cardio', ['home'], 4, '30 s'),
  e('Jumping jacks', 'cardio', ['home'], 4, '40 s'),
  e('Corde à sauter', 'cardio', ['home', 'gym'], 4, '1 min'),
  e('Rameur', 'cardio', ['gym'], 1, '15-20 min'),
  e('Vélo', 'cardio', ['gym'], 1, '20-30 min'),
  e('Course', 'cardio', ['gym', 'home'], 1, '20-30 min'),
  e('Marche rapide', 'cardio', ['home'], 1, '30-45 min'),
  e('Étirement ischios', 'mobilité', ['home', 'gym'], 2, '30 s / jambe'),
  e('Étirement fléchisseurs de hanche', 'mobilité', ['home', 'gym'], 2, '30 s / côté'),
  e('Chat-vache (dos)', 'mobilité', ['home'], 2, '10 lents'),
  e('Ouverture d’épaules', 'mobilité', ['home', 'gym'], 2, '30 s'),
  e('Rotation thoracique', 'mobilité', ['home'], 2, '8 / côté'),
];

export const MUSCLE_LABELS: Record<ExerciseDef['muscle'], string> = { jambes: 'Jambes', pecs: 'Pecs', dos: 'Dos', épaules: 'Épaules', bras: 'Bras', abdos: 'Abdos', cardio: 'Cardio', mobilité: 'Mobilité' };
