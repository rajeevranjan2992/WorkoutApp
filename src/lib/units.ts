import type { Unit } from './types';

export const KG_PER_LB = 0.45359237;
export const CM_PER_IN = 2.54;

export const round = (value: number, decimals = 1): number => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

export const roundToStep = (value: number, step: number): number => Math.round(value / step) * step;

/** kg -> user's unit, rounded for display. */
export const toDisplayWeight = (kg: number, unit: Unit): number =>
  round(unit === 'kg' ? kg : kg / KG_PER_LB, 2);

/** user's unit -> kg (stored unrounded so round-trips stay exact). */
export const fromDisplayWeight = (value: number, unit: Unit): number =>
  unit === 'kg' ? value : value * KG_PER_LB;

export const formatWeight = (kg: number, unit: Unit, decimals = 2): string => `${round(toDisplayWeight(kg, unit), decimals)} ${unit}`;

export const lengthUnit = (unit: Unit): 'cm' | 'in' => (unit === 'kg' ? 'cm' : 'in');

export const toDisplayLength = (cm: number, unit: Unit): number =>
  round(unit === 'kg' ? cm : cm / CM_PER_IN, 1);

export const fromDisplayLength = (value: number, unit: Unit): number =>
  unit === 'kg' ? value : value * CM_PER_IN;

/** Local calendar date as YYYY-MM-DD. */
export const todayISO = (d = new Date()): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDate = (iso: string): string =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatShortDate = (iso: string): string =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
