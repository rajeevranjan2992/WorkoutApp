import { SPLITS, type Split, type SplitDay } from './exercises';
import { exerciseHistory, type ExerciseSession } from './stats';
import { fromDisplayWeight, roundToStep, toDisplayWeight } from './units';
import type { BodyWeightEntry, Exercise, SplitId, Unit, Workout, WorkoutExercise } from './types';

export interface RepRange {
  min: number;
  max: number;
}

const HEAVY_LIFTS = new Set(['back-squat', 'front-squat', 'deadlift']);

export const repRange = (ex: Exercise): RepRange => {
  if (ex.pattern === 'core') return { min: 10, max: 20 };
  if (HEAVY_LIFTS.has(ex.id)) return { min: 5, max: 8 };
  if (ex.compound) return { min: 6, max: 10 };
  return { min: 10, max: 15 };
};

/** How much to add (in the user's unit) once the top of the rep range is reached. */
export const weightIncrement = (ex: Exercise, unit: Unit): number => {
  const lowerBodyCompound = ex.compound && ex.pattern === 'legs';
  if (unit === 'kg') return lowerBodyCompound || ex.id === 'deadlift' ? 5 : ex.compound ? 2.5 : 1;
  return lowerBodyCompound || ex.id === 'deadlift' ? 10 : ex.compound ? 5 : 2.5;
};

export interface ExerciseSuggestion {
  /** Suggested weight in kg, or null when there is no history yet. */
  weight: number | null;
  reps: number;
  sets: number;
  range: RepRange;
  reason: string;
  action: 'start' | 'increase' | 'repeat' | 'deload';
  last?: ExerciseSession;
}

/** Sets performed at the session's top weight. */
const topSets = (s: ExerciseSession) => s.sets.filter((x) => x.weight === s.topWeight);

/**
 * Double progression:
 *  - hit the top of the rep range on every top set  -> add weight, drop to bottom of range
 *  - missed the bottom of the range two sessions in a row at the same weight -> deload 10%
 *  - otherwise keep the weight and add a rep
 */
export const suggestForExercise = (
  ex: Exercise,
  history: ExerciseSession[],
  unit: Unit,
  plannedSets = 3,
): ExerciseSuggestion => {
  const range = repRange(ex);
  const last = history[history.length - 1];
  if (!last) {
    return {
      weight: null,
      reps: range.max,
      sets: plannedSets,
      range,
      action: 'start',
      reason: ex.bodyweight
        ? `First time — do as many clean reps as you can (target ${range.min}–${range.max}).`
        : `First time — pick a weight you can lift for ${range.max} reps with 1–2 reps left in the tank.`,
    };
  }

  const sets = Math.max(plannedSets, 1);
  const top = topSets(last);
  const minReps = Math.min(...top.map((s) => s.reps));
  const inc = weightIncrement(ex, unit);
  const incLabel = `${inc} ${unit}`;

  if (top.length >= Math.min(sets, last.sets.length) && minReps >= range.max) {
    const weight = fromDisplayWeight(toDisplayWeight(last.topWeight, unit) + inc, unit);
    return {
      weight,
      reps: range.min,
      sets,
      range,
      last,
      action: 'increase',
      reason: ex.bodyweight
        ? `You hit ${range.max}+ reps on every set — add ${incLabel} (or use a harder variation).`
        : `You hit ${range.max}+ reps on every set — add ${incLabel}.`,
    };
  }

  if (minReps < range.min) {
    const prev = history[history.length - 2];
    const stalledTwice =
      prev && prev.topWeight === last.topWeight && Math.min(...topSets(prev).map((s) => s.reps)) < range.min;
    if (stalledTwice && last.topWeight > 0) {
      const step = ex.compound ? (unit === 'kg' ? 2.5 : 5) : unit === 'kg' ? 1 : 2.5;
      const display = roundToStep(toDisplayWeight(last.topWeight, unit) * 0.9, step);
      return {
        weight: fromDisplayWeight(display, unit),
        reps: range.max,
        sets,
        range,
        last,
        action: 'deload',
        reason: `Stalled below ${range.min} reps twice — deload ~10% and build back up.`,
      };
    }
    return {
      weight: last.topWeight,
      reps: range.min,
      sets,
      range,
      last,
      action: 'repeat',
      reason: `Same weight — aim for at least ${range.min} reps on every set.`,
    };
  }

  const target = Math.min(range.max, minReps + 1);
  return {
    weight: last.topWeight,
    reps: target,
    sets,
    range,
    last,
    action: 'repeat',
    reason: `Same weight — aim for ${target} reps per set (one more than last time).`,
  };
};

/** The next day in the rotation, based on the last finished workout from this split. */
export const nextSplitDay = (splitId: SplitId, workouts: Workout[]): SplitDay => {
  const split: Split = SPLITS[splitId];
  const ids = split.days.map((d) => d.id);
  const lastInSplit = [...workouts]
    .filter((w) => w.dayId && ids.includes(w.dayId))
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!lastInSplit) return split.days[0];
  const idx = ids.indexOf(lastInSplit.dayId!);
  return split.days[(idx + 1) % split.days.length];
};

/** Consecutive calendar days with a finished workout, ending today or yesterday. */
export const trainingStreak = (workouts: Workout[], now = new Date()): number => {
  const days = new Set(workouts.map((w) => new Date(w.date).toDateString()));
  const d = new Date(now);
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
};

/** Build a ready-to-log workout for a split day, prefilled with suggested weights/reps. */
export const buildWorkoutExercises = (
  day: SplitDay,
  exercises: Map<string, Exercise>,
  workouts: Workout[],
  bodyWeights: BodyWeightEntry[],
  unit: Unit,
): WorkoutExercise[] =>
  day.exercises
    .filter((pe) => exercises.has(pe.exerciseId))
    .map((pe) => prefilledExercise(exercises.get(pe.exerciseId)!, workouts, bodyWeights, unit, pe.sets));

export const prefilledExercise = (
  ex: Exercise,
  workouts: Workout[],
  bodyWeights: BodyWeightEntry[],
  unit: Unit,
  plannedSets = 3,
): WorkoutExercise => {
  const history = exerciseHistory(workouts, ex, bodyWeights);
  const s = suggestForExercise(ex, history, unit, plannedSets);
  return {
    exerciseId: ex.id,
    sets: Array.from({ length: s.sets }, () => ({ weight: s.weight ?? 0, reps: s.reps, done: false })),
  };
};

