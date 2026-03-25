# Invendex

Invendex is a multi-tenant inventory and purchasing platform with:

- warehouse-aware inventory,
- serial/batch tracking,
- financial valuation/COGS flows,
- realtime updates,
- role-based access control.

## Monorepo Structure

- `backend/` Express + MongoDB API, Socket.IO realtime, cron jobs, background jobs
- `frontend/` React 18 + Vite web app
- `desktop/` Electron shell that runs the bundled backend and frontend together
- `e2e/` Playwright smoke coverage
- `ops/` monitoring and deployment support files
- `scripts/` root dev, desktop packaging, and release helpers

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or Atlas)
- Redis is optional and only needed for BullMQ-backed background jobs or scaled realtime/rate limiting

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

Dev defaults:

- frontend: `http://localhost:3000`
- backend health: `http://localhost:4000/health`
- API docs: `http://localhost:4000/api/docs` and `http://localhost:4000/api/v1/docs`

## Desktop App

Prepare the desktop bundle and run Electron locally:

```bash
npm run desktop:dev
```

Create a packaged desktop build:

```bash
npm run desktop:build
```

`npm run desktop:build` now produces:

- an installable Windows NSIS installer in `desktop-dist/`
- `latest.yml` and `.blockmap` files for desktop auto-updates
- a `win-unpacked/` folder for local verification

The desktop runtime is intentionally explicit. The backend only serves bundled desktop assets when `INVENDEX_DESKTOP_RUNTIME=true`.

Desktop distribution and update-feed setup are documented in [docs/desktop-distribution.md](docs/desktop-distribution.md).
GitHub Releases publishing is automated by [.github/workflows/desktop-release.yml](.github/workflows/desktop-release.yml).

## Quality Commands

- Repo hygiene:

```bash
npm run check:repo-hygiene
```

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

- End-to-end smoke:

```bash
npm run test:e2e
```

Notes:

- backend tests require MongoDB and default to `mongodb://127.0.0.1:27017/invendex_test`
- Playwright starts an isolated stack on frontend `3100` and backend `4100`

## Environment and Secrets

- Never commit real secrets.
- Use `backend/.env.example` as the canonical template.
- Keep local `.env` files untracked. The repo hygiene check will fail if a real `.env` file is committed.
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

- repo hygiene checks,
- backend format/lint/test,
- frontend format/lint/test/build,
- Playwright smoke coverage.
