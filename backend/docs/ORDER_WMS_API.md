# Order and WMS API Contract

## Scope

This document defines request/validation contracts for:

- `/api/orders`
- `/api/wms`

All endpoints are organization-scoped and require JWT auth.

## Access and Guardrails

- Order routes require role: `admin | manager | staff`
- WMS routes require role: `admin | manager | staff`
- All mutation routes are rate-limited and audited
- Validation failures return `400` with `success=false` and a descriptive `message`

---

## Orders API

Base route: `/api/orders`

### `POST /api/orders`

Create an order.

Body schema:

```json
{
  "type": "sale",
  "status": "pending",
  "warehouse": "mongo_object_id_optional",
  "products": [
    {
      "product": "mongo_object_id_required",
      "quantity": 2,
      "warehouse": "mongo_object_id_optional",
      "unitSalePrice": 45,
      "discountAmount": 0,
      "taxAmount": 0,
      "lotNumber": "LOT-001",
      "serialNumbers": ["SN-001", "SN-002"]
    }
  ]
}
```

Validation rules:

- `type` required: `purchase | sale`
- `status` optional: `pending | completed | cancelled`
- `products` required: non-empty array
- `products[*].product` required, valid ObjectId, and must exist in org
- `products[*].quantity` required, positive integer
- `warehouse` (top-level) optional, valid ObjectId, must exist in org
- `products[*].warehouse` optional, valid ObjectId, must exist in org
- For `sale` type:
  - each line needs an effective warehouse: line `warehouse` or top-level `warehouse`
  - each line requires `unitSalePrice`
  - `serialNumbers` if provided must:
    - have no blanks
    - be unique
    - count exactly equal to `quantity`

Common `400` messages:

- `unitSalePrice is required for each sale line item`
- `warehouse is required per sale line item (or set top-level warehouse)`
- `serialNumbers count must equal quantity for sale line item`

### `GET /api/orders`

Query filters:

- `type` optional: `purchase | sale`
- `status` optional: `pending | completed | cancelled`

### `GET /api/orders/:id`

Path:

- `id` required, valid ObjectId, must belong to current org

### `PATCH /api/orders/:id/complete`

Path:

- `id` required, valid ObjectId, must belong to current org

Behavior:

- For `sale` orders: triggers COGS + inventory decrement flow
- For `purchase` orders: marks as `completed`

---

## WMS API

Base route: `/api/wms`

### `POST /api/wms/bins`

Create warehouse bin.

Body:

```json
{
  "warehouseId": "mongo_object_id",
  "code": "BIN-A1",
  "zone": "A",
  "aisle": "01",
  "rack": "R1",
  "shelf": "S1",
  "binType": "PICK_FACE",
  "maxCapacityUnits": 100,
  "replenishmentMinUnits": 10,
  "replenishmentTargetUnits": 20
}
```

Validation:

- `warehouseId` required and must exist in org
- `code` required (1-64 chars)
- `binType` optional: `STORAGE | PICK_FACE | STAGING | QUARANTINE`
- numeric fields must be non-negative integers
- if both provided: `replenishmentTargetUnits >= replenishmentMinUnits`

### `GET /api/wms/bins`

Query:

- `warehouseId` optional, valid org warehouse
- `includeInactive` optional boolean

### `PATCH /api/wms/bins/:binId/rules`

Body:

```json
{
  "warehouseId": "mongo_object_id",
  "maxCapacityUnits": 120,
  "replenishmentMinUnits": 20,
  "replenishmentTargetUnits": 40
}
```

Validation:

- `binId` path required, valid org bin
- `warehouseId` required, valid org warehouse
- at least one rules field required
- if both provided: `replenishmentTargetUnits >= replenishmentMinUnits`

### `POST /api/wms/bins/allocate`

Body:

```json
{
  "warehouseId": "mongo_object_id",
  "binId": "mongo_object_id",
  "productId": "mongo_object_id",
  "quantity": 5,
  "reason": "Manual allocation"
}
```

Validation:

- all IDs required and organization-scoped
- `binId` must belong to provided `warehouseId`
- `quantity` required positive integer

### `POST /api/wms/bins/transfer`

Body:

```json
{
  "warehouseId": "mongo_object_id",
  "productId": "mongo_object_id",
  "fromBinId": "mongo_object_id",
  "toBinId": "mongo_object_id",
  "quantity": 2,
  "reason": "Rebalance"
}
```

Validation:

- all IDs required and org-scoped
- both bins must exist in provided warehouse
- `fromBinId` and `toBinId` must be different
- `quantity` required positive integer

Common `400` message:

- `fromBinId and toBinId must be different`

### `POST /api/wms/pick-tickets`

Body:

```json
{
  "warehouseId": "mongo_object_id",
  "notes": "Priority order",
  "items": [
    {
      "productId": "mongo_object_id",
      "quantity": 2,
      "lotNumber": "LOT-001",
      "serialNumbers": ["SN-001", "SN-002"]
    }
  ]
}
```

Validation:

- `warehouseId` required, org-scoped
- `items` required non-empty array
- each item must include `productId` (or `product`) and positive quantity
- each item product must exist in org
- serial numbers (if provided) must be unique, non-blank, and count-match quantity

### `PATCH /api/wms/pick-tickets/:ticketId/start`

Path:

- `ticketId` required, valid ObjectId, must exist in org

### `PATCH /api/wms/pick-tickets/:ticketId/complete`

Path:

- `ticketId` required, valid ObjectId, must exist in org

### `GET /api/wms/movements`

Query:

