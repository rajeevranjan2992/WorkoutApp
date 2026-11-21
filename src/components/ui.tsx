import { useEffect, useState, type ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatShortDate } from '../lib/units';

export const Card = ({ title, action, children }: { title?: ReactNode; action?: ReactNode; children: ReactNode }) => (
  <section className="card">
    {(title || action) && (
      <header className="card-header">
        {title && <h2>{title}</h2>}
        {action}
      </header>
    )}
    {children}
  </section>
);

export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;

/**
 * Number input that keeps the user's raw text while typing (so "62." or "" don't get clobbered)
 * and reports parsed numbers upward.
 */
export const NumberInput = ({
  value,
  onChange,
  step = 'any',
  min = 0,
  placeholder,
  className,
  ariaLabel,
}: {
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  step?: number | 'any';
  min?: number;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}) => {
  const [text, setText] = useState(value === undefined ? '' : String(value));
  useEffect(() => {
    const parsed = text.trim() === '' ? undefined : Number(text);
    if (parsed !== value) setText(value === undefined ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      value={text}
      placeholder={placeholder}
      className={className}
      aria-label={ariaLabel}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        setText(e.target.value);
        const v = e.target.value.trim() === '' ? undefined : Number(e.target.value);
        if (v === undefined || Number.isFinite(v)) onChange(v);
      }}
    />
  );
};

export const Stat = ({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) => (
  <div className="stat">
    <div className="stat-label">{label}</div>
    <div className="stat-value">{value}</div>
    {sub && <div className="stat-sub">{sub}</div>}
  </div>
);

export const Delta = ({ value, unit, invert = false }: { value: number; unit: string; invert?: boolean }) => {
  if (Math.abs(value) < 0.05) return <span className="muted">±0 {unit}</span>;
  const good = invert ? value < 0 : value > 0;
  return (
    <span className={good ? 'good' : 'bad'}>
      {value > 0 ? '+' : ''}
      {Math.round(value * 10) / 10} {unit}
    </span>
  );
};

export interface Series {
  key: string;
  name: string;
  color: string;
  dashed?: boolean;
}

export const TrendChart = ({
  data,
  series,
  unit,
  height = 240,
}: {
  data: Record<string, number | string | undefined>[];
  series: Series[];
  unit: string;
  height?: number;
}) => (
  <div className="chart">
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <CartesianGrid stroke="currentColor" strokeOpacity={0.1} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => formatShortDate(d)}
          tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }}
          stroke="currentColor"
          strokeOpacity={0.2}
          minTickGap={24}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.7 }}
          stroke="currentColor"
          strokeOpacity={0.2}
          width={48}
        />
        <Tooltip
          contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8 }}
          labelFormatter={(d: string) => formatShortDate(d)}
          formatter={(v: number, name: string) => [`${Math.round(v * 10) / 10} ${unit}`, name]}
        />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2}
            strokeDasharray={s.dashed ? '5 4' : undefined}
            dot={s.dashed ? false : { r: 3 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);
