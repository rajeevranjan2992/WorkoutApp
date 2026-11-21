import { useState } from 'react';
import { Card, Empty } from '../components/ui';
import { deleteWorkout, exerciseMap, useAppState } from '../lib/store';
import { formatDate, formatWeight, toDisplayWeight } from '../lib/units';

export default function History() {
  const state = useAppState();
  const { unit } = state.settings;
  const exMap = exerciseMap(state);
  const [open, setOpen] = useState<string | null>(null);
  const workouts = [...state.workouts].sort((a, b) => b.date.localeCompare(a.date));

  if (!workouts.length) {
    return (
      <Card title="History">
        <Empty>No workouts logged yet. Finished workouts will appear here.</Empty>
      </Card>
    );
  }

  return (
    <>
      {workouts.map((w) => {
        const sets = w.exercises.reduce((n, we) => n + we.sets.length, 0);
        const volume = w.exercises.reduce((v, we) => v + we.sets.reduce((x, s) => x + s.weight * s.reps, 0), 0);
        const minutes = w.finishedAt ? Math.round((Date.parse(w.finishedAt) - Date.parse(w.date)) / 60000) : null;
        const isOpen = open === w.id;
        return (
          <section className="card" key={w.id}>
            <button className="history-head" onClick={() => setOpen(isOpen ? null : w.id)}>
              <div>
                <div className="history-title">{w.name}</div>
                <div className="muted small">
                  {formatDate(w.date)} · {w.exercises.length} exercises · {sets} sets
                  {minutes !== null && ` · ${minutes} min`} · {formatWeight(volume, unit, 0)}
                </div>
              </div>
              <span className="muted">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="history-body">
                {w.exercises.map((we, i) => (
                  <div key={i} className="history-ex">
                    <strong>{exMap.get(we.exerciseId)?.name ?? 'Unknown exercise'}</strong>
                    <div className="set-chips">
                      {we.sets.map((s, j) => (
                        <span key={j} className="set-chip">
                          {toDisplayWeight(s.weight, unit)} {unit} × {s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {w.notes && <p className="notes">📝 {w.notes}</p>}
                <button
                  className="btn small danger"
                  onClick={() => confirm(`Delete "${w.name}" from ${formatDate(w.date)}?`) && deleteWorkout(w.id)}
                >
                  Delete workout
                </button>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
