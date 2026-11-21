import { useRef, useState } from 'react';
import { Card, Empty } from '../components/ui';
import { MUSCLE_LABELS, SPLITS } from '../lib/exercises';
import { exportData, importData, resetAll, updateSettings, useAppState } from '../lib/store';
import { todayISO } from '../lib/units';
import type { SplitId } from '../lib/types';
import { NewExerciseForm } from './Workout';

export default function SettingsPage() {
  const state = useAppState();
  const fileRef = useRef<HTMLInputElement>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lift-log-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <Card title="Units">
        <div className="segmented">
          {(['kg', 'lb'] as const).map((u) => (
            <button key={u} className={state.settings.unit === u ? 'active' : ''} onClick={() => updateSettings({ unit: u })}>
              {u === 'kg' ? 'Metric (kg, cm)' : 'Imperial (lb, in)'}
            </button>
          ))}
        </div>
        <p className="muted small">Switching units converts everything you've logged — nothing is lost.</p>
      </Card>

      <Card title="Training split">
        <div className="split-list">
          {(Object.keys(SPLITS) as SplitId[]).map((id) => (
            <label key={id} className={`split-option ${state.settings.split === id ? 'active' : ''}`}>
              <input
                type="radio"
                name="split"
                checked={state.settings.split === id}
                onChange={() => updateSettings({ split: id })}
              />
              <div>
                <strong>{SPLITS[id].name}</strong>
                <div className="muted small">{SPLITS[id].description}</div>
                <div className="small">{SPLITS[id].days.map((d) => d.name).join(' → ')}</div>
              </div>
            </label>
          ))}
        </div>
      </Card>

      <Card
        title="Custom exercises"
        action={
          !adding && (
            <button className="btn small" onClick={() => setAdding(true)}>
              + Add
            </button>
          )
        }
      >
        {adding && <NewExerciseForm onCreated={() => setAdding(false)} onCancel={() => setAdding(false)} />}
        {state.customExercises.length ? (
          <ul className="entry-list">
            {state.customExercises.map((e) => (
              <li key={e.id}>
                <span>{e.name}</span>
                <span className="muted small">{MUSCLE_LABELS[e.muscle]}</span>
              </li>
            ))}
          </ul>
        ) : (
          !adding && <Empty>Your own exercises will be listed here.</Empty>
        )}
      </Card>

      <Card title="Your data">
        <p className="muted small">
          Everything is stored on this device only. Export a backup regularly, or to move to another device.
        </p>
        <div className="row gap wrap">
          <button className="btn" onClick={download}>
            Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <button
            className="btn danger"
            onClick={() => confirm('Delete ALL workouts, weights and measurements? This cannot be undone.') && resetAll()}
          >
            Reset everything
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            if (!confirm('Importing replaces all current data with the backup. Continue?')) return;
            try {
              importData(await file.text());
              setMessage('Backup imported.');
            } catch {
              setMessage('That file is not a valid backup.');
            }
          }}
        />
        {message && <p className="small">{message}</p>}
      </Card>
    </>
  );
}
