# Inventory Tracking and Dashboard API

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
