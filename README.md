# Lift Log — Workout App

A mobile-friendly workout tracker that **suggests your next workout**, **logs every set you lift**, and tracks **body weight and body measurements**, so you can see your strength and physique progress over time.

It runs in the browser as an installable app (PWA). There's no account and no server: your data stays on your device. Use **Settings → Export backup** to save a copy or move it to another device.

## Features

**Today (suggestions)**
- Picks your next training day from your split (Push/Pull/Legs, Upper/Lower or Full Body) based on what you did last.
- Gives a weight × reps target for every exercise using **double progression**:
  - hit the top of the rep range on every set → add weight (+2.5 kg on upper-body compounds, +5 kg on squats/deadlifts, +1 kg on isolation; 5/10/2.5 lb)
  - within the range → same weight, one more rep
  - below the range twice in a row → deload about 10%
- Weekly sets per muscle group (target is 10–20) and days since each muscle was last trained.
- Suggests a rest day after 3 or more training days in a row.

**Workout logger**
- Prefilled sets: edit the weight and reps, then tick each set when it's done.
- Shows what you lifted last time and the target for today.
- 90-second rest timer after each set (+30s / skip), with a vibration when it ends on phones.
- Add, remove or reorder exercises, create your own exercises, and add notes.
- When you finish, you get a summary with any **personal records** (heaviest weight, best estimated 1RM, most volume, most reps for bodyweight moves).

**Strength progress**
- Chart per exercise: estimated 1RM (Epley), top weight or volume.
- Session-by-session table, and an "All lifts" overview with % change since your first session.
- For bodyweight exercises (pull-ups, dips), your logged body weight is counted in the load.

**Body**
- Body weight log with a 7-day moving average and 7- and 30-day change.
- Measurements: neck, shoulders, chest, waist, hips, arms, thighs, calves and body fat %, with a trend chart and latest vs first comparison.

**Settings**: kg/cm or lb/in (all data is converted), training split, custom exercises, export/import/reset.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the suggestion and stats logic
npm run build      # static build in dist/
```

To use it on your phone, host `dist/` anywhere static (GitHub Pages, Netlify, Vercel), open it, and choose "Add to Home Screen".

## Code layout

```
src/lib/types.ts      data model (weights stored in kg, lengths in cm)
src/lib/exercises.ts  exercise library and training splits
src/lib/suggest.ts    next-day and progression suggestions
src/lib/stats.ts      1RM, PRs, volume, moving averages
src/lib/store.ts      localStorage-backed state and actions
src/pages/            Today, Workout, History, Progress, Body, Settings
```