- `warehouseId` optional, valid org warehouse
- `productId` optional, valid org product
- `type` optional:
  - `INBOUND | OUTBOUND | TRANSFER | ALLOCATION | PICK | ADJUSTMENT`
- `limit` optional integer `1..500`

### `GET /api/wms/replenishment`

Query:

- `warehouseId` required, valid org warehouse

---

## Error Response Shape

Validation/guardrail errors follow:

```json
{
  "success": false,
  "message": "human-readable validation message"
}
```

HTTP status for request validation errors: `400`.

---

## Frontend Integration Checklist

Use this section to wire frontend forms/actions to backend contracts without schema drift.

### 1) Create Order Screen

UI action:

- Submit order create form

Endpoint:

- `POST /api/orders`

Minimum payloads:

Purchase:

```json
{
  "type": "purchase",
  "warehouse": "65f0...abc",
  "products": [
    {
      "product": "65f0...def",
      "quantity": 10
    }
  ]
}
```

Sale:

```json
{
  "type": "sale",
  "warehouse": "65f0...abc",
  "products": [
    {
      "product": "65f0...def",
      "quantity": 2,
      "unitSalePrice": 45,
      "serialNumbers": ["SN-001", "SN-002"]
    }
  ]
}
```

Frontend pre-submit checks:

- `type` selected (`purchase|sale`)
- at least one line item
- each line has `product` + positive `quantity`
- for sale lines: effective warehouse + `unitSalePrice`
- if serials are entered: trim blanks, enforce uniqueness, enforce count = quantity

### 2) Complete Order Action

UI action:

- "Complete" button in order details/list row

Endpoint:

- `PATCH /api/orders/:id/complete`

Frontend checks:

- ensure `orderId` exists before triggering
- disable button while request is in flight

### 3) Create Bin Screen

UI action:

- Submit bin creation form

Endpoint:

- `POST /api/wms/bins`

Payload:

```json
{
  "warehouseId": "65f0...abc",
  "code": "BIN-A1",
  "binType": "PICK_FACE",
  "maxCapacityUnits": 100,
  "replenishmentMinUnits": 10,
  "replenishmentTargetUnits": 20
}
```

Frontend checks:

- `warehouseId` required
- `code` required (suggest uppercase normalization in UI)
- non-negative integers for numeric fields
- if both replenishment fields set: target >= min

### 4) Update Bin Rules Screen

UI action:

- Save bin rule edits

Endpoint:

- `PATCH /api/wms/bins/:binId/rules`

Payload:

```json
{
  "warehouseId": "65f0...abc",
  "replenishmentMinUnits": 15,
  "replenishmentTargetUnits": 30
}
```

Frontend checks:

- `binId` + `warehouseId` present
- at least one of: `maxCapacityUnits`, `replenishmentMinUnits`, `replenishmentTargetUnits`
- target >= min when both provided

### 5) Allocate Bin Stock Screen

UI action:

- Allocate inventory into a bin

Endpoint:

- `POST /api/wms/bins/allocate`

Payload:

```json
{
  "warehouseId": "65f0...abc",
  "binId": "65f0...bin",
  "productId": "65f0...prd",
  "quantity": 5,
  "reason": "Manual allocation"
}
```

Frontend checks:

- all IDs required
- positive integer `quantity`
- optional `reason` max-length guard (500)

### 6) Transfer Bin Stock Screen

UI action:

- Transfer stock from one bin to another

Endpoint:

- `POST /api/wms/bins/transfer`

Payload:

```json
{
  "warehouseId": "65f0...abc",
  "productId": "65f0...prd",
  "fromBinId": "65f0...bin1",
  "toBinId": "65f0...bin2",
  "quantity": 2,
  "reason": "Rebalance"
}
```

Frontend checks:

- all IDs required
- `fromBinId !== toBinId`
- positive integer `quantity`

### 7) Create Pick Ticket Screen

UI action:

- Submit pick ticket form

Endpoint:

- `POST /api/wms/pick-tickets`

Payload:

```json
{
  "warehouseId": "65f0...abc",
  "notes": "Priority",
  "items": [
    {
      "productId": "65f0...prd",
      "quantity": 2,
      "lotNumber": "LOT-001",
      "serialNumbers": ["SN-001", "SN-002"]
    }
  ]
}
```

Frontend checks:

- `warehouseId` required
- non-empty `items`
- each item has product + positive quantity
- serials (if present): unique, non-empty, count = quantity

### 8) Start / Complete Pick Ticket Actions

UI actions:

- Start pick ticket
- Complete pick ticket

Endpoints:

- `PATCH /api/wms/pick-tickets/:ticketId/start`
- `PATCH /api/wms/pick-tickets/:ticketId/complete`

Frontend checks:

- require `ticketId`
- disable action while pending
- refresh ticket list/details after success

### 9) Movement Ledger Filter UI

UI action:

- Load filtered movement list

Endpoint:

- `GET /api/wms/movements`

Allowed query params:

- `warehouseId?`
- `productId?`
- `type?` (`INBOUND|OUTBOUND|TRANSFER|ALLOCATION|PICK|ADJUSTMENT`)
- `limit?` (`1..500`)

### 10) Replenishment View

UI action:

- Load replenishment plan

Endpoint:

- `GET /api/wms/replenishment?warehouseId=<id>`

Frontend checks:

- `warehouseId` required before fetch

### Error UX Checklist

- On `400`: display backend `message` directly near the form/action
- On `403`: show role/access guidance
- On `409`: show conflict state and prompt refresh/reload
- Keep submit buttons disabled during in-flight mutation to avoid duplicates
