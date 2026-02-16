# Release Checklist

## 1) Preflight

- Confirm `.env` has a valid `DB_URL` with `mongodb://` or `mongodb+srv://`.
- Confirm JWT and realtime flags are set for the target environment.
- Confirm `MIGRATION_DRY_RUN=true` before first migration run.

PowerShell:

```powershell
cd backend
npm ci
```

## 2) Migration Validation (Dry Run)

PowerShell:

```powershell
cd backend
$env:MIGRATION_DRY_RUN='true'
npm run migrate:tenant
npm run migrate:financial
```

Expected:

- No connection string or DNS errors
- No write actions performed
- Summary output printed for each migration

## 3) Migration Write Mode

PowerShell:

```powershell
cd backend
$env:MIGRATION_DRY_RUN='false'
npm run migrate:tenant
npm run migrate:financial
```

Expected:

- Tenant backfill completed
- Valuation configs seeded
- Cost layers seeded for on-hand inventory where missing

## 4) Test Gate

PowerShell:

```powershell
cd backend
npm run test:finance-realtime
```

Minimum pass criteria:

- Valuation math tests pass
- COGS lifecycle integration passes
- Socket auth/isolation tests pass
- PO receive -> realtime -> valuation smoke test passes

## 5) Deploy with Safe Flags

Start with realtime disabled:

```env
REALTIME_ENABLED=false
REALTIME_REDIS_ENABLED=false
```

After API health checks pass, enable realtime:

```env
REALTIME_ENABLED=true
```

Enable Redis adapter only after Redis connectivity is verified:

```env
REALTIME_REDIS_ENABLED=true
REALTIME_REDIS_URL=redis://<host>:6379
```

## 6) Post-Deploy Verification

- `GET /health` returns `status: ok`.
- `GET /api/finance/valuation` succeeds for an admin/manager user.
- `GET /api/finance/realtime-stats` shows emit counters after PO receive and sale completion events.
- Socket clients receive only same-organization events.

## 7) Rollback Triggers

Rollback if any of the following occur:

- Realtime auth failures spike
- COGS inserts fail or duplicate key errors spike unexpectedly
- Inventory valuation totals diverge from baseline beyond accepted tolerance

Immediate rollback actions:

1. Set `REALTIME_ENABLED=false` and redeploy config.
2. Disable Redis adapter if enabled.
3. Re-run finance endpoint sanity checks and compare totals.
