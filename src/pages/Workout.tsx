import { useEffect, useMemo, useState } from 'react';
import { Card, Empty, NumberInput } from '../components/ui';
import { MUSCLE_LABELS } from '../lib/exercises';
import { navigate } from '../lib/nav';
import {
  addCustomExercise,
  allExercises,
  discardActiveWorkout,
  exerciseMap,
  finishActiveWorkout,
  getState,
  startWorkout,
  updateActiveWorkout,
  useAppState,
} from '../lib/store';
import { exerciseHistory, findPersonalRecords, PR_LABELS, type PersonalRecord } from '../lib/stats';
import { prefilledExercise, suggestForExercise } from '../lib/suggest';
import { formatShortDate, formatWeight, fromDisplayWeight, toDisplayWeight } from '../lib/units';
import type { Exercise, MuscleGroup, Pattern, Workout, WorkoutSet } from '../lib/types';

const REST_SECONDS = 90;

const useNow = (intervalMs = 1000) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
};

const mmss = (sec: number) => {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
};

export default function WorkoutPage() {
  const state = useAppState();
  const [summary, setSummary] = useState<{ workout: Workout; prs: PersonalRecord[] } | null>(null);

  if (summary) return <Summary {...summary} onClose={() => setSummary(null)} />;
  if (!state.activeWorkout) {
    return (
      <Card title="No workout in progress">
        <Empty>Start today's suggested workout from the Today tab, or start an empty one and add exercises.</Empty>
        <div className="row gap">
          <button className="btn primary grow" onClick={() => navigate('today')}>
            See suggestion
          </button>
          <button className="btn" onClick={() => startWorkout('Custom workout', [])}>
            Empty workout
          </button>
        </div>
      </Card>
    );
  }
  return <ActiveWorkout workout={state.activeWorkout} onFinished={setSummary} />;
}

