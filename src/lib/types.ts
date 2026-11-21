// All weights are stored in kilograms and all lengths in centimetres.
// Conversion to the user's preferred unit happens only at the UI boundary.

export type Unit = 'kg' | 'lb';

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'core';

/** Movement pattern used to build push / pull / legs style days. */
export type Pattern = 'push' | 'pull' | 'legs' | 'core';

export interface Exercise {
  id: string;
  name: string;
  muscle: MuscleGroup;
  pattern: Pattern;
  /** Multi-joint lift (gets lower rep ranges and bigger weight jumps). */
  compound: boolean;
  /** Bodyweight movement: the logged weight is *added* load (0 = bodyweight only). */
  bodyweight?: boolean;
  custom?: boolean;
}

export interface WorkoutSet {
  weight: number; // kg (added weight for bodyweight exercises)
  reps: number;
  done: boolean;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: WorkoutSet[];
}

export interface Workout {
  id: string;
  /** ISO timestamp of when the workout started. */
  date: string;
  name: string;
  /** Id of the split day this workout followed, if any (e.g. "push"). */
  dayId?: string;
  exercises: WorkoutExercise[];
  notes?: string;
  finishedAt?: string;
}

export interface BodyWeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // kg
}

export type MeasurementKey =
  | 'neck'
  | 'shoulders'
  | 'chest'
  | 'waist'
  | 'hips'
  | 'leftArm'
  | 'rightArm'
  | 'leftThigh'
  | 'rightThigh'
  | 'calves'
  | 'bodyFat';

export interface MeasurementEntry {
  id: string;
  date: string; // YYYY-MM-DD
  values: Partial<Record<MeasurementKey, number>>; // cm, bodyFat in %
}

export type SplitId = 'ppl' | 'upperLower' | 'fullBody';

export interface Settings {
  unit: Unit;
  split: SplitId;
}

export interface AppState {
  version: 1;
  settings: Settings;
  customExercises: Exercise[];
  workouts: Workout[];
  activeWorkout: Workout | null;
  bodyWeights: BodyWeightEntry[];
  measurements: MeasurementEntry[];
}
