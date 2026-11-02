# Invendex frontend-v2

Next-generation Invendex web app (parallel rebuild — the legacy `frontend/` stays
untouched until staged cutover).

## Stack

- Vite + React 19 + TypeScript (strict)
- TanStack Router (routes in `src/router.tsx`) + TanStack Query
- Zustand (`src/state/appStore.ts`)
- Tailwind CSS v4 + shadcn/ui (Radix) components in `src/components/ui`
- Preset: `registry/invendex-preset.json` (remote id `b3tgXjxGGA`), RTL enabled
- Biome for lint/format, Vitest + Testing Library for tests
- Local-first offline: Dexie/IndexedDB outbox (`src/lib/db.ts`, `src/lib/sync.ts`)
  - service worker (`public/sw.js`) with Background Sync

## Commands

```bash
npm install
npm run dev          # port 3100 (set PORT env to change)
npm test
npm run lint
npm run build        # tsc + vite build
npm run check:bundle-budget   # enforces dist size budgets
```

## Env

See `.env.example` — `VITE_API_BASE_URL`, `VITE_SOCKET_BASE_URL`, `VITE_OFFLINE_MODE`.
