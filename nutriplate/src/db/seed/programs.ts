import type { WorkoutType } from '@/domain/types';

export interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;
  note?: string;
}

export interface Program {
  id: string;
  name: string;
  type: WorkoutType;
  emoji: string;
  level: 'débutant' | 'intermédiaire';
  durationMinutes: number;
  description: string;
  exercises: ProgramExercise[];
}

export const PROGRAMS: Program[] = [
  {
    id: 'fullbody_a',
    name: 'Full Body A',
    type: 'gym',
    emoji: '🏋️',
    level: 'débutant',
    durationMinutes: 45,
    description: 'Machines guidées, tout le corps, 3 séries par exercice. Repos 90 s.',
    exercises: [
      { name: 'Presse à cuisses', sets: 3, reps: '8-12' },
      { name: 'Développé machine (pecs)', sets: 3, reps: '8-12' },
      { name: 'Tirage vertical', sets: 3, reps: '8-12' },
      { name: 'Leg curl (ischios)', sets: 3, reps: '10-15' },
      { name: 'Élévations latérales', sets: 3, reps: '12-15' },
      { name: 'Crunch / gainage', sets: 3, reps: '12-15' },
    ],
  },
  {
    id: 'fullbody_b',
    name: 'Full Body B',
    type: 'gym',
    emoji: '🏋️',
    level: 'débutant',
    durationMinutes: 45,
    description: 'À alterner avec le A. Haltères + machines.',
    exercises: [
      { name: 'Squat goblet (haltère)', sets: 3, reps: '8-12' },
      { name: 'Développé incliné haltères', sets: 3, reps: '8-12' },
      { name: 'Rowing machine / haltère', sets: 3, reps: '8-12' },
      { name: 'Fentes marchées', sets: 3, reps: '10 / jambe' },
      { name: 'Curl biceps', sets: 2, reps: '10-15' },
      { name: 'Extension triceps poulie', sets: 2, reps: '10-15' },
    ],
  },
  {
    id: 'home_a',
    name: 'Maison A (sans matériel)',
    type: 'home',
    emoji: '🏠',
    level: 'débutant',
    durationMinutes: 30,
    description: 'Poids du corps, dans une chambre d’étudiant. Repos 60 s.',
    exercises: [
      { name: 'Squats', sets: 3, reps: '12-15' },
      { name: 'Pompes (genoux ok)', sets: 3, reps: '8-12' },
      { name: 'Fentes', sets: 3, reps: '10 / jambe' },
      { name: 'Hip thrust au sol', sets: 3, reps: '15' },
      { name: 'Planche', sets: 3, reps: '30-45 s' },
      { name: 'Superman (bas du dos)', sets: 3, reps: '12' },
    ],
  },
  {
    id: 'home_b',
    name: 'Maison B (sans matériel)',
    type: 'home',
    emoji: '🏠',
    level: 'intermédiaire',
    durationMinutes: 30,
    description: 'Un peu plus intense, toujours sans matériel.',
    exercises: [
      { name: 'Squat bulgare (pied sur chaise)', sets: 3, reps: '8-10 / jambe' },
      { name: 'Pompes déclinées (pieds surélevés)', sets: 3, reps: '8-12' },
      { name: 'Dips sur chaise', sets: 3, reps: '8-12' },
      { name: 'Relevé de bassin une jambe', sets: 3, reps: '12 / jambe' },
      { name: 'Gainage latéral', sets: 3, reps: '30 s / côté' },
      { name: 'Mountain climbers', sets: 3, reps: '30 s' },
    ],
  },
  {
    id: 'walk',
    name: 'Marche active',
    type: 'walk',
    emoji: '🚶',
    level: 'débutant',
    durationMinutes: 35,
    description: '30 à 45 min d’un bon pas. Podcast, musique, appel à un ami : ça compte.',
    exercises: [{ name: 'Marche', sets: 1, reps: '30-45 min', note: 'Un rythme où tu peux parler mais pas chanter.' }],
  },
  {
    id: 'cardio_beginner',
    name: 'Cardio débutant',
    type: 'cardio',
    emoji: '🚴',
    level: 'débutant',
    durationMinutes: 25,
    description: 'Vélo, elliptique ou course douce. Aucune notion de "brûler" un repas : c’est pour le cœur et l’énergie.',
    exercises: [
      { name: 'Échauffement', sets: 1, reps: '5 min' },
      { name: 'Effort modéré', sets: 1, reps: '15-20 min' },
      { name: 'Retour au calme', sets: 1, reps: '5 min' },
    ],
  },
];

export const WORKOUT_TYPE_LABELS: Record<WorkoutType, string> = { gym: 'Salle', home: 'Maison', walk: 'Marche', cardio: 'Cardio' };
