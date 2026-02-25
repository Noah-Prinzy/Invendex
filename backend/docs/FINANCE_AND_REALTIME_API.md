# Finance and Realtime API

## Base assumptions

- All finance endpoints are organization-scoped.
- Auth: bearer JWT access token.
- Finance endpoints require role: `admin` or `manager`.
- Realtime events are emitted to organization rooms: `org:<organizationId>`.

## Auth REST Endpoints

### `POST /auth/register`

Creates a new organization and first admin account (signup).

Body:

```json
{
  "email": "owner@company.com",
  "password": "Password123!",
  "organizationName": "Company Ops"
}
```

Notes:

- Returns `201` on success.
- Sets `refreshToken` httpOnly cookie.
- Returns `accessToken`, `user`, and `organization`.

### `POST /auth/login`

Signs in an existing user.

Body:

```json
{
  "email": "owner@company.com",
  "password": "Password123!"
}
```

Notes:

- Returns `200` on success.
- Sets `refreshToken` httpOnly cookie.
- Returns `accessToken` and `user`.

### `POST /auth/refresh`

Rotates refresh token and returns a fresh access token.

### `POST /auth/logout`

Invalidates current session token and clears refresh cookie.
Requires bearer access token.

### `GET /auth/me`

Returns current authenticated user profile.
Requires bearer access token.

## Finance REST Endpoints

All finance endpoints enforce request validation. Invalid query/body values return `400` with a descriptive message.

### `GET /api/finance/valuation`

Compute inventory valuation.

Query params:

- `warehouseId` (optional): limit to one warehouse
- `method` (optional): `FIFO | LIFO | WEIGHTED_AVG`

Response fields:

- `method`
- `totalInventoryValue`
- `itemCount`
- `byProduct[]`

### `GET /api/finance/valuation-method`

Get organization valuation config.

Response fields:

- `defaultMethod`
- `allowMethodOverride`

### `PATCH /api/finance/valuation-method`

Update organization valuation config.

Body:

```json
{
  "defaultMethod": "WEIGHTED_AVG",
  "allowMethodOverride": true
}
```

### `GET /api/finance/cogs`

Get COGS entries.

Query params:

- `from` (optional, ISO date)
- `to` (optional, ISO date)
- `productId` (optional)
- `warehouseId` (optional)

### `GET /api/finance/gross-margin`

Get gross margin analytics from order revenue and COGS entries.

Query params:

- `from` (optional, ISO date)
- `to` (optional, ISO date)
- `groupBy` (optional): `day | product | category` (default `day`)

### `GET /api/finance/dead-stock`

Get stale stock based on `Inventory.lastMovementAt`.

Query params:

- `days` (optional, default `90`)
- `warehouseId` (optional)

### `GET /api/finance/realtime-stats`

Returns in-process websocket emit counters by event name.

## Orders API (sale COGS flow)

### `POST /api/orders`

Create order.

For sale orders (`type="sale"`), each line must include:

- `product`
- `quantity`
- `warehouse` (or order-level `warehouse`)
- `unitSalePrice`
- optional `discountAmount`, `taxAmount`

If created with `status="completed"` and `type="sale"`, COGS is recorded immediately.

### `PATCH /api/orders/:id/complete`

Completes order.

- Sale orders trigger COGS recording and inventory decrement.
- Purchase orders only change status to `completed`.

## Realtime Socket.IO

## Connect

Socket auth supports either:

- `auth.token` (`Bearer <JWT>` or raw JWT)
- `authorization` header as `Bearer <JWT>`

Join behavior:

- auto-join organization room `org:<organizationId>`
- optional warehouse room subscription:
  - emit `subscribe:warehouse` with `{ "warehouseId": "<id>" }`
  - emit `unsubscribe:warehouse` with `{ "warehouseId": "<id>" }`

## Event Names

- `inventory.updated`
- `purchase_order.created`
- `purchase_order.updated`
- `purchase_order.received`
- `finance.cogs_recorded`
- `finance.valuation_updated`

## Event payload shape

```json
{
  "organizationId": "org_id",
  "occurredAt": "2026-02-16T00:00:00.000Z",
  "actorUserId": "user_id_or_null",
  "entityId": "entity_id_or_null",
  "entityType": "INVENTORY|PURCHASE_ORDER|COGS_ENTRY|INVENTORY_VALUATION",
  "data": {}
}
```

## Realtime Env Flags

Use `.env.example`:

- `REALTIME_ENABLED`
- `SOCKET_CORS_ORIGIN`
- `REALTIME_REDIS_ENABLED`
- `REALTIME_REDIS_URL`

If `REALTIME_REDIS_ENABLED=true`, install:

```bash
npm install @socket.io/redis-adapter redis
```

Without those packages, server logs a warning and continues without Redis adapter.

## Targeted Test Command

```bash
npm run test:finance-realtime
```

## Operations hardening

See `docs/OBSERVABILITY_AND_RECOVERY.md` for:

- request tracing and slow query logging settings
- health/readiness endpoints
- backup snapshot and restore simulation commands
