# Inventory Tracking and Dashboard API

Related docs:

- `docs/ORDER_WMS_API.md` (strict order and WMS payload validation rules)

## Serial and Batch Tracking

All endpoints are organization-scoped and require JWT auth.

Base route: `/api/inventory-tracking`

- `GET /batches`
  - Query: `productId?`, `warehouseId?`, `includeRecalled?`, `limit?`
  - Returns tracked batch lots with quantities, expiry, and recall status.

- `GET /serials`
  - Query: `productId?`, `warehouseId?`, `lotNumber?`, `status?`, `limit?`
  - Returns serial-level inventory records and statuses (`AVAILABLE`, `RESERVED`, `SOLD`, `RECALL_HOLD`, etc.).

- `GET /serials/:serialNumber/history`
  - Query: `productId?` (recommended when serial format may overlap across products)
  - Returns serial identity + timeline events (`RECEIVED`, `SOLD`, `RECALL_HOLD`, movement events).

- `POST /serials/reserve`
  - Body: `productId`, `warehouseId`, optional `lotNumber`, optional `serialNumbers[]`, optional `quantity`, optional `referenceType`, optional `referenceId`
  - Reserves serials for fulfillment (`status=RESERVED`).

- `POST /serials/release`
  - Body: `serialNumbers[]`, optional `referenceId`
  - Releases previously reserved serials back to `AVAILABLE`.

- `POST /serials/verify-scan`
  - Body: `serialNumber`, optional `productId`, optional `warehouseId`, optional `expectedStatuses[]`, optional `expectedReferenceId`
  - Returns scan validation result for handheld/mobile fulfillment flows.

- `POST /recall`
  - Roles: `admin`, `manager`
  - Body:
    - `productId` (required)
    - `lotNumber` (required)
    - `warehouseId` (optional)
    - `reason` (optional)
  - Applies recall hold to matching batches and serials (`RECALL_HOLD`).

## Purchase Order Tracking Fields

PO item supports optional tracking fields:

- `trackingType`: `NONE | BATCH | SERIAL`
- `lotNumber`: required when `trackingType=BATCH`
- `expiryDate`: optional ISO date
- `serialNumbers`: required when `trackingType=SERIAL`, must match `quantity`

On PO receive, tracked items are persisted into:

- `InventoryBatch`
- `InventorySerial`

On outbound completion:

- Sale completion (`recordCogsForCompletedSaleOrder`) marks consumed serials as `SOLD`.
- Pick/pack completion (`completePickTicket`) marks consumed serials as `SOLD`.
- Associated batch lots are decremented on outbound for both sale and pick/pack flows.

Optional outbound line fields:

- `Order.products[].lotNumber`
- `Order.products[].serialNumbers[]` (count must equal line quantity)
- `PickTicket.items[].lotNumber`
- `PickTicket.items[].serialNumbers[]` (count must equal requested quantity)

## FEFO, Capacity, Replenishment (WMS)

### FEFO pick enforcement

- Pick ticket creation enforces FEFO lot choice when batch data exists.
- If a later lot is requested while an earlier-expiring lot has stock, request is rejected unless `fefoOverride=true`.
- If `lotNumber` is omitted, system auto-selects FEFO lot.
- If serials are omitted, system auto-selects FEFO serials from available stock.

### Bin capacity rules

Warehouse bin supports:

- `maxCapacityUnits`
- `replenishmentMinUnits`
- `replenishmentTargetUnits`

Capacity is enforced during bin allocation and bin-to-bin transfer.

### Replenishment planning

- `GET /api/wms/replenishment?warehouseId=<id>`
- Returns recommended source bins and quantities when pick-face bins fall below `replenishmentMinUnits`.

### Bin rules update

- `PATCH /api/wms/bins/:binId/rules`
- Body can set/clear: `maxCapacityUnits`, `replenishmentMinUnits`, `replenishmentTargetUnits` (requires `warehouseId`).

## Dashboard Intelligence

Base route: `/api/dashboard`