function ActiveWorkout({
  workout,
  onFinished,
}: {
  workout: Workout;
  onFinished: (s: { workout: Workout; prs: PersonalRecord[] }) => void;
}) {
  const state = useAppState();
  const { unit } = state.settings;
  const exMap = exerciseMap(state);
  const now = useNow();
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [picking, setPicking] = useState(false);
  const restLeft = restUntil ? (restUntil - now) / 1000 : 0;

  useEffect(() => {
    if (restUntil && restLeft <= 0) {
      setRestUntil(null);
      if ('vibrate' in navigator) navigator.vibrate?.([200, 100, 200]);
    }
  }, [restLeft, restUntil]);

  const updateSet = (ei: number, si: number, patch: Partial<WorkoutSet>) =>
    updateActiveWorkout((w) => ({
      ...w,
      exercises: w.exercises.map((we, i) =>
        i !== ei ? we : { ...we, sets: we.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) },
      ),
    }));

  const doneCount = workout.exercises.reduce((n, we) => n + we.sets.filter((s) => s.done).length, 0);

  const finish = () => {
    if (!doneCount && !confirm('No sets are ticked as done, so nothing will be saved. Finish anyway?')) return;
    const saved = finishActiveWorkout();
    if (!saved) return;
    const s = getState();
    onFinished({ workout: saved, prs: findPersonalRecords(saved, s.workouts, exerciseMap(s), s.bodyWeights) });
  };

  return (
    <>
      <div className="workout-head">
        <input
          className="title-input"
          value={workout.name}
          onChange={(e) => updateActiveWorkout((w) => ({ ...w, name: e.target.value }))}
          aria-label="Workout name"
        />
        <span className="muted small">
          ⏱ {mmss((now - Date.parse(workout.date)) / 1000)} · {doneCount} sets done
        </span>
      </div>

      {workout.exercises.map((we, ei) => {
        const ex = exMap.get(we.exerciseId);
        if (!ex) return null;
        const history = exerciseHistory(state.workouts, ex, state.bodyWeights);
        const sug = suggestForExercise(ex, history, unit, we.sets.length);
        const last = history[history.length - 1];
        return (
          <Card
            key={`${we.exerciseId}-${ei}`}
            title={ex.name}
            action={
              <div className="row">
                <button
                  className="icon-btn small"
                  aria-label="Move up"
                  disabled={ei === 0}
                  onClick={() =>
                    updateActiveWorkout((w) => {
                      const list = [...w.exercises];
                      [list[ei - 1], list[ei]] = [list[ei], list[ei - 1]];
                      return { ...w, exercises: list };
                    })
                  }
                >
                  ↑
                </button>
                <button
                  className="icon-btn small"
                  aria-label="Remove exercise"
                  onClick={() => {
                    if (we.sets.some((s) => s.done) && !confirm(`Remove ${ex.name} and its logged sets?`)) return;
                    updateActiveWorkout((w) => ({ ...w, exercises: w.exercises.filter((_, i) => i !== ei) }));
                  }}
                >
                  ✕
                </button>
              </div>
            }
          >
            <div className="ex-meta">
              <span className="tag">{MUSCLE_LABELS[ex.muscle]}</span>
              {last ? (
                <span className="muted small">
                  Last ({formatShortDate(last.date)}):{' '}
                  {last.sets.map((s) => `${toDisplayWeight(s.weight, unit)}×${s.reps}`).join(', ')}
                </span>
              ) : (
                <span className="muted small">No history yet</span>
              )}
            </div>
            <div className={`plan-reason ${sug.action}`}>
              💡 {sug.reason}
              {sug.weight !== null && ` Target: ${formatWeight(sug.weight, unit)} × ${sug.reps}.`}
            </div>

            <div className="sets">
              <div className="set-row head">
                <span>Set</span>
                <span>{ex.bodyweight ? `+${unit}` : unit}</span>
                <span>Reps</span>
                <span>Done</span>
              </div>
              {we.sets.map((s, si) => (
                <div className={`set-row ${s.done ? 'done' : ''}`} key={si}>
                  <button
                    className="set-num"
                    title="Remove set"
                    onClick={() =>
                      updateActiveWorkout((w) => ({
                        ...w,
                        exercises: w.exercises.map((x, i) =>
                          i !== ei ? x : { ...x, sets: x.sets.filter((_, j) => j !== si) },
                        ),
                      }))
                    }
                  >
                    {si + 1}
                  </button>
                  <NumberInput
                    ariaLabel={`Set ${si + 1} weight`}
                    value={toDisplayWeight(s.weight, unit)}
                    step={0.5}
                    onChange={(v) => updateSet(ei, si, { weight: fromDisplayWeight(v ?? 0, unit) })}
                  />
                  <NumberInput
                    ariaLabel={`Set ${si + 1} reps`}
                    value={s.reps}
                    step={1}
                    onChange={(v) => updateSet(ei, si, { reps: Math.round(v ?? 0) })}
                  />
                  <button
                    className={`check ${s.done ? 'on' : ''}`}
                    aria-label={s.done ? 'Mark not done' : 'Mark done'}
                    onClick={() => {
                      updateSet(ei, si, { done: !s.done });
                      if (!s.done) setRestUntil(Date.now() + REST_SECONDS * 1000);
                    }}
                  >
                    ✓
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn small ghost"
              onClick={() =>
                updateActiveWorkout((w) => ({
                  ...w,
                  exercises: w.exercises.map((x, i) => {
                    if (i !== ei) return x;
                    const prev = x.sets[x.sets.length - 1];
                    return {
                      ...x,
                      sets: [...x.sets, { weight: prev?.weight ?? sug.weight ?? 0, reps: prev?.reps ?? sug.reps, done: false }],
                    };
                  }),
                }))
              }
            >
              + Add set
            </button>
          </Card>
        );
      })}

      {picking ? (
        <ExercisePicker
          onPick={(ex) => {
            const s = getState();
            const we = prefilledExercise(ex, s.workouts, s.bodyWeights, s.settings.unit, 3);
            updateActiveWorkout((w) => ({ ...w, exercises: [...w.exercises, we] }));
            setPicking(false);
          }}
          onCancel={() => setPicking(false)}
        />
      ) : (
        <button className="btn block" onClick={() => setPicking(true)}>
          + Add exercise
        </button>
      )}

      <Card title="Notes">
        <textarea
          rows={3}
          placeholder="How did it feel? Sleep, energy, pain…"
          value={workout.notes ?? ''}
          onChange={(e) => updateActiveWorkout((w) => ({ ...w, notes: e.target.value }))}
        />
      </Card>

      <div className="row gap">
        <button className="btn primary grow" onClick={finish}>
          Finish workout
        </button>
        <button
          className="btn danger"
          onClick={() => confirm('Discard this workout? Logged sets will be lost.') && discardActiveWorkout()}
        >
          Discard
        </button>
      </div>

      {restUntil && <div className="rest-spacer" aria-hidden />}
      {restUntil && (
        <div className="rest-timer">
          <span>Rest {mmss(restLeft)}</span>
          <button className="btn small" onClick={() => setRestUntil((r) => (r ?? Date.now()) + 30_000)}>
            +30s
          </button>
          <button className="btn small" onClick={() => setRestUntil(null)}>
            Skip
          </button>
        </div>
      )}
    </>
  );
}

export function ExercisePicker({ onPick, onCancel }: { onPick: (ex: Exercise) => void; onCancel: () => void }) {
  const state = useAppState();
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | 'all'>('all');
  const [creating, setCreating] = useState(false);
  const list = useMemo(
    () =>
      allExercises(state)
        .filter((e) => muscle === 'all' || e.muscle === muscle)
        .filter((e) => e.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [state, query, muscle],
  );

  if (creating) {
    return (
      <NewExerciseForm
        initialName={query}
        onCreated={(ex) => onPick(ex)}
        onCancel={() => setCreating(false)}
      />
    );
  }

  return (
    <Card title="Add exercise" action={<button className="btn small ghost" onClick={onCancel}>Cancel</button>}>
      <input placeholder="Search exercises…" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
      <div className="chips scroll">
        <button className={`chip ${muscle === 'all' ? 'active' : ''}`} onClick={() => setMuscle('all')}>
          All
        </button>
        {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
          <button key={m} className={`chip ${muscle === m ? 'active' : ''}`} onClick={() => setMuscle(m)}>
            {MUSCLE_LABELS[m]}
          </button>
        ))}
      </div>
      <ul className="picker">
        {list.map((ex) => (
          <li key={ex.id}>
            <button onClick={() => onPick(ex)}>
              <span>{ex.name}</span>
              <span className="muted small">{MUSCLE_LABELS[ex.muscle]}</span>
            </button>
          </li>
        ))}
      </ul>
      <button className="btn small block" onClick={() => setCreating(true)}>
        + Create custom exercise{query && ` "${query}"`}
      </button>
    </Card>
  );
}

export function NewExerciseForm({
  initialName = '',
  onCreated,
  onCancel,
}: {
  initialName?: string;
  onCreated: (ex: Exercise) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [muscle, setMuscle] = useState<MuscleGroup>('chest');
  const [pattern, setPattern] = useState<Pattern>('push');
  const [compound, setCompound] = useState(false);
  const [bodyweight, setBodyweight] = useState(false);
  return (
    <Card title="New exercise">
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          onCreated(addCustomExercise({ name: name.trim(), muscle, pattern, compound, bodyweight }));
        }}
      >
        <label>
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </label>
        <label>
          Main muscle
          <select value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup)}>
            {(Object.keys(MUSCLE_LABELS) as MuscleGroup[]).map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Movement
          <select value={pattern} onChange={(e) => setPattern(e.target.value as Pattern)}>
            <option value="push">Push</option>
            <option value="pull">Pull</option>
            <option value="legs">Legs</option>
            <option value="core">Core</option>
          </select>
        </label>
        <label className="check-label">
          <input type="checkbox" checked={compound} onChange={(e) => setCompound(e.target.checked)} />
          Compound (multi-joint) lift
        </label>
        <label className="check-label">
          <input type="checkbox" checked={bodyweight} onChange={(e) => setBodyweight(e.target.checked)} />
          Bodyweight exercise (log added weight)
        </label>
        <div className="row gap">
          <button className="btn primary grow" type="submit">
            Create
          </button>
          <button className="btn" type="button" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}

