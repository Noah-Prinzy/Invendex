# API Docs

Invendex exposes the backend under both `/api` and `/api/v1`.

Current notable route groups:

- `GET /health`, `GET /metrics`, `GET /api/health`, `GET /api/v1/health`
- `POST /auth/*` and `POST /api/v1/auth/*`
- `/api/onboarding` and `/api/v1/onboarding`
- `/api/reports` and `/api/v1/reports`
- `/api/dashboard` and `/api/v1/dashboard`
- `/api/inventory-reports/export` and `/api/v1/inventory-reports/export`

OpenAPI / Swagger:

- Legacy docs: `/api/docs`
- Versioned docs: `/api/v1/docs`
- OpenAPI JSON: `/api/openapi.json` and `/api/v1/openapi.json`

High-level response shape:

```json
{
  "success": true,
  "message": "Human-readable summary",
  "data": {}
}
```

Error shape:

```json
{
  "success": false,
  "message": "What failed",
  "code": "OPTIONAL_MACHINE_CODE"
}
```

Operational notes:

- Auth uses JWT access and refresh tokens.
- Report exports run through background jobs for heavier file generation.
- Inventory report exports and report summary exports are separate job flows.
- Real-time features rely on Socket.IO with the backend as the event source.

Recommended next documentation additions:

- Endpoint-by-endpoint auth requirements
- Sample request/response payloads for reports and dashboard intelligence
- Error code catalog once more endpoints adopt machine-readable codes
