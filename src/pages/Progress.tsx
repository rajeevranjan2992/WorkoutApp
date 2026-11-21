import { useMemo, useState } from 'react';
import { Card, Delta, Empty, Stat, TrendChart } from '../components/ui';
import { exerciseMap, useAppState } from '../lib/store';
import { exerciseHistory, type ExerciseSession } from '../lib/stats';
import { formatShortDate, formatWeight, round, toDisplayWeight } from '../lib/units';
import type { Exercise } from '../lib/types';

type Metric = 'e1rm' | 'top' | 'volume';

const METRICS: { id: Metric; label: string; help: string }[] = [
  { id: 'e1rm', label: 'Est. 1RM', help: 'Estimated one-rep max (Epley formula) from your best set.' },
  { id: 'top', label: 'Top weight', help: 'Heaviest weight lifted in the session.' },
  { id: 'volume', label: 'Volume', help: 'Total weight × reps across all sets.' },
];

export default function Progress() {
  const state = useAppState();
  const { unit } = state.settings;
  const exMap = exerciseMap(state);

  const tracked = useMemo(() => {
    const rows: { ex: Exercise; history: ExerciseSession[] }[] = [];
    for (const ex of exMap.values()) {
      const history = exerciseHistory(state.workouts, ex, state.bodyWeights);
      if (history.length) rows.push({ ex, history });
    }
    return rows.sort((a, b) => b.history.length - a.history.length);
  }, [state.workouts, state.bodyWeights, exMap]);

  const [selected, setSelected] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('e1rm');
  const current = tracked.find((t) => t.ex.id === selected) ?? tracked[0];

  if (!current) {
    return (
      <Card title="Strength progress">
        <Empty>Log a few workouts and your strength charts will appear here — one per exercise.</Empty>
      </Card>
    );
  }

  const { ex, history } = current;
  const value = (s: ExerciseSession) =>
    metric === 'e1rm' ? s.bestE1RM : metric === 'top' ? s.topWeight : s.volume;
  const data = history.map((s) => ({ date: s.date.slice(0, 10), value: toDisplayWeight(value(s), unit) }));
  const first = history[0];
  const last = history[history.length - 1];
  const best = (f: (s: ExerciseSession) => number) => history.reduce((m, s) => (f(s) > f(m) ? s : m), first);
  const bestE1 = best((s) => s.bestE1RM);
  const bestTop = best((s) => s.topWeight);

  return (
    <>
      <Card title="Strength progress">
        <select value={ex.id} onChange={(e) => setSelected(e.target.value)} aria-label="Exercise">
          {tracked.map((t) => (
            <option key={t.ex.id} value={t.ex.id}>
              {t.ex.name} ({t.history.length})
            </option>
          ))}
        </select>
        <div className="chips">
          {METRICS.map((m) => (
            <button key={m.id} className={`chip ${metric === m.id ? 'active' : ''}`} onClick={() => setMetric(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <TrendChart
          data={data}
          unit={unit}
          series={[{ key: 'value', name: METRICS.find((m) => m.id === metric)!.label, color: '#22c55e' }]}
        />
        <p className="muted small">
          {METRICS.find((m) => m.id === metric)!.help}
          {ex.bodyweight && ' For bodyweight moves, 1RM and volume include your logged body weight.'}
        </p>
        <div className="stats-grid">
          <Stat
            label="Best est. 1RM"
            value={formatWeight(bestE1.bestE1RM, unit, 1)}
            sub={formatShortDate(bestE1.date)}
          />
          <Stat label="Heaviest set" value={formatWeight(bestTop.topWeight, unit)} sub={formatShortDate(bestTop.date)} />
          <Stat
            label="Since first session"
            value={
              <Delta value={toDisplayWeight(last.bestE1RM - first.bestE1RM, unit)} unit={unit} />
            }
            sub={`1RM · ${history.length} sessions`}
          />
        </div>
      </Card>

      <Card title={`${ex.name} sessions`}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Sets</th>
                <th>Est. 1RM</th>
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map((s) => (
                <tr key={s.workoutId}>
                  <td>{formatShortDate(s.date)}</td>
                  <td>{s.sets.map((x) => `${toDisplayWeight(x.weight, unit)}×${x.reps}`).join(', ')}</td>
                  <td>{round(toDisplayWeight(s.bestE1RM, unit), 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="All lifts">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Now (1RM)</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {tracked.map(({ ex: e, history: h }) => {
                const a = h[0].bestE1RM;
                const b = h[h.length - 1].bestE1RM;
                return (
                  <tr key={e.id} className="clickable" onClick={() => setSelected(e.id)}>
                    <td>{e.name}</td>
                    <td>{formatWeight(b, unit, 1)}</td>
                    <td>
                      {h.length > 1 && a > 0 ? (
                        <span className={b >= a ? 'good' : 'bad'}>
                          {b >= a ? '+' : ''}
                          {Math.round(((b - a) / a) * 100)}%
                        </span>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
