import type { Exercise, MuscleGroup, SplitId } from './types';

export const DEFAULT_EXERCISES: Exercise[] = [
  // Push
  { id: 'bench-press', name: 'Bench Press', muscle: 'chest', pattern: 'push', compound: true },
  { id: 'incline-db-press', name: 'Incline Dumbbell Press', muscle: 'chest', pattern: 'push', compound: true },
  { id: 'overhead-press', name: 'Overhead Press', muscle: 'shoulders', pattern: 'push', compound: true },
  { id: 'dips', name: 'Dips', muscle: 'chest', pattern: 'push', compound: true, bodyweight: true },
  { id: 'push-up', name: 'Push-up', muscle: 'chest', pattern: 'push', compound: true, bodyweight: true },
  { id: 'cable-fly', name: 'Cable Fly', muscle: 'chest', pattern: 'push', compound: false },
  { id: 'lateral-raise', name: 'Lateral Raise', muscle: 'shoulders', pattern: 'push', compound: false },
  { id: 'triceps-pushdown', name: 'Triceps Pushdown', muscle: 'triceps', pattern: 'push', compound: false },
  { id: 'skull-crusher', name: 'Skull Crusher', muscle: 'triceps', pattern: 'push', compound: false },
  // Pull
  { id: 'deadlift', name: 'Deadlift', muscle: 'back', pattern: 'pull', compound: true },
  { id: 'barbell-row', name: 'Barbell Row', muscle: 'back', pattern: 'pull', compound: true },
  { id: 'pull-up', name: 'Pull-up', muscle: 'back', pattern: 'pull', compound: true, bodyweight: true },
  { id: 'lat-pulldown', name: 'Lat Pulldown', muscle: 'back', pattern: 'pull', compound: true },
  { id: 'seated-cable-row', name: 'Seated Cable Row', muscle: 'back', pattern: 'pull', compound: true },
  { id: 'face-pull', name: 'Face Pull', muscle: 'shoulders', pattern: 'pull', compound: false },
  { id: 'barbell-curl', name: 'Barbell Curl', muscle: 'biceps', pattern: 'pull', compound: false },
  { id: 'hammer-curl', name: 'Hammer Curl', muscle: 'biceps', pattern: 'pull', compound: false },
  // Legs
  { id: 'back-squat', name: 'Back Squat', muscle: 'quads', pattern: 'legs', compound: true },
  { id: 'front-squat', name: 'Front Squat', muscle: 'quads', pattern: 'legs', compound: true },
  { id: 'leg-press', name: 'Leg Press', muscle: 'quads', pattern: 'legs', compound: true },
  { id: 'romanian-deadlift', name: 'Romanian Deadlift', muscle: 'hamstrings', pattern: 'legs', compound: true },
  { id: 'hip-thrust', name: 'Hip Thrust', muscle: 'glutes', pattern: 'legs', compound: true },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squat', muscle: 'quads', pattern: 'legs', compound: true },
  { id: 'leg-extension', name: 'Leg Extension', muscle: 'quads', pattern: 'legs', compound: false },
  { id: 'leg-curl', name: 'Leg Curl', muscle: 'hamstrings', pattern: 'legs', compound: false },
  { id: 'calf-raise', name: 'Standing Calf Raise', muscle: 'calves', pattern: 'legs', compound: false },
  // Core
  { id: 'plank', name: 'Plank (reps = seconds)', muscle: 'core', pattern: 'core', compound: false, bodyweight: true },
  { id: 'hanging-leg-raise', name: 'Hanging Leg Raise', muscle: 'core', pattern: 'core', compound: false, bodyweight: true },
  { id: 'cable-crunch', name: 'Cable Crunch', muscle: 'core', pattern: 'core', compound: false },
];

export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
};

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
}

export interface SplitDay {
  id: string;
  name: string;
  exercises: PlannedExercise[];
}

export interface Split {
  id: SplitId;
  name: string;
  description: string;
  days: SplitDay[];
}

const p = (exerciseId: string, sets = 3): PlannedExercise => ({ exerciseId, sets });

export const SPLITS: Record<SplitId, Split> = {
  ppl: {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: '3–6 days a week. Each muscle group trained once or twice weekly.',
    days: [
      {
        id: 'push',
        name: 'Push',
        exercises: [p('bench-press', 4), p('overhead-press'), p('incline-db-press'), p('lateral-raise'), p('triceps-pushdown')],
      },
      {
        id: 'pull',
        name: 'Pull',
        exercises: [p('deadlift', 3), p('pull-up'), p('barbell-row'), p('face-pull'), p('barbell-curl')],
      },
      {
        id: 'legs',
        name: 'Legs',
        exercises: [p('back-squat', 4), p('romanian-deadlift'), p('leg-press'), p('leg-curl'), p('calf-raise', 4)],
      },
    ],
  },
  upperLower: {
    id: 'upperLower',
    name: 'Upper / Lower',
    description: '4 days a week. Good balance of frequency and recovery.',
    days: [
      {
        id: 'upper-a',
        name: 'Upper A',
        exercises: [p('bench-press', 4), p('barbell-row', 4), p('overhead-press'), p('lat-pulldown'), p('barbell-curl'), p('triceps-pushdown')],
      },
      {
        id: 'lower-a',
        name: 'Lower A',
        exercises: [p('back-squat', 4), p('romanian-deadlift'), p('leg-extension'), p('leg-curl'), p('calf-raise', 4)],
      },
      {
        id: 'upper-b',
        name: 'Upper B',
        exercises: [p('overhead-press', 4), p('pull-up', 4), p('incline-db-press'), p('seated-cable-row'), p('lateral-raise'), p('hammer-curl')],
      },
      {
        id: 'lower-b',
        name: 'Lower B',
        exercises: [p('deadlift', 3), p('front-squat'), p('hip-thrust'), p('leg-curl'), p('hanging-leg-raise')],
      },
    ],
  },
  fullBody: {
    id: 'fullBody',
    name: 'Full Body A / B',
    description: '2–3 days a week. Great for beginners or busy schedules.',
    days: [
      {
        id: 'full-a',
        name: 'Full Body A',
        exercises: [p('back-squat'), p('bench-press'), p('barbell-row'), p('lateral-raise'), p('plank')],
      },
      {
        id: 'full-b',
        name: 'Full Body B',
        exercises: [p('deadlift', 2), p('overhead-press'), p('pull-up'), p('leg-press'), p('hanging-leg-raise')],
      },
    ],
  },
};
