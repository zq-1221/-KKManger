# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Dev server on http://localhost:3000
npm run build    # Production build
npm run lint     # ESLint (Next.js v16 flat config)
```

No test runner is configured.

## Architecture

康康助手 — a personal health data tracker. Entirely client-side; no backend or database.

- **Framework**: Next.js 16.2.4 (App Router) + React 19.2.4 + TypeScript strict
- **Styling**: Tailwind CSS v4 with `@tailwindcss/postcss` plugin (no `tailwind.config.ts`)
- **Persistence**: `localStorage` via `lib/storage.ts` — CRUD helpers (`getRecords`, `addRecord`, `updateRecord`, `deleteRecord`). All functions are plain sync; no async.
- **Charts**: recharts 3.x (`LineChart`)

### Routes (App Router, all `'use client'`)

| Path | Page | Purpose |
|------|------|---------|
| `/` | `app/page.tsx` | Dashboard — latest record summary + weight/steps trend chart |
| `/record` | `app/record/page.tsx` | New record form |
| `/history` | `app/history/page.tsx` | All records with edit/delete |

### Components

- `NavBar` — fixed bottom tab bar with 3 navigation links
- `DataCard` — stat display card (color-coded: green/blue/purple/orange)
- `RecordForm` — reusable form for creating/editing a `HealthRecord`; auto-calculates BMI preview
- `TrendChart` — recharts `LineChart` showing last 7 records for weight or steps

### Data Model (`types/health.ts`)

`HealthRecord` has an `id` (base36 timestamp + random), `date` (ISO string), and optional numeric fields: `weight`, `height`, `bmi`, `systolic`, `diastolic`, `heartRate`, `steps`, `sleepHours`, `waterIntake`.

BMI is auto-calculated from weight+height in `lib/bmi.ts` and categorized as 偏瘦/正常/偏胖/肥胖.

### Key patterns

- Every page is `'use client'` — no server rendering used
- Records are sorted newest-first for history display
- The form supports both "create" and "edit" modes via `initialData` prop
- IDs are generated client-side: `Date.now().toString(36) + Math.random().toString(36).slice(2, 8)`
