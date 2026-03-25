# Architecture

Invendex is a JavaScript monorepo with three main runtime surfaces:

- `backend/`: Express API, Socket.IO, MongoDB/Mongoose, background jobs
- `frontend/`: React + Vite workspace UI
- `desktop/`: Electron shell that bundles the backend and built frontend

Current architectural shape:

1. The frontend talks to the backend over HTTP plus Socket.IO.
2. The backend owns business logic, validation, export jobs, and observability.
3. The desktop shell starts the backend locally and serves the built frontend bundle.
4. Windows desktop releases are packaged as NSIS installers, and installed copies can poll a hosted generic update feed for `latest.yml`.

Backend structure highlights:

- `src/controllers/`: HTTP controllers
- `src/routes/`: route registration
- `src/services/`: domain and infrastructure services
- `src/models/`: Mongoose schemas
- `src/middlewares/`: auth, rate limiting, caching, error handling
- `src/observability/`: request context, metrics, logging, error tracking

Frontend structure highlights:

- `src/components/`: shared UI and app shell pieces
- `src/features/`: feature-oriented pages
- `src/hooks/`: reusable app logic
- `src/themes/`: theme catalog and persistence helpers
- `src/styles/`: global and feature CSS

Important runtime patterns:

- API routes are mounted under both `/api` and `/api/v1`.
- Environment validation is centralized in `backend/src/config/envConfig.js`.
- Export-heavy work is queued instead of always responding inline.
- The frontend does not use React Router; tab state is managed inside the authenticated workspace shell.

Known areas of architectural overlap:

- There are both `backend/src/errors/AppError.js` and `backend/src/utils/AppError.js`.
- There are both `backend/src/utils/response.js` and `backend/src/utils/apiResponse.js`.
- Desktop resource mirrors exist under `desktop-resources/` and should be treated carefully because they are packaging-related.

Recommended near-term cleanup themes:

- Consolidate duplicated error/response helpers behind one import path
- Continue converting inline report/dashboard helpers into reusable frontend modules
- Add stronger contracts for integration providers as external sync features grow