function Summary({ workout, prs, onClose }: { workout: Workout; prs: PersonalRecord[]; onClose: () => void }) {
  const state = useAppState();
  const { unit } = state.settings;
  const exMap = exerciseMap(state);
  const sets = workout.exercises.reduce((n, we) => n + we.sets.length, 0);
  const volume = workout.exercises.reduce(
    (v, we) => v + we.sets.reduce((x, s) => x + s.weight * s.reps, 0),
    0,
  );
  const minutes = workout.finishedAt ? Math.round((Date.parse(workout.finishedAt) - Date.parse(workout.date)) / 60000) : 0;
  return (
    <Card title="Workout saved 💪">
      <div className="stats-grid">
        <div className="stat">
          <div className="stat-label">Duration</div>
          <div className="stat-value">{minutes} min</div>
        </div>
        <div className="stat">
          <div className="stat-label">Sets</div>
          <div className="stat-value">{sets}</div>
        </div>
        <div className="stat">
          <div className="stat-label">Volume</div>
          <div className="stat-value">{formatWeight(volume, unit)}</div>
        </div>
      </div>
      {prs.length > 0 ? (
        <>
          <h3>New personal records</h3>
          <ul className="pr-list">
            {prs.map((pr, i) => (
              <li key={i}>
                <span>🏆 {exMap.get(pr.exerciseId)?.name}</span>
                <span className="small">
                  {PR_LABELS[pr.kind]}:{' '}
                  {pr.kind === 'reps' ? `${pr.value} reps` : formatWeight(pr.value, unit, pr.kind === 'e1rm' ? 1 : 2)}
                  <span className="muted">
                    {' '}
                    (was {pr.kind === 'reps' ? pr.previous : formatWeight(pr.previous, unit, pr.kind === 'e1rm' ? 1 : 2)})
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">No new records this time — consistency is what builds them.</p>
      )}
      <div className="row gap">
        <button className="btn primary grow" onClick={() => { onClose(); navigate('progress'); }}>
          View progress
        </button>
        <button className="btn" onClick={() => { onClose(); navigate('today'); }}>
          Done
        </button>
      </div>
    </Card>
  );
}
