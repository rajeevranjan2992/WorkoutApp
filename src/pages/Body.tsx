import { useState } from 'react';
import { Card, Delta, Empty, NumberInput, Stat, TrendChart } from '../components/ui';
import { deleteBodyWeight, deleteMeasurement, logBodyWeight, logMeasurements, useAppState } from '../lib/store';
import { movingAverage } from '../lib/stats';
import {
  formatDate,
  formatShortDate,
  formatWeight,
  fromDisplayLength,
  fromDisplayWeight,
  lengthUnit,
  round,
  todayISO,
  toDisplayLength,
  toDisplayWeight,
} from '../lib/units';
import type { MeasurementKey, Unit } from '../lib/types';

export const MEASUREMENTS: { key: MeasurementKey; label: string; percent?: boolean; lowerIsBetter?: boolean }[] = [
  { key: 'neck', label: 'Neck' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist', lowerIsBetter: true },
  { key: 'hips', label: 'Hips' },
  { key: 'leftArm', label: 'Left arm' },
  { key: 'rightArm', label: 'Right arm' },
  { key: 'leftThigh', label: 'Left thigh' },
  { key: 'rightThigh', label: 'Right thigh' },
  { key: 'calves', label: 'Calves' },
  { key: 'bodyFat', label: 'Body fat', percent: true, lowerIsBetter: true },
];

const DAY_MS = 86_400_000;

export default function Body() {
  const [tab, setTab] = useState<'weight' | 'measurements'>('weight');
  return (
    <>
      <div className="segmented">
        <button className={tab === 'weight' ? 'active' : ''} onClick={() => setTab('weight')}>
          Body weight
        </button>
        <button className={tab === 'measurements' ? 'active' : ''} onClick={() => setTab('measurements')}>
          Measurements
        </button>
      </div>
      {tab === 'weight' ? <WeightSection /> : <MeasurementSection />}
    </>
  );
}

function WeightSection() {
  const state = useAppState();
  const { unit } = state.settings;
  const entries = state.bodyWeights;
  const [date, setDate] = useState(todayISO());
  const [value, setValue] = useState<number | undefined>(
    entries.length ? toDisplayWeight(entries[entries.length - 1].weight, unit) : undefined,
  );

  const data = movingAverage(entries.map((e) => ({ date: e.date, value: e.weight }))).map((d) => ({
    date: d.date,
    weight: toDisplayWeight(d.value, unit),
    average: round(toDisplayWeight(d.average, unit), 2),
  }));

  const latest = entries[entries.length - 1];
  const changeOver = (days: number) => {
    if (!latest) return undefined;
    const cutoff = Date.parse(latest.date) - days * DAY_MS;
    const ref = [...entries].reverse().find((e) => Date.parse(e.date) <= cutoff);
    return ref ? toDisplayWeight(latest.weight, unit) - toDisplayWeight(ref.weight, unit) : undefined;
  };
  const c7 = changeOver(7);
  const c30 = changeOver(30);

  return (
    <>
      <Card title="Log body weight">
        <form
          className="inline-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (value && value > 0) logBodyWeight(date, fromDisplayWeight(value, unit));
          }}
        >
          <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} aria-label="Date" />
          <div className="input-unit">
            <NumberInput value={value} onChange={setValue} step={0.1} placeholder="Weight" ariaLabel="Body weight" />
            <span>{unit}</span>
          </div>
          <button className="btn primary" type="submit">
            Save
          </button>
        </form>
        <p className="muted small">Tip: weigh yourself in the morning, after the bathroom, before eating. Watch the 7-day average, not single days.</p>
      </Card>

      {latest ? (
        <>
          <div className="stats-grid">
            <Stat label="Current" value={formatWeight(latest.weight, unit, 1)} sub={formatShortDate(latest.date)} />
            <Stat label="7-day change" value={c7 === undefined ? '—' : <Delta value={c7} unit={unit} invert />} />
            <Stat label="30-day change" value={c30 === undefined ? '—' : <Delta value={c30} unit={unit} invert />} />
          </div>
          <Card title="Trend">
            <TrendChart
              data={data}
              unit={unit}
              series={[
                { key: 'weight', name: 'Weight', color: '#3b82f6' },
                { key: 'average', name: '7-day avg', color: '#22c55e', dashed: true },
              ]}
            />
          </Card>
          <Card title="Entries">
            <ul className="entry-list">
              {[...entries].reverse().map((e) => (
                <li key={e.id}>
                  <span>{formatDate(e.date)}</span>
                  <span>{formatWeight(e.weight, unit, 1)}</span>
                  <button
                    className="icon-btn small"
                    aria-label="Delete entry"
                    onClick={() => confirm('Delete this entry?') && deleteBodyWeight(e.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <Card>
          <Empty>No weigh-ins yet. Log your first one above.</Empty>
        </Card>
      )}
    </>
  );
}

const fmtMeasure = (v: number, percent: boolean | undefined, unit: Unit) =>
  percent ? `${round(v, 1)}%` : `${toDisplayLength(v, unit)} ${lengthUnit(unit)}`;

function MeasurementSection() {
  const state = useAppState();
  const { unit } = state.settings;
  const entries = state.measurements;
  const lu = lengthUnit(unit);
  const [date, setDate] = useState(todayISO());
  const [form, setForm] = useState<Partial<Record<MeasurementKey, number>>>({});
  const [chartKey, setChartKey] = useState<MeasurementKey>('waist');

  const save = () => {
    const values: Partial<Record<MeasurementKey, number>> = {};
    for (const m of MEASUREMENTS) {
      const v = form[m.key];
      if (v !== undefined && v > 0) values[m.key] = m.percent ? v : fromDisplayLength(v, unit);
    }
    if (!Object.keys(values).length) return;
    logMeasurements(date, values);
    setForm({});
  };

  const latestOf = (key: MeasurementKey) => [...entries].reverse().find((e) => e.values[key] !== undefined);
  const firstOf = (key: MeasurementKey) => entries.find((e) => e.values[key] !== undefined);

  const chartMeta = MEASUREMENTS.find((m) => m.key === chartKey)!;
  const chartData = entries
    .filter((e) => e.values[chartKey] !== undefined)
    .map((e) => ({
      date: e.date,
      value: chartMeta.percent ? e.values[chartKey]! : toDisplayLength(e.values[chartKey]!, unit),
    }));

  return (
    <>
      <Card title="Log measurements">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label>
            Date
            <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </label>
          <div className="measure-grid">
            {MEASUREMENTS.map((m) => {
              const prev = latestOf(m.key)?.values[m.key];
              return (
                <label key={m.key}>
                  {m.label} ({m.percent ? '%' : lu})
                  <NumberInput
                    value={form[m.key]}
                    step={0.1}
                    placeholder={prev !== undefined ? String(m.percent ? prev : toDisplayLength(prev, unit)) : ''}
                    onChange={(v) => setForm((f) => ({ ...f, [m.key]: v }))}
                  />
                </label>
              );
            })}
          </div>
          <p className="muted small">Fill in only what you measured. Measure relaxed, same time of day, tape snug but not tight.</p>
          <button className="btn primary" type="submit">
            Save measurements
          </button>
        </form>
      </Card>

      {entries.length ? (
        <>
          <Card title="Latest vs first">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Measurement</th>
                    <th>Latest</th>
                    <th>Change</th>
                  </tr>
                </thead>
                <tbody>
                  {MEASUREMENTS.map((m) => {
                    const l = latestOf(m.key);
                    const f = firstOf(m.key);
                    if (!l || !f) return null;
                    const lv = l.values[m.key]!;
                    const fv = f.values[m.key]!;
                    const diff = m.percent ? lv - fv : toDisplayLength(lv, unit) - toDisplayLength(fv, unit);
                    return (
                      <tr key={m.key} className="clickable" onClick={() => setChartKey(m.key)}>
                        <td>{m.label}</td>
                        <td>{fmtMeasure(lv, m.percent, unit)}</td>
                        <td>
                          {l === f ? (
                            <span className="muted">—</span>
                          ) : (
                            <Delta value={diff} unit={m.percent ? '%' : lu} invert={m.lowerIsBetter} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Trend">
            <select value={chartKey} onChange={(e) => setChartKey(e.target.value as MeasurementKey)} aria-label="Measurement">
              {MEASUREMENTS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            {chartData.length ? (
              <TrendChart
                data={chartData}
                unit={chartMeta.percent ? '%' : lu}
                series={[{ key: 'value', name: chartMeta.label, color: '#a855f7' }]}
              />
            ) : (
              <Empty>No {chartMeta.label.toLowerCase()} measurements yet.</Empty>
            )}
          </Card>

          <Card title="Entries">
            <ul className="entry-list">
              {[...entries].reverse().map((e) => (
                <li key={e.id} className="measure-entry">
                  <div>
                    <strong>{formatDate(e.date)}</strong>
                    <div className="muted small">
                      {MEASUREMENTS.filter((m) => e.values[m.key] !== undefined)
                        .map((m) => `${m.label} ${fmtMeasure(e.values[m.key]!, m.percent, unit)}`)
                        .join(' · ')}
                    </div>
                  </div>
                  <button
                    className="icon-btn small"
                    aria-label="Delete entry"
                    onClick={() => confirm('Delete this entry?') && deleteMeasurement(e.id)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        </>
      ) : (
        <Card>
          <Empty>No measurements yet. Log a baseline today — it's motivating to look back on.</Empty>
        </Card>
      )}
    </>
  );
}
