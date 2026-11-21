import { useSyncExternalStore } from 'react';
import { DEFAULT_EXERCISES } from './exercises';
import { completedSets } from './stats';
import type {
  AppState,
  BodyWeightEntry,
  Exercise,
  MeasurementEntry,
  Settings,
  Workout,
  WorkoutExercise,
} from './types';

const STORAGE_KEY = 'lift-log:v1';

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const initialState = (): AppState => ({
  version: 1,
  settings: { unit: 'kg', split: 'ppl' },
  customExercises: [],
  workouts: [],
  activeWorkout: null,
  bodyWeights: [],
  measurements: [],
});

/** Validate/merge loaded data so a partial or older file never crashes the app. */
export const normalizeState = (raw: unknown): AppState => {
  const base = initialState();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Partial<AppState>;
  return {
    version: 1,
    settings: { ...base.settings, ...(r.settings ?? {}) },
    customExercises: Array.isArray(r.customExercises) ? r.customExercises : [],
    workouts: Array.isArray(r.workouts) ? r.workouts : [],
    activeWorkout: r.activeWorkout ?? null,
    bodyWeights: Array.isArray(r.bodyWeights) ? r.bodyWeights : [],
    measurements: Array.isArray(r.measurements) ? r.measurements : [],
  };
};

const load = (): AppState => {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? normalizeState(JSON.parse(text)) : initialState();
  } catch {
    return initialState();
  }
};

let state: AppState = typeof localStorage === 'undefined' ? initialState() : load();
const listeners = new Set<() => void>();

const persist = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable: keep working in memory.
  }
};

export const getState = (): AppState => state;

export const setState = (update: (s: AppState) => AppState): void => {
  state = update(state);
  persist();
  listeners.forEach((l) => l());
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useAppState = (): AppState => useSyncExternalStore(subscribe, getState, getState);

// ---------- derived helpers ----------

export const allExercises = (s: AppState): Exercise[] => [...DEFAULT_EXERCISES, ...s.customExercises];

let cachedSource: Exercise[] | null = null;
let cachedMap = new Map<string, Exercise>();
export const exerciseMap = (s: AppState): Map<string, Exercise> => {
  if (cachedSource !== s.customExercises) {
    cachedSource = s.customExercises;
    cachedMap = new Map(allExercises(s).map((e) => [e.id, e]));
  }
  return cachedMap;
};

// ---------- actions ----------

export const updateSettings = (patch: Partial<Settings>) =>
  setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

export const addCustomExercise = (ex: Omit<Exercise, 'id' | 'custom'>): Exercise => {
  const created: Exercise = { ...ex, id: `custom-${newId()}`, custom: true };
  setState((s) => ({ ...s, customExercises: [...s.customExercises, created] }));
  return created;
};

export const startWorkout = (name: string, exercises: WorkoutExercise[], dayId?: string) =>
  setState((s) => ({
    ...s,
    activeWorkout: { id: newId(), date: new Date().toISOString(), name, dayId, exercises },
  }));

export const updateActiveWorkout = (update: (w: Workout) => Workout) =>
  setState((s) => (s.activeWorkout ? { ...s, activeWorkout: update(s.activeWorkout) } : s));

export const discardActiveWorkout = () => setState((s) => ({ ...s, activeWorkout: null }));

/** Saves the active workout, keeping only completed sets. Returns the saved workout (or null if empty). */
export const finishActiveWorkout = (): Workout | null => {
  const active = state.activeWorkout;
  if (!active) return null;
  const exercises = active.exercises
    .map((we) => ({ ...we, sets: completedSets(we.sets) }))
    .filter((we) => we.sets.length > 0);
  if (!exercises.length) {
    discardActiveWorkout();
    return null;
  }
  const finished: Workout = { ...active, exercises, finishedAt: new Date().toISOString() };
  setState((s) => ({ ...s, activeWorkout: null, workouts: [...s.workouts, finished] }));
  return finished;
};

export const deleteWorkout = (id: string) =>
  setState((s) => ({ ...s, workouts: s.workouts.filter((w) => w.id !== id) }));

/** One body weight per day: logging again on the same date replaces the value. */
export const logBodyWeight = (date: string, weightKg: number) =>
  setState((s) => {
    const rest = s.bodyWeights.filter((e) => e.date !== date);
    const entry: BodyWeightEntry = { id: newId(), date, weight: weightKg };
    return { ...s, bodyWeights: [...rest, entry].sort((a, b) => a.date.localeCompare(b.date)) };
  });

export const deleteBodyWeight = (id: string) =>
  setState((s) => ({ ...s, bodyWeights: s.bodyWeights.filter((e) => e.id !== id) }));

/** One measurement entry per day: values logged on the same date are merged. */
export const logMeasurements = (date: string, values: MeasurementEntry['values']) =>
  setState((s) => {
    const existing = s.measurements.find((m) => m.date === date);
    const rest = s.measurements.filter((m) => m.date !== date);
    const entry: MeasurementEntry = {
      id: existing?.id ?? newId(),
      date,
      values: { ...(existing?.values ?? {}), ...values },
    };
    return { ...s, measurements: [...rest, entry].sort((a, b) => a.date.localeCompare(b.date)) };
  });

export const deleteMeasurement = (id: string) =>
  setState((s) => ({ ...s, measurements: s.measurements.filter((m) => m.id !== id) }));

export const exportData = (): string => JSON.stringify(state, null, 2);

export const importData = (json: string) => {
  const parsed = JSON.parse(json);
  setState(() => normalizeState(parsed));
};

export const resetAll = () => setState(() => initialState());
