import type { BodyWeightEntry, Exercise, MuscleGroup, Workout, WorkoutSet } from './types';

/** Estimated one-rep max (Epley). Returns 0 for empty sets. */
export const estimate1RM = (weight: number, reps: number): number => {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
};

export const completedSets = (sets: WorkoutSet[]): WorkoutSet[] => sets.filter((s) => s.done && s.reps > 0);

/** Body weight (kg) logged on or before the given date, if any. */
export const bodyWeightOn = (entries: BodyWeightEntry[], isoDate: string): number | undefined => {
  const day = isoDate.slice(0, 10);
  let best: BodyWeightEntry | undefined;
  for (const e of entries) {
    if (e.date <= day && (!best || e.date > best.date)) best = e;
  }
  return best?.weight ?? (entries.length ? [...entries].sort((a, b) => a.date.localeCompare(b.date))[0].weight : undefined);
};

/** The load actually moved: for bodyweight exercises add the lifter's body weight. */
export const effectiveLoad = (exercise: Exercise | undefined, weight: number, bodyWeight?: number): number =>
  exercise?.bodyweight ? weight + (bodyWeight ?? 0) : weight;

export interface ExerciseSession {
  workoutId: string;
  date: string;
  sets: WorkoutSet[];
  /** Heaviest logged weight (added weight for bodyweight moves). */
  topWeight: number;
  /** Best estimated 1RM of the session (uses effective load). */
  bestE1RM: number;
  /** Sum of effective load × reps. */
  volume: number;
  totalReps: number;
}

/** All finished sessions of one exercise, oldest first. */
export const exerciseHistory = (
  workouts: Workout[],
  exercise: Exercise,
  bodyWeights: BodyWeightEntry[] = [],
): ExerciseSession[] => {
  const sessions: ExerciseSession[] = [];
  const sorted = [...workouts].sort((a, b) => a.date.localeCompare(b.date));
  for (const w of sorted) {
    const bw = exercise.bodyweight ? bodyWeightOn(bodyWeights, w.date) : undefined;
    for (const we of w.exercises) {
      if (we.exerciseId !== exercise.id) continue;
      const sets = completedSets(we.sets);
      if (!sets.length) continue;
      let topWeight = 0;
      let bestE1RM = 0;
      let volume = 0;
      let totalReps = 0;
      for (const s of sets) {
        const load = effectiveLoad(exercise, s.weight, bw);
        topWeight = Math.max(topWeight, s.weight);
        bestE1RM = Math.max(bestE1RM, estimate1RM(load, s.reps));
        volume += load * s.reps;
        totalReps += s.reps;
      }
      sessions.push({ workoutId: w.id, date: w.date, sets, topWeight, bestE1RM, volume, totalReps });
    }
  }
  return sessions;
};

export type PRKind = 'weight' | 'e1rm' | 'volume' | 'reps';

export interface PersonalRecord {
  exerciseId: string;
  kind: PRKind;
  value: number;
  previous: number;
}

export const PR_LABELS: Record<PRKind, string> = {
  weight: 'Heaviest weight',
  e1rm: 'Best estimated 1RM',
  volume: 'Most volume',
  reps: 'Most reps',
};

/**
 * PRs set in `workout` compared to all earlier workouts.
 * The very first session of an exercise is not counted as a PR.
 */
export const findPersonalRecords = (
  workout: Workout,
  allWorkouts: Workout[],
  exercises: Map<string, Exercise>,
  bodyWeights: BodyWeightEntry[] = [],
): PersonalRecord[] => {
  const prs: PersonalRecord[] = [];
  const earlier = allWorkouts.filter((w) => w.id !== workout.id && w.date < workout.date);
  for (const we of workout.exercises) {
    const ex = exercises.get(we.exerciseId);
    if (!ex) continue;
    const [current] = exerciseHistory([workout], ex, bodyWeights);
    if (!current) continue;
    const past = exerciseHistory(earlier, ex, bodyWeights);
    if (!past.length) continue;
    const check = (kind: PRKind, value: number, previous: number) => {
      if (value > previous + 1e-9) prs.push({ exerciseId: ex.id, kind, value, previous });
    };
    // For pure bodyweight work (no added load) reps are the meaningful record.
    if (ex.bodyweight && current.topWeight === 0 && past.every((s) => s.topWeight === 0)) {
      check('reps', Math.max(...current.sets.map((s) => s.reps)), Math.max(...past.flatMap((s) => s.sets.map((x) => x.reps))));
      continue;
    }
    check('weight', current.topWeight, Math.max(...past.map((s) => s.topWeight)));
    check('e1rm', current.bestE1RM, Math.max(...past.map((s) => s.bestE1RM)));
    check('volume', current.volume, Math.max(...past.map((s) => s.volume)));
  }
  return prs;
};

/** Number of completed working sets per muscle group in the window [since, now]. */
export const setsPerMuscle = (
  workouts: Workout[],
  exercises: Map<string, Exercise>,
  sinceISO: string,
): Record<MuscleGroup, number> => {
  const out = {
    chest: 0, back: 0, shoulders: 0, biceps: 0, triceps: 0,
    quads: 0, hamstrings: 0, glutes: 0, calves: 0, core: 0,
  } as Record<MuscleGroup, number>;
  for (const w of workouts) {
    if (w.date < sinceISO) continue;
    for (const we of w.exercises) {
      const ex = exercises.get(we.exerciseId);
      if (ex) out[ex.muscle] += completedSets(we.sets).length;
    }
  }
  return out;
};

/** Most recent date each muscle group was trained. */
export const lastTrained = (
  workouts: Workout[],
  exercises: Map<string, Exercise>,
): Partial<Record<MuscleGroup, string>> => {
  const out: Partial<Record<MuscleGroup, string>> = {};
  for (const w of workouts) {
    for (const we of w.exercises) {
      const ex = exercises.get(we.exerciseId);
      if (!ex || !completedSets(we.sets).length) continue;
      const prev = out[ex.muscle];
      if (!prev || w.date > prev) out[ex.muscle] = w.date;
    }
  }
  return out;
};

/** Trailing moving average over the previous `days` calendar days (inclusive). */
export const movingAverage = (
  entries: { date: string; value: number }[],
  days = 7,
): { date: string; value: number; average: number }[] => {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const dayMs = 86_400_000;
  return sorted.map((e) => {
    const t = Date.parse(e.date);
    const window = sorted.filter((x) => {
      const xt = Date.parse(x.date);
      return xt <= t && t - xt < days * dayMs;
    });
    const average = window.reduce((sum, x) => sum + x.value, 0) / window.length;
    return { ...e, average };
  });
};