- `GET /top-selling-items`
- `GET /turnover-skus`
- `GET /fastest-moving-skus` (alias of turnover)
- `GET /slow-moving-skus`
- `GET /dead-stock` (dead stock detection)
- `GET /stock-aging-buckets`
- `GET /supplier-ranking`
- `GET /supplier-reliability` (alias of supplier ranking)

## Frontend Integration Checklist (Tracking + Dashboard)

Use this section to wire common frontend screens to backend contracts.

### 1) Reserve Serials Action

UI action:

- Reserve serials for an order line

Endpoint:

- `POST /api/inventory-tracking/serials/reserve`

Payload (explicit serial list):

```json
{
  "productId": "65f0...prd",
  "warehouseId": "65f0...wh",
  "serialNumbers": ["SN-001", "SN-002"],
  "referenceType": "ORDER",
  "referenceId": "65f0...ord"
}
```

Payload (auto-select by quantity):

```json
{
  "productId": "65f0...prd",
  "warehouseId": "65f0...wh",
  "quantity": 2,
  "referenceType": "ORDER",
  "referenceId": "65f0...ord"
}
```

Frontend checks:

- require `productId` + `warehouseId`
- require one of: `serialNumbers[]` or `quantity`
- if serials entered: trim, unique, non-empty

### 2) Release Serials Action

UI action:

- Unreserve serials from a cancelled/edited line

Endpoint:

- `POST /api/inventory-tracking/serials/release`

Payload:

```json
{
  "serialNumbers": ["SN-001", "SN-002"],
  "referenceId": "65f0...ord"
}
```

Frontend checks:

- non-empty `serialNumbers[]`
- unique serial values

### 3) Verify Serial Scan (Mobile/Scanner)

UI action:

- Validate scanned serial before pick/pack/dispatch

Endpoint:

- `POST /api/inventory-tracking/serials/verify-scan`

Payload:

```json
{
  "serialNumber": "SN-001",
  "productId": "65f0...prd",
  "warehouseId": "65f0...wh",
  "expectedStatuses": ["RESERVED"],
  "expectedReferenceId": "65f0...ord"
}
```

Frontend checks:

- require non-empty `serialNumber`
- pass `expectedStatuses` when flow requires strict status checks

### 4) Recall Batch Action (Admin/Manager)

UI action:

- Place a lot on recall hold

Endpoint:

- `POST /api/inventory-tracking/recall`

Payload:

```json
{
  "productId": "65f0...prd",
  "lotNumber": "LOT-2026-03",
  "warehouseId": "65f0...wh",
  "reason": "Supplier recall notice"
}
```

Frontend checks:

- require `productId` + `lotNumber`
- show role-based access warning for non-admin/non-manager users

### 5) Batch List Screen

UI action:

- Load/refresh batch inventory table

Endpoint:

- `GET /api/inventory-tracking/batches`

Suggested query params:

- `productId?`
- `warehouseId?`
- `includeRecalled?`
- `limit?`

### 6) Serial List Screen

UI action:

- Load serial inventory table with filters

Endpoint:

- `GET /api/inventory-tracking/serials`

Suggested query params:

- `productId?`
- `warehouseId?`
- `lotNumber?`
- `status?`
- `limit?`

### 7) Serial History Drawer/Page

UI action:

- View timeline for one serial

Endpoint:

- `GET /api/inventory-tracking/serials/:serialNumber/history`

Suggested query params:

- `productId?` (recommended when serial format can overlap)

### 8) Dashboard Cards and Tables

UI actions:

- Load KPI widgets and rankings

Endpoints:

- `GET /api/dashboard/top-selling-items`
- `GET /api/dashboard/turnover-skus`
- `GET /api/dashboard/fastest-moving-skus`
- `GET /api/dashboard/slow-moving-skus`
- `GET /api/dashboard/dead-stock`
- `GET /api/dashboard/stock-aging-buckets`
- `GET /api/dashboard/supplier-ranking`
- `GET /api/dashboard/supplier-reliability`

Frontend checks:

- fetch using authenticated org-scoped session only
- display empty states when arrays are empty

### Error UX Checklist

- on `400`, render backend `message` inline near the triggering form
- on `401|403`, prompt re-auth or show role/access message
- on mutation forms, disable submit while request is in flight
