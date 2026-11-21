import { useMemo, useState } from 'react';
import { Card, Delta, Empty, Stat } from '../components/ui';
import { MUSCLE_LABELS, SPLITS } from '../lib/exercises';
import { navigate } from '../lib/nav';
import { exerciseMap, startWorkout, useAppState } from '../lib/store';
import { exerciseHistory, findPersonalRecords, lastTrained, PR_LABELS, setsPerMuscle } from '../lib/stats';
import { buildWorkoutExercises, nextSplitDay, suggestForExercise, trainingStreak } from '../lib/suggest';
import { formatShortDate, formatWeight, toDisplayWeight } from '../lib/units';
import type { MuscleGroup } from '../lib/types';

const DAY_MS = 86_400_000;
/** Commonly cited hypertrophy range: ~10–20 hard sets per muscle per week. */
const WEEKLY_TARGET = { min: 10, max: 20 };

export default function Today() {
  const state = useAppState();
  const { unit, split: splitId } = state.settings;
  const exMap = exerciseMap(state);
  const split = SPLITS[splitId];
  const suggestedDay = nextSplitDay(splitId, state.workouts);
  const [dayId, setDayId] = useState<string | null>(null);
  const day = split.days.find((d) => d.id === dayId) ?? suggestedDay;

  const now = Date.now();
  const weekAgo = new Date(now - 7 * DAY_MS).toISOString();
  const weeklySets = setsPerMuscle(state.workouts, exMap, weekAgo);
  const trained = lastTrained(state.workouts, exMap);
  const streak = trainingStreak(state.workouts);
  const workoutsThisWeek = state.workouts.filter((w) => w.date >= weekAgo).length;

  const plan = day.exercises
    .map((pe) => {
      const ex = exMap.get(pe.exerciseId);
      if (!ex) return null;
      const s = suggestForExercise(ex, exerciseHistory(state.workouts, ex, state.bodyWeights), unit, pe.sets);
      return { ex, s };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const recentPRs = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * DAY_MS).toISOString();
    return state.workouts
      .filter((w) => w.date >= cutoff)
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((w) =>
        findPersonalRecords(w, state.workouts, exMap, state.bodyWeights)
          .filter((pr) => pr.kind !== 'volume')
          .map((pr) => ({ ...pr, date: w.date })),
      )
      .slice(0, 6);
  }, [state.workouts, state.bodyWeights, exMap]);

  const bw = state.bodyWeights;
  const latestBw = bw[bw.length - 1];
  const monthAgoBw = [...bw].reverse().find((e) => Date.parse(e.date) <= now - 30 * DAY_MS) ?? bw[0];

  const start = () => {
    startWorkout(day.name, buildWorkoutExercises(day, exMap, state.workouts, state.bodyWeights, unit), day.id);
    navigate('workout');
  };

  const daysSince = (iso?: string) => (iso ? Math.floor((now - Date.parse(iso)) / DAY_MS) : undefined);

  return (
    <>
      {state.activeWorkout && (
        <div className="banner">
          <span>
            <strong>{state.activeWorkout.name}</strong> is in progress.
          </span>
          <button className="btn primary small" onClick={() => navigate('workout')}>
            Resume
          </button>
        </div>
      )}

      {streak >= 3 && (
        <div className="banner warn">
          You've trained {streak} days in a row. Consider a rest or light cardio day — muscles grow while you recover.
        </div>
      )}

      <Card
        title={
          <>
            Suggested: <span className="accent">{day.name}</span>
          </>
        }
        action={<span className="muted small">{split.name}</span>}
      >
        <div className="chips">
          {split.days.map((d) => (
            <button key={d.id} className={`chip ${d.id === day.id ? 'active' : ''}`} onClick={() => setDayId(d.id)}>
              {d.name}
              {d.id === suggestedDay.id && ' ★'}
            </button>
          ))}
        </div>
        <ul className="plan">
          {plan.map(({ ex, s }) => (
            <li key={ex.id}>
              <div className="plan-row">
                <span className="plan-name">{ex.name}</span>
                <span className="plan-target">
                  {s.sets} × {s.reps}
                  {s.weight !== null && (s.weight > 0 || !ex.bodyweight) && <> @ {formatWeight(s.weight, unit)}</>}
                  {ex.bodyweight && (s.weight ?? 0) === 0 && ' (bodyweight)'}
                </span>
              </div>
              <div className={`plan-reason ${s.action}`}>{s.reason}</div>
            </li>
          ))}
        </ul>
        <div className="row gap">
          <button className="btn primary grow" onClick={start} disabled={!!state.activeWorkout}>
            Start {day.name}
          </button>
          <button
            className="btn"
            disabled={!!state.activeWorkout}
            onClick={() => {
              startWorkout('Custom workout', []);
              navigate('workout');
            }}
          >
            Empty workout
          </button>
        </div>
      </Card>

      <div className="stats-grid">
        <Stat label="Workouts (7 days)" value={workoutsThisWeek} sub={`${state.workouts.length} total`} />
        <Stat label="Training streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        <Stat
          label="Body weight"
          value={latestBw ? formatWeight(latestBw.weight, unit) : '—'}
          sub={
            latestBw && monthAgoBw && monthAgoBw !== latestBw ? (
              <>
                <Delta
                  value={toDisplayWeight(latestBw.weight, unit) - toDisplayWeight(monthAgoBw.weight, unit)}
                  unit={unit}
                  invert
                />{' '}
                since {formatShortDate(monthAgoBw.date)}
              </>
            ) : (
              <button className="link" onClick={() => navigate('body')}>
                Log weight
              </button>
            )
          }
        />
      </div>

      <Card title="Recent personal records">
        {recentPRs.length ? (
          <ul className="pr-list">
            {recentPRs.map((pr, i) => (
              <li key={i}>
                <span>🏆 {exMap.get(pr.exerciseId)?.name}</span>
                <span className="muted small">
                  {PR_LABELS[pr.kind]}: {pr.kind === 'reps' ? `${pr.value} reps` : formatWeight(pr.value, unit, pr.kind === 'e1rm' ? 1 : 2)} ·{' '}
                  {formatShortDate(pr.date)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>No PRs in the last 30 days yet — they'll show up here as you get stronger.</Empty>
        )}
      </Card>

      <Card title="Weekly volume & recovery" action={<span className="muted small">sets, last 7 days</span>}>
        <div className="muscles">
          {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => {
            const sets = weeklySets[m];
            const pct = Math.min(100, (sets / WEEKLY_TARGET.max) * 100);
            const status = sets === 0 ? 'none' : sets < WEEKLY_TARGET.min ? 'low' : sets > WEEKLY_TARGET.max ? 'high' : 'ok';
            const d = daysSince(trained[m]);
            return (
              <div className="muscle" key={m}>
                <div className="muscle-head">
                  <span>{MUSCLE_LABELS[m]}</span>
                  <span className="muted small">
                    {sets} sets · {d === undefined ? 'never' : d === 0 ? 'today' : `${d}d ago`}
                  </span>
                </div>
                <div className="bar">
                  <div className={`bar-fill ${status}`} style={{ width: `${pct}%` }} />
                  <div className="bar-mark" style={{ left: `${(WEEKLY_TARGET.min / WEEKLY_TARGET.max) * 100}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="muted small">Aim for roughly 10–20 hard sets per muscle group each week.</p>
      </Card>
    </>
  );
}
