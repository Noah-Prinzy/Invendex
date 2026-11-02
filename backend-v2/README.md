# Invendex backend-v2 (workstream: Albert)

NestJS v11 + TypeScript (strict) modular monolith, built next to the legacy
`backend/` (untouched — strategy B: parallel rebuild + staged cutover, see
`docs/transform-plan.md`). The public contract stays at `/api/v1` with the
legacy response envelope `{ success, message, data, meta? }`.

## Layout

```
src/
├── main.ts                  API entrypoint (HTTP)
├── worker.ts                BullMQ worker entrypoint (heavy deps load here only)
├── app.module.ts            root module, global guards
├── config/                  zod-validated env
├── common/                  pipes (Zod), guards, decorators, filters, middleware
├── tenant/                  ALS tenant context + mongoose tenant-isolation plugin
├── events/                  domain-event bus (BullMQ in prod, in-memory in tests)
├── jobs/                    worker processors; xlsx/pdfkit/bwip-js imported lazily
├── persistence/schemas/     mongoose schemas (organization-first indexes)
└── modules/                 health, auth, rbac, audit, efiris, payments,
                             channels, currency, i18n (+ inventory, purchase-orders)
```

## Scripts

- `npm run dev` / `npm start` — API
- `npm run worker` / `npm start:worker` — BullMQ worker (exports, barcode labels, events)
- `npm run lint && npm test && npm run build` — CI gate before pushing

## Multi-tenant hardening

Every authenticated request runs inside an ALS tenant context
(`TenantContext`). A global mongoose plugin fails **any** query/aggregate/save
that is missing the `organization` filter or whose organization does not match
the active tenant (`TenantIsolationError`, HTTP 500 — fail closed). System-level
lookups must pass `{ tenantBypass: true }` explicitly. Compound indexes start
with `organization`.

## Notes

- `xss-clean` (deprecated) is replaced by strict Zod DTO parsing (unknown keys
  rejected), `express-mongo-sanitize`-equivalent key sanitizing on body/params,
  helmet, and JSON-only responses.
- Responses are Brotli-compressed when the client accepts `br` (gzip fallback).
- All list endpoints are paginated (`page`, `limit` <= 100, `sort`, `q`).
- Audit logs carry a TTL index (`AUDIT_LOG_TTL_DAYS`); snapshots/metrics get
  TTL/rollup archival with their modules.
