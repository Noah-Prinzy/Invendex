# Observability and Recovery

## Observability features

- Structured JSON logs with per-request correlation IDs.
- Request completion logging with duration and status.
- Slow Mongo query logging via `SLOW_QUERY_THRESHOLD_MS`.
- Centralized exception capture with optional webhook forwarding.
- Readiness/liveness health endpoints:
  - `GET /health/live`
  - `GET /health/ready`
  - `GET /health` (aggregated status)

## Required environment variables

Use `.env.example` as baseline and review:

- `LOG_LEVEL`
- `REQUEST_LOG_ENABLED`
- `HTTP_LOGGER`
- `SLOW_QUERY_THRESHOLD_MS`
- `HEALTHCHECK_DB_TIMEOUT_MS`
- `ERROR_TRACKING_WEBHOOK_URL`

## Backup snapshot workflow

Generate inventory/finance snapshots:

```powershell
cd backend
npm run backup:snapshot
```

Optional scoped backup for one organization:

```powershell
cd backend
$env:BACKUP_ORGANIZATION_ID='<organizationId>'
npm run backup:snapshot
```

Output:

- Directory: `backups/snapshots/<timestamp>`
- Per-collection JSONL files
- `manifest.json` with counts and SHA256 checksums

## Restore simulation workflow

Validate most recent backup manifest (read-only by default):

```powershell
cd backend
npm run backup:simulate-restore
```

Validate a specific manifest:

```powershell
cd backend
npm run backup:simulate-restore -- backups/snapshots/<timestamp>/manifest.json
```

Optional write-mode simulation into temporary collections:

```powershell
cd backend
$env:SIMULATE_RESTORE_WRITE='true'
$env:SIMULATE_RESTORE_CLEANUP='true'
npm run backup:simulate-restore
```

Write-mode behavior:

- Inserts backup documents into temporary collections named `restore_sim_<runId>_*`.
- Verifies counts/checksums before insertion.
- Drops temporary collections automatically when cleanup is enabled.
