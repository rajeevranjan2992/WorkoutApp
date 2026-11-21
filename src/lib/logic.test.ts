import { describe, expect, it } from 'vitest';
import { DEFAULT_EXERCISES } from './exercises';
import { estimate1RM, exerciseHistory, findPersonalRecords, movingAverage, setsPerMuscle } from './stats';
import { nextSplitDay, repRange, suggestForExercise, trainingStreak } from './suggest';
import { fromDisplayWeight, toDisplayWeight } from './units';
import type { Workout } from './types';

const exMap = new Map(DEFAULT_EXERCISES.map((e) => [e.id, e]));
const bench = exMap.get('bench-press')!;
const squat = exMap.get('back-squat')!;
const pullUp = exMap.get('pull-up')!;

let n = 0;
const workout = (date: string, exerciseId: string, sets: [number, number][], dayId?: string): Workout => ({
  id: `w${n++}`,
  date: `${date}T10:00:00.000Z`,
  name: 'test',
  dayId,
  exercises: [{ exerciseId, sets: sets.map(([weight, reps]) => ({ weight, reps, done: true })) }],
});

describe('estimate1RM', () => {
  it('uses Epley and returns the weight itself for singles', () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

describe('suggestForExercise', () => {
  it('asks for a starting weight when there is no history', () => {
    const s = suggestForExercise(bench, [], 'kg', 3);
    expect(s.action).toBe('start');
    expect(s.weight).toBeNull();
  });

  it('adds weight when the top of the rep range was hit on every set', () => {
    const { max, min } = repRange(bench);
    const h = exerciseHistory([workout('2026-01-01', 'bench-press', [[80, max], [80, max], [80, max]])], bench);
    const s = suggestForExercise(bench, h, 'kg', 3);
    expect(s.action).toBe('increase');
    expect(s.weight).toBe(82.5);
    expect(s.reps).toBe(min);
  });

  it('uses bigger jumps for squats and works in pounds', () => {
    const h = exerciseHistory([workout('2026-01-01', 'back-squat', [[fromDisplayWeight(225, 'lb'), 8], [fromDisplayWeight(225, 'lb'), 8]])], squat);
    const s = suggestForExercise(squat, h, 'lb', 2);
    expect(toDisplayWeight(s.weight!, 'lb')).toBe(235);
  });

  it('keeps the weight and adds a rep when in range', () => {
    const h = exerciseHistory([workout('2026-01-01', 'bench-press', [[80, 8], [80, 7], [80, 7]])], bench);
    const s = suggestForExercise(bench, h, 'kg', 3);
    expect(s.action).toBe('repeat');
    expect(s.weight).toBe(80);
    expect(s.reps).toBe(8);
  });

  it('deloads ~10% after missing the bottom of the range twice', () => {
    const h = exerciseHistory(
      [
        workout('2026-01-01', 'bench-press', [[100, 5], [100, 4]]),
        workout('2026-01-04', 'bench-press', [[100, 5], [100, 4]]),
      ],
      bench,
    );
    const s = suggestForExercise(bench, h, 'kg', 3);
    expect(s.action).toBe('deload');
    expect(s.weight).toBe(90);
  });
});

describe('nextSplitDay', () => {
  it('rotates through the split and wraps around', () => {
    expect(nextSplitDay('ppl', []).id).toBe('push');
    expect(nextSplitDay('ppl', [workout('2026-01-01', 'bench-press', [[80, 8]], 'push')]).id).toBe('pull');
    expect(nextSplitDay('ppl', [workout('2026-01-02', 'back-squat', [[100, 5]], 'legs')]).id).toBe('push');
  });
});

describe('personal records', () => {
  it('detects new heaviest weight and e1RM but not on the first session', () => {
    const w1 = workout('2026-01-01', 'bench-press', [[80, 5]]);
    const w2 = workout('2026-01-05', 'bench-press', [[85, 5]]);
    expect(findPersonalRecords(w1, [w1], exMap)).toEqual([]);
    const kinds = findPersonalRecords(w2, [w1, w2], exMap).map((p) => p.kind);
    expect(kinds).toContain('weight');
    expect(kinds).toContain('e1rm');
  });

  it('tracks reps for pure bodyweight exercises', () => {
    const w1 = workout('2026-01-01', 'pull-up', [[0, 8]]);
    const w2 = workout('2026-01-05', 'pull-up', [[0, 10]]);
    expect(findPersonalRecords(w2, [w1, w2], exMap)).toEqual([
      { exerciseId: 'pull-up', kind: 'reps', value: 10, previous: 8 },
    ]);
  });

  it('includes body weight in bodyweight exercise load', () => {
    const h = exerciseHistory([workout('2026-01-01', 'pull-up', [[10, 1]])], pullUp, [
      { id: 'b', date: '2026-01-01', weight: 80 },
    ]);
    expect(h[0].bestE1RM).toBe(90);
  });
});

describe('aggregates', () => {
  it('counts weekly sets per muscle', () => {
    const sets = setsPerMuscle([workout('2026-01-05', 'bench-press', [[80, 8], [80, 8]])], exMap, '2026-01-01');
    expect(sets.chest).toBe(2);
    expect(sets.back).toBe(0);
  });

  it('computes a trailing moving average', () => {
    const avg = movingAverage([
      { date: '2026-01-01', value: 80 },
      { date: '2026-01-02', value: 82 },
      { date: '2026-01-20', value: 78 },
    ]);
    expect(avg.map((a) => a.average)).toEqual([80, 81, 78]);
  });

  it('counts consecutive training days', () => {
    const now = new Date('2026-01-03T18:00:00');
    const ws = ['2026-01-01', '2026-01-02', '2026-01-03'].map((d) => ({
      ...workout(d, 'bench-press', [[80, 8]]),
      date: new Date(`${d}T09:00:00`).toISOString(),
    }));
    expect(trainingStreak(ws, now)).toBe(3);
  });
});
