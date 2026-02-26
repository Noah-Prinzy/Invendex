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
- `METRICS_ENABLED`
- `METRICS_PREFIX`
- `METRICS_TOKEN` (optional bearer token guard for `/metrics`)
- `ERROR_TRACKING_WEBHOOK_URL`

## Prometheus metrics endpoint

- Route: `GET /metrics`
- Format: Prometheus text exposition
- Default: disabled (`METRICS_ENABLED=false`)
- Optional auth: set `METRICS_TOKEN` and call with `Authorization: Bearer <token>`

Example:

```powershell
curl http://127.0.0.1:4000/metrics
```

With token:

```powershell
curl -H "Authorization: Bearer <metrics_token>" http://127.0.0.1:4000/metrics
```

## Local monitoring stack (Prometheus + Grafana)

Files:

- `ops/monitoring/docker-compose.monitoring.yml`
- `ops/monitoring/prometheus/prometheus.yml`
- `ops/monitoring/grafana/provisioning/datasources/prometheus.yml`

Start stack:

```powershell
cd ops/monitoring
docker compose -f docker-compose.monitoring.yml up -d
```

Access:

- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3001` (default `admin/admin`)

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
