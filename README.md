# Invendex

Invendex is a multi-tenant inventory and purchasing platform with:

- warehouse-aware inventory,
- serial/batch tracking,
- financial valuation/COGS flows,
- realtime updates,
- role-based access control.

## Monorepo Structure

- `backend/` Express + MongoDB API
- `frontend/` React web app

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)

## Quick Start

1. Install dependencies:

```bash
npm ci
```

2. Configure backend env:

```bash
cp backend/.env.example backend/.env
```

Optional env splits:

- `backend/.env.development.example`
- `backend/.env.production.example`
- `frontend/.env.development.example`
- `frontend/.env.production.example`

3. Start backend + frontend together (single command):

```bash
npm run dev
```

Optional dedicated background worker (recommended when `BACKGROUND_JOB_QUEUE_ENABLED=true`):

```bash
npm run dev:worker
```

If you need one side only:

```bash
npm run dev:backend
npm run dev:frontend
```

## Quality Commands

- Backend lint/test:

```bash
npm --prefix backend run lint
npm --prefix backend test
```

- Frontend lint/test/build:

```bash
npm --prefix frontend run lint
npm --prefix frontend test
npm --prefix frontend run build
```

## Environment and Secrets

- Never commit real secrets.
- Use `backend/.env.example` as the canonical template.
- Backend runtime performs strict env validation and refuses startup on critical issues.

## Release Hygiene

- Do not ship `node_modules/` in git or release artifacts.
- Do not ship `.git/` history in release artifacts.
- Build from source in deploy environments (`npm ci` + build/test).

Create a clean release bundle (excludes `.git`, `node_modules`, local build/cache):

```bash
npm run release:bundle
```

## CI

GitHub Actions CI runs:

- backend format/lint/test,
- frontend format/lint/test/build.
